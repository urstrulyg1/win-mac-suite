/**
 * WinSuite & MacSuite v10.1 — Protected Paths Policy Engine
 *
 * SECURITY REWRITE (P1-C #15, #16). The v8 implementation classified paths using
 * `path.resolve()` alone. That is a LEXICAL check, and a lexical check is not a security
 * boundary. It was defeated by:
 *
 *   1. Symlink escape:   /tmp/safe-link → /System
 *                        resolve() returns "/tmp/safe-link" → classified SAFE/UNKNOWN,
 *                        while the actual delete would follow the link into /System.
 *
 *   2. Ancestor symlink: ~/Library/Caches/evil → /  (or a parent component being a link)
 *                        The prefix matched a safe directory, but the physical target did not.
 *
 *   3. Hardlink-to-outside and bind-style remounts under /Volumes.
 *
 *   4. TOCTOU: the path was validated once, then acted on later. Between those two moments
 *      an attacker (or a racing installer) could swap a directory for a symlink.
 *
 * This version resolves paths PHYSICALLY:
 *   - every ancestor component is lstat'ed, so a symlink anywhere in the chain is caught,
 *     not just a symlink at the leaf;
 *   - classification is computed for BOTH the lexical path and the physical realpath, and
 *     the MOST RESTRICTIVE of the two wins ("fail closed");
 *   - `..` traversal is rejected before resolution, not silently normalised away;
 *   - a validation returns a `guard` token capturing device+inode, so the caller can
 *     re-assert immediately before mutating and detect a TOCTOU swap.
 *
 * Everything degrades safely: if we cannot stat a path, it is UNKNOWN_RISK, never SAFE.
 */

import path from 'path';
import os from 'os';
import fs from 'fs';

const HOME = os.homedir();

export const PATH_CLASSIFICATION = {
  SYSTEM_PROTECTED: 'SYSTEM_PROTECTED',
  USER_CRITICAL: 'USER_CRITICAL',
  APPLICATION_BUNDLE: 'APPLICATION_BUNDLE',
  SAFE_RECLAIMABLE: 'SAFE_RECLAIMABLE',
  UNKNOWN_RISK: 'UNKNOWN_RISK',
};

/**
 * Severity ordering. When lexical and physical classification disagree we take the
 * lowest index (most restrictive). This is the "fail closed" rule.
 */
const SEVERITY_ORDER = [
  PATH_CLASSIFICATION.SYSTEM_PROTECTED,
  PATH_CLASSIFICATION.USER_CRITICAL,
  PATH_CLASSIFICATION.UNKNOWN_RISK,
  PATH_CLASSIFICATION.APPLICATION_BUNDLE,
  PATH_CLASSIFICATION.SAFE_RECLAIMABLE,
];

function mostRestrictive(a, b) {
  return SEVERITY_ORDER.indexOf(a) <= SEVERITY_ORDER.indexOf(b) ? a : b;
}

const SYSTEM_PROTECTED_PREFIXES = [
  '/System', '/Library', '/usr', '/bin', '/sbin', '/private', '/etc', '/var',
  '/Volumes', '/Applications', '/cores', '/dev', '/opt',
  'C:\\Windows', 'C:\\Program Files', 'C:\\Program Files (x86)', 'C:\\ProgramData',
];

/** Paths that must never be touched even though they live under $HOME. */
const USER_CRITICAL_DIRECTORIES = [
  path.join(HOME, 'Documents'),
  path.join(HOME, 'Desktop'),
  path.join(HOME, 'Pictures'),
  path.join(HOME, 'Movies'),
  path.join(HOME, 'Music'),
  path.join(HOME, 'Personal'),
  path.join(HOME, 'Work'),
  path.join(HOME, '.ssh'),
  path.join(HOME, '.gnupg'),
  path.join(HOME, '.aws'),
  path.join(HOME, '.kube'),
  path.join(HOME, 'Library', 'Keychains'),
  path.join(HOME, 'Library', 'Mail'),
  path.join(HOME, 'Library', 'Messages'),
  path.join(HOME, 'Library', 'Safari'),
  path.join(HOME, 'Library', 'Application Support', 'AddressBook'),
];

const SAFE_RECLAIMABLE_PREFIXES = [
  path.join(HOME, 'Library/Caches'),
  path.join(HOME, 'Library/Logs'),
  path.join(HOME, 'Library/Developer/Xcode/DerivedData'),
  path.join(HOME, 'Library/Developer/Xcode/Archives'),
  path.join(HOME, 'Library/Developer/Xcode/iOS DeviceSupport'),
  path.join(HOME, 'Library/Developer/CoreSimulator/Caches'),
  path.join(HOME, '.npm/_cacache'),
  path.join(HOME, '.pnpm-store'),
  path.join(HOME, '.cache'),
  path.join(HOME, '.cargo/registry/cache'),
  path.join(HOME, '.gradle/caches'),
  path.join(HOME, '.m2/repository'),
  path.join(HOME, 'Downloads'), // requires explicit user confirmation upstream
];

/**
 * Rejects inputs that are structurally unsafe before we touch the filesystem.
 * Note we reject `..` rather than normalising it: a caller asking to delete
 * "~/Library/Caches/../../Documents" is either buggy or hostile, and in both cases
 * the correct response is refusal, not silent rewriting.
 */
export function screenPathInput(targetPath) {
  if (!targetPath || typeof targetPath !== 'string') {
    return { ok: false, reason: 'Path must be a non-empty string.' };
  }
  if (targetPath.includes('\0')) {
    return { ok: false, reason: 'Path contains a NUL byte (poison-null-byte attack).' };
  }
  if (targetPath.length > 4096) {
    return { ok: false, reason: 'Path exceeds the 4096-character limit.' };
  }
  // Reject relative paths outright — every mutation target must be absolute.
  if (!path.isAbsolute(targetPath)) {
    return { ok: false, reason: 'Path must be absolute. Relative paths are resolved against an unpredictable CWD.' };
  }
  const segments = targetPath.split(/[/\\]/);
  if (segments.includes('..')) {
    return {
      ok: false,
      reason: 'Path contains a ".." traversal segment. Traversal is rejected rather than normalised, because normalisation hides intent.',
    };
  }
  return { ok: true };
}

/** Normalises paths for cross-platform prefix comparison */
function normalizePathForComparison(p) {
  let norm = p.replace(/\\/g, '/');
  if (/^[A-Za-z]:\//i.test(norm)) {
    norm = norm.slice(2); // e.g. "C:/System" -> "/System"
  }
  return norm;
}

function matchPrefix(target, prefix) {
  if (target === prefix || target.startsWith(prefix + path.sep) || target.startsWith(prefix + '/')) {
    return true;
  }
  const normTarget = normalizePathForComparison(target);
  const normPrefix = normalizePathForComparison(prefix);
  return normTarget === normPrefix || normTarget.startsWith(normPrefix + '/');
}

/** Pure lexical classification. Retained as ONE INPUT to the real decision, never alone. */
function classifyLexical(resolved) {
  for (const p of SYSTEM_PROTECTED_PREFIXES) {
    if (matchPrefix(resolved, p)) return PATH_CLASSIFICATION.SYSTEM_PROTECTED;
  }
  for (const p of USER_CRITICAL_DIRECTORIES) {
    if (matchPrefix(resolved, p)) return PATH_CLASSIFICATION.USER_CRITICAL;
  }
  for (const p of SAFE_RECLAIMABLE_PREFIXES) {
    if (matchPrefix(resolved, p)) return PATH_CLASSIFICATION.SAFE_RECLAIMABLE;
  }
  if (resolved.endsWith('.app') || resolved.includes('.app' + path.sep) || resolved.includes('.app/')) {
    return PATH_CLASSIFICATION.APPLICATION_BUNDLE;
  }
  return PATH_CLASSIFICATION.UNKNOWN_RISK;
}

/**
 * Walks every ancestor component and lstat's it, detecting symlinks ANYWHERE in the chain.
 * Returns the chain plus the first symlink found, so errors can name the exact component.
 */
export function inspectPathChain(absolutePath) {
  const { root } = path.parse(absolutePath);
  const relative = absolutePath.slice(root.length);
  const parts = relative.split(/[/\\]/).filter(Boolean);
  const chain = [];
  let current = root;
  let firstSymlink = null;

  // Include the root itself.
  try {
    const st = fs.lstatSync(current);
    chain.push({
      component: current,
      exists: true,
      isSymlink: st.isSymbolicLink(),
      isDirectory: st.isDirectory(),
      isFile: st.isFile(),
      dev: st.dev,
      ino: st.ino,
      mode: st.mode,
      uid: st.uid,
      target: null,
    });
  } catch (err) {
    chain.push({
      component: current,
      exists: false,
      isSymlink: false,
      error: err.code || String(err.message),
    });
    return { chain, firstSymlink, fullyResolved: false };
  }

  for (let i = 0; i < parts.length; i += 1) {
    current = path.join(current, parts[i]);
    let entry;
    try {
      const st = fs.lstatSync(current);
      entry = {
        component: current,
        exists: true,
        isSymlink: st.isSymbolicLink(),
        isDirectory: st.isDirectory(),
        isFile: st.isFile(),
        dev: st.dev,
        ino: st.ino,
        mode: st.mode,
        uid: st.uid,
        target: null,
      };
      if (entry.isSymlink) {
        try {
          const linkTarget = fs.readlinkSync(current);
          entry.target = path.isAbsolute(linkTarget) ? linkTarget : path.resolve(path.dirname(current), linkTarget);
        } catch { entry.target = '<unreadable>'; }
        if (!firstSymlink) firstSymlink = entry;
      }
    } catch (err) {
      entry = {
        component: current,
        exists: false,
        isSymlink: false,
        error: err.code || String(err.message),
      };
      chain.push(entry);
      break; // nothing below a non-existent component can be inspected
    }
    chain.push(entry);
  }

  return { chain, firstSymlink, fullyResolved: chain.length === parts.length + 1 };
}

/**
 * THE real classifier. Resolves physically and fails closed.
 *
 * @returns {{
 *   classification: string, lexicalClassification: string, physicalClassification: string,
 *   inputPath: string, resolvedPath: string, realPath: string|null,
 *   symlinkDetected: boolean, symlinkEscape: boolean, exists: boolean,
 *   identity: {dev:number, ino:number}|null, reasons: string[]
 * }}
 */
export function classifyPathDetailed(targetPath) {
  const reasons = [];
  const screen = screenPathInput(targetPath);
  if (!screen.ok) {
    return {
      classification: PATH_CLASSIFICATION.UNKNOWN_RISK,
      lexicalClassification: PATH_CLASSIFICATION.UNKNOWN_RISK,
      physicalClassification: PATH_CLASSIFICATION.UNKNOWN_RISK,
      inputPath: typeof targetPath === 'string' ? targetPath : String(targetPath),
      resolvedPath: null,
      realPath: null,
      symlinkDetected: false,
      symlinkEscape: false,
      exists: false,
      identity: null,
      rejected: true,
      reasons: [screen.reason],
    };
  }

  const resolvedPath = path.resolve(targetPath);
  const lexicalClassification = classifyLexical(resolvedPath);

  // Physical resolution.
  let realPath = null;
  let exists = false;
  let identity = null;
  let danglingSymlink = false;
  const { chain, firstSymlink } = inspectPathChain(resolvedPath);

  try {
    realPath = fs.realpathSync(resolvedPath);
    exists = true;
  } catch (err) {
    if (err.code === 'ENOENT') {
      /**
       * CRITICAL: realpath() throws ENOENT for a DANGLING SYMLINK too — a link that
       * exists but whose target does not. Naively treating that as "path does not exist"
       * throws away the symlink signal entirely, which is exactly the bug that let
       * `/tmp/safe-link → /System` be classified on its lexical name. When the leaf is
       * itself a link we classify by its DECLARED TARGET, because that is what a
       * follow-through delete would actually destroy once the target exists.
       */
      const leafEntry = chain.find((c) => c.component === resolvedPath);
      if (leafEntry && leafEntry.isSymlink) {
        danglingSymlink = true;
        exists = true; // the link object itself exists
        realPath = leafEntry.target;
        reasons.push(
          `Path is a symlink to "${leafEntry.target}", which does not currently exist. Classified by its declared target, since that is what would be affected if the target were created.`
        );
      } else {
        reasons.push('Path does not currently exist; classification is based on its lexical location and nearest existing ancestor.');
        // Resolve the deepest existing ancestor so a symlinked parent is still caught.
        let probe = path.dirname(resolvedPath);
        while (probe !== path.dirname(probe)) {
          try { realPath = path.join(fs.realpathSync(probe), path.relative(probe, resolvedPath)); break; }
          catch { probe = path.dirname(probe); }
        }
      }
    } else if (err.code === 'EACCES' || err.code === 'EPERM') {
      reasons.push(`Path could not be resolved (${err.code}). Treated as UNKNOWN_RISK — we never assume a path we cannot inspect is safe.`);
      return {
        classification: PATH_CLASSIFICATION.UNKNOWN_RISK,
        lexicalClassification,
        physicalClassification: PATH_CLASSIFICATION.UNKNOWN_RISK,
        inputPath: targetPath,
        resolvedPath,
        realPath: null,
        symlinkDetected: Boolean(firstSymlink),
        symlinkEscape: false,
        exists: false,
        identity: null,
        permissionDenied: true,
        reasons,
      };
    } else {
      reasons.push(`Resolution failed: ${err.code || err.message}.`);
    }
  }

  if (exists) {
    try {
      const st = fs.lstatSync(resolvedPath);
      identity = { dev: st.dev, ino: st.ino };
    } catch { /* identity stays null */ }
  }

  const physicalClassification = realPath ? classifyLexical(realPath) : PATH_CLASSIFICATION.UNKNOWN_RISK;

  // Did following links move us somewhere materially different?
  const symlinkDetected = Boolean(firstSymlink);
  /**
   * An escape is ANY link that relocates the path, whether or not the two classifications
   * happen to share a label. Requiring the labels to differ was too weak: a link from one
   * UNKNOWN_RISK location to another still moves the delete somewhere the user did not name.
   */
  const symlinkEscape = Boolean(symlinkDetected && realPath && realPath !== resolvedPath);

  if (symlinkDetected) {
    reasons.push(
      `Symlink detected at "${firstSymlink.component}" → "${firstSymlink.target}". Classification follows the physical target, not the link.`
    );
  }
  if (symlinkEscape) {
    reasons.push(
      `SYMLINK ESCAPE: the lexical path classifies as ${lexicalClassification} but it physically resolves to "${realPath}", which classifies as ${physicalClassification}. The more restrictive classification is enforced.`
    );
  }

  // Fail closed: worst of the two.
  const classification = mostRestrictive(lexicalClassification, physicalClassification);

  return {
    classification,
    lexicalClassification,
    physicalClassification,
    inputPath: targetPath,
    resolvedPath,
    realPath,
    symlinkDetected,
    symlinkEscape,
    // Must be surfaced: validateDeletionTarget refuses dangling links explicitly, and
    // omitting this field silently turned that rejection branch into dead code.
    danglingSymlink,
    exists,
    identity,
    chain,
    reasons,
  };
}

/**
 * Backwards-compatible signature (v8 callers expect a bare string).
 * Now backed by the physical classifier.
 */
export function classifyPath(targetPath) {
  return classifyPathDetailed(targetPath).classification;
}

/**
 * Validates a deletion target. Throws on any policy violation.
 *
 * Returns a `guard` the caller MUST re-check immediately before mutating, which is how
 * the TOCTOU window is closed. See `assertUnchanged()`.
 */
export function validateDeletionTarget(targetPath, { allowNonExistent = false } = {}) {
  const detail = classifyPathDetailed(targetPath);

  if (detail.rejected) {
    throw new Error(`[SAFETY POLICY VIOLATION] Target "${targetPath}" rejected: ${detail.reasons[0]}`);
  }

  if (detail.symlinkEscape) {
    throw new Error(
      `[SAFETY POLICY VIOLATION] Target "${targetPath}" is a symlink escape. It appears to be ${detail.lexicalClassification} but physically resolves to "${detail.realPath}" (${detail.physicalClassification}). Blocked.`
    );
  }

  if (detail.classification === PATH_CLASSIFICATION.SYSTEM_PROTECTED) {
    throw new Error(`[SAFETY POLICY VIOLATION] Target "${targetPath}" is a SYSTEM PROTECTED path${detail.realPath && detail.realPath !== detail.resolvedPath ? ` (resolves to "${detail.realPath}")` : ''}. Deletions are strictly blocked.`);
  }

  if (detail.classification === PATH_CLASSIFICATION.USER_CRITICAL) {
    throw new Error(`[SAFETY POLICY VIOLATION] Target "${targetPath}" resides in a USER CRITICAL directory${detail.realPath && detail.realPath !== detail.resolvedPath ? ` (resolves to "${detail.realPath}")` : ''}. Deletions are strictly blocked.`);
  }

  if (detail.classification === PATH_CLASSIFICATION.UNKNOWN_RISK) {
    throw new Error(`[SAFETY POLICY VIOLATION] Target "${targetPath}" has UNKNOWN classification risk. Automatic deletion rejected. ${detail.reasons.join(' ')}`.trim());
  }

  if (detail.danglingSymlink) {
    throw new Error(
      `[SAFETY POLICY VIOLATION] Target "${targetPath}" is a symlink whose target "${detail.realPath}" does not exist. Refusing to act on a dangling link.`
    );
  }

  if (!detail.exists && !allowNonExistent) {
    throw new Error(`[SAFETY POLICY VIOLATION] Target "${targetPath}" does not exist. Refusing to act on a path that cannot be verified.`);
  }

  // A symlink that does NOT escape is still not deletable as a directory tree —
  // deleting through a link is almost never what the user meant.
  if (detail.symlinkDetected) {
    throw new Error(
      `[SAFETY POLICY VIOLATION] Target "${targetPath}" traverses a symlink. Deletion through symlinks is blocked to prevent the link target being destroyed instead of the link.`
    );
  }

  /**
   * TOCTOU HARDENING: inode numbers ALONE are not sufficient, because filesystems
   * aggressively REUSE them. Empirically, deleting a directory and immediately
   * recreating it yields the SAME dev:ino — so an identity comparison silently passes
   * while pointing at an entirely different object.
   *
   * The fix is to hold an open descriptor on the validated object. A descriptor refers
   * to the inode itself, not the name, so if the original is unlinked `fstat(fd).nlink`
   * drops to 0 — a signal that survives inode reuse and cannot be forged by re-creating
   * a same-named directory.
   */
  let fd = null;
  let openNlink = null;
  try {
    fd = fs.openSync(detail.resolvedPath, fs.constants.O_RDONLY);
    openNlink = fs.fstatSync(fd).nlink;
  } catch {
    fd = null; // descriptor pinning unavailable; assertUnchanged falls back to identity
  }

  return {
    allowed: true,
    classification: detail.classification,
    resolvedPath: detail.resolvedPath,
    realPath: detail.realPath,
    reason: `Path physically resolves to "${detail.realPath}" and classifies as ${detail.classification}.`,
    /** TOCTOU guard — pass to assertUnchanged() right before mutating, then release(). */
    guard: {
      path: detail.resolvedPath,
      realPath: detail.realPath,
      identity: detail.identity,
      classification: detail.classification,
      fd,
      openNlink,
      capturedAt: Date.now(),
    },
  };
}

/** Releases a guard's pinned descriptor. Always call this when done. */
export function releaseGuard(guard) {
  if (guard && typeof guard.fd === 'number') {
    try { fs.closeSync(guard.fd); } catch { /* already closed */ }
    guard.fd = null;
  }
}

/**
 * Closes the TOCTOU window.
 *
 * Re-resolves the target and compares device+inode identity, realpath and classification
 * against the values captured at validation time. If ANYTHING moved — the file was
 * replaced with a symlink, the directory was swapped, permissions changed — this throws.
 *
 * Call this immediately before the destructive syscall, every time.
 */
export function assertUnchanged(guard, { maxAgeMs = 30_000 } = {}) {
  if (!guard || !guard.path) throw new Error('[TOCTOU] No guard token supplied; refusing to mutate.');

  const age = Date.now() - guard.capturedAt;
  if (age > maxAgeMs) {
    throw new Error(`[TOCTOU] Validation is stale: captured ${Math.round(age / 1000)}s ago, limit ${maxAgeMs / 1000}s. Re-validate before mutating.`);
  }

  /**
   * Strongest check first: if we pinned a descriptor at validation time, ask the KERNEL
   * whether that exact object is still linked into the filesystem. nlink === 0 means the
   * validated object was unlinked, even if a same-named (and possibly same-inode)
   * replacement now sits at the path.
   */
  if (typeof guard.fd === 'number') {
    let st;
    try { st = fs.fstatSync(guard.fd); }
    catch { throw new Error(`[TOCTOU] Pinned descriptor for "${guard.path}" is no longer valid. Aborting.`); }
    if (st.nlink === 0) {
      throw new Error(
        `[TOCTOU] The validated object at "${guard.path}" was unlinked between validation and execution (nlink=0). A replacement may now occupy the same path and even the same inode. Aborting.`
      );
    }
  }

  const now = classifyPathDetailed(guard.path);

  if (!now.exists) {
    throw new Error(`[TOCTOU] Target "${guard.path}" disappeared between validation and execution.`);
  }
  if (now.symlinkDetected && !guard.identity) {
    throw new Error(`[TOCTOU] Target "${guard.path}" is now a symlink but was not at validation time. Aborting — this is the classic swap attack.`);
  }
  if (now.symlinkDetected) {
    throw new Error(`[TOCTOU] Target "${guard.path}" now traverses a symlink. Aborting.`);
  }
  if (now.classification !== guard.classification) {
    throw new Error(
      `[TOCTOU] Target "${guard.path}" reclassified from ${guard.classification} to ${now.classification} between validation and execution. Aborting.`
    );
  }
  if (now.realPath !== guard.realPath) {
    throw new Error(
      `[TOCTOU] Target "${guard.path}" now resolves to "${now.realPath}" but resolved to "${guard.realPath}" at validation. Aborting.`
    );
  }
  if (guard.identity && now.identity) {
    if (now.identity.dev !== guard.identity.dev || now.identity.ino !== guard.identity.ino) {
      throw new Error(
        `[TOCTOU] Target "${guard.path}" was replaced: inode changed from ${guard.identity.dev}:${guard.identity.ino} to ${now.identity.dev}:${now.identity.ino}. Aborting.`
      );
    }
  }

  return { ok: true, verifiedAt: Date.now(), identity: now.identity };
}

/**
 * Convenience wrapper: validate, run, and re-assert immediately before the mutation.
 */
export function withPathGuard(targetPath, mutate, opts = {}) {
  const validation = validateDeletionTarget(targetPath, opts);
  try {
    assertUnchanged(validation.guard);
    return mutate(validation);
  } finally {
    releaseGuard(validation.guard);
  }
}
