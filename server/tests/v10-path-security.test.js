/**
 * WinSuite & MacSuite v10.1 — Path & TOCTOU security suite (P1-C #15, #16)
 *
 * Run with:  node server/tests/v10-path-security.test.js
 *
 * These assertions were originally developed as a throwaway adversarial script while
 * rewriting protected-paths.js. They are persisted here because they encode the exact
 * attacks the rewrite exists to stop; without them a future refactor could silently
 * reintroduce a lexical-only check and every test would still pass.
 *
 * What is covered:
 *   #15 traversal   — literal "../" segments are rejected, never normalised away
 *   #15 symlink     — a link whose target escapes into a protected tree is blocked
 *                     by PHYSICAL classification, even from inside a "safe" directory
 *   #16 TOCTOU      — the target being swapped or deleted between validation and
 *                     execution is detected at execution time
 *
 * Environment notes that shaped these tests (do not "simplify" them away):
 *   - path.join() normalises "../" away, so traversal inputs must be LITERAL strings.
 *   - This filesystem REUSES inodes across delete+recreate and preserves ctime/birthtime,
 *     so dev:ino identity alone cannot detect deletion. The guard pins an open fd and
 *     checks fstat(fd).nlink === 0, which is why guards must be released.
 *   - /System does not exist on Linux CI, so links to it are dangling. A dangling
 *     symlink must still be classified by its TARGET, not dismissed as "nonexistent".
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';

import {
  PATH_CLASSIFICATION,
  screenPathInput,
  classifyPathDetailed,
  validateDeletionTarget,
  assertUnchanged,
  releaseGuard,
} from '../security/protected-paths.js';

let passed = 0;
let failed = 0;

async function testAsync(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`✓ Test ${passed + failed} Passed: ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`✗ Test ${passed + failed} FAILED: ${name}\n    ${e.message}`);
  }
}

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`✓ Test ${passed + failed} Passed: ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`✗ Test ${passed + failed} FAILED: ${name}\n    ${e.message}`);
  }
}

/** Every test writes inside this sandbox and it is removed at the end. */
const SANDBOX = fs.mkdtempSync(path.join(os.tmpdir(), 'pathsec-'));
const HOME = os.homedir();

/** A directory that is genuinely safe to reclaim, used as the positive control. */
const SAFE_CACHE = path.join(HOME, 'Library', 'Caches', 'com.winsuite.pathsec-test');

function cleanup() {
  try { fs.rmSync(SANDBOX, { recursive: true, force: true }); } catch { /* best effort */ }
  try { fs.rmSync(SAFE_CACHE, { recursive: true, force: true }); } catch { /* best effort */ }
}

export async function runPathSecurityTests() {
  console.log('\n═══ v10.1 Path & TOCTOU security (P1-C #15, #16) ═══\n');

  /* ───────────────── Input screening ───────────────── */

  test('#15 a literal "../" traversal is REJECTED, not silently normalised', () => {
    // Literal string on purpose: path.join would erase the attack before we saw it.
    const r = screenPathInput('/Users/foo/Documents/../Library');
    assert.strictEqual(r.ok, false, 'traversal must not be accepted');
    assert.match(r.reason, /\.\.|traversal|relative/i);
  });

  test('#15 traversal is rejected even when it resolves somewhere harmless', () => {
    const r = screenPathInput(`${HOME}/Library/Caches/../Caches`);
    assert.strictEqual(r.ok, false, 'the rule is structural: no ".." segment is ever accepted');
  });

  test('#14 relative paths, NUL bytes, over-long and non-string inputs are all rejected', () => {
    assert.strictEqual(screenPathInput('Library/Caches').ok, false, 'relative path');
    assert.strictEqual(screenPathInput('/tmp/a\u0000/etc/passwd').ok, false, 'NUL byte');
    assert.strictEqual(screenPathInput(`/tmp/${'a'.repeat(5000)}`).ok, false, 'over-length');
    assert.strictEqual(screenPathInput(null).ok, false, 'null');
    assert.strictEqual(screenPathInput(12345).ok, false, 'number');
  });

  /* ───────────────── Symlink escapes ───────────────── */

  test('#15 a symlink pointing at a protected tree is classified by its TARGET', () => {
    const link = path.join(SANDBOX, 'safe-link');
    fs.symlinkSync('/System', link);
    const d = classifyPathDetailed(link);
    assert.strictEqual(d.symlinkDetected, true, 'the symlink must be noticed');
    assert.strictEqual(
      d.classification, PATH_CLASSIFICATION.SYSTEM_PROTECTED,
      'the link target decides the classification, not the link location',
    );
  });

  test('#15 a dangling symlink to a protected tree is still blocked (ENOENT is not "safe")', () => {
    // /System is absent on Linux, so this link cannot be stat'd. Treating that as
    // "path does not exist, therefore harmless" was a real bug found by this test.
    const link = path.join(SANDBOX, 'dangling-link');
    fs.symlinkSync('/System/Library/CoreServices/NonExistentProtectedDirectory', link);
    const d = classifyPathDetailed(link);
    assert.strictEqual(d.danglingSymlink, true, 'must be reported as dangling, not as absent');
    assert.strictEqual(d.classification, PATH_CLASSIFICATION.SYSTEM_PROTECTED);
    assert.throws(() => validateDeletionTarget(link), /symlink|protected/i);
  });

  test('#15 a symlink INSIDE a safe cache directory cannot escape into a protected tree', () => {
    // The attack: the parent directory is legitimately reclaimable, so a lexical
    // check on the parent would approve deleting straight through the link.
    fs.mkdirSync(SAFE_CACHE, { recursive: true });
    const escape = path.join(SAFE_CACHE, 'escape');
    try { fs.unlinkSync(escape); } catch { /* not present */ }
    fs.symlinkSync('/System', escape);
    const d = classifyPathDetailed(escape);
    assert.strictEqual(d.symlinkEscape, true, 'a relocating link must be flagged as an escape');
    assert.strictEqual(
      d.classification, PATH_CLASSIFICATION.SYSTEM_PROTECTED,
      'most-restrictive-wins: physical classification must override the safe lexical parent',
    );
    assert.throws(() => validateDeletionTarget(escape));
    fs.unlinkSync(escape);
  });

  test('#15 most-restrictive-wins: lexically safe + physically protected ⇒ blocked', () => {
    const link = path.join(SANDBOX, 'cache-shaped-link');
    fs.symlinkSync('/System', link);
    const d = classifyPathDetailed(link);
    assert.notStrictEqual(
      d.physicalClassification, PATH_CLASSIFICATION.SAFE_RECLAIMABLE,
      'the physical view must not be reported as reclaimable',
    );
    assert.strictEqual(d.classification, d.physicalClassification,
      'the final classification must fail closed to the more restrictive of the two');
  });

  /* ───────────────── Protected trees ───────────────── */

  test('#15 core system and user-critical trees are refused outright', () => {
    for (const p of ['/System', '/usr/bin', '/Applications', '/dev', path.join(HOME, 'Documents')]) {
      assert.throws(() => validateDeletionTarget(p), new RegExp('.'), `${p} must be protected`);
    }
  });

  test('#15 credential directories added in v10.1 are user-critical', () => {
    for (const rel of ['.ssh', '.gnupg', '.aws', '.kube']) {
      const p = path.join(HOME, rel);
      const d = classifyPathDetailed(p);
      assert.strictEqual(
        d.lexicalClassification, PATH_CLASSIFICATION.USER_CRITICAL,
        `~/${rel} must be user-critical even when it does not exist on this machine`,
      );
    }
  });

  test('#15 a target that does not exist is refused (nothing to verify ⇒ nothing to delete)', () => {
    const missing = path.join(HOME, 'Library', 'Caches', 'com.winsuite.definitely-not-here');
    assert.throws(() => validateDeletionTarget(missing), /does not exist/i);
  });

  /* ───────────────── Positive control ───────────────── */

  test('control: a real, existing cache directory IS allowed (the checker is not just "deny all")', () => {
    fs.mkdirSync(SAFE_CACHE, { recursive: true });
    const result = validateDeletionTarget(SAFE_CACHE);
    try {
      assert.strictEqual(result.allowed, true);
      assert.strictEqual(result.classification, PATH_CLASSIFICATION.SAFE_RECLAIMABLE);
      assert.ok(result.guard && typeof result.guard.fd === 'number', 'a guard with an open fd must be issued');
    } finally {
      releaseGuard(result.guard);
    }
  });

  /* ───────────────── TOCTOU ───────────────── */

  test('#16 TOCTOU: deleting and recreating the target between validate and execute is detected', () => {
    // Regression guard: this filesystem REUSES inodes, so an identity-only check
    // passes here. Detection relies on fstat(fd).nlink === 0 on the pinned fd.
    fs.mkdirSync(SAFE_CACHE, { recursive: true });
    const result = validateDeletionTarget(SAFE_CACHE);
    try {
      fs.rmSync(SAFE_CACHE, { recursive: true, force: true });
      fs.mkdirSync(SAFE_CACHE, { recursive: true });
      assert.throws(() => assertUnchanged(result.guard), /TOCTOU|unlinked|nlink/i);
    } finally {
      releaseGuard(result.guard);
    }
  });

  test('#16 TOCTOU: swapping the validated directory for a symlink is detected', () => {
    // The target must live somewhere the checker actually approves, otherwise the
    // test passes for the wrong reason (an UNKNOWN_RISK rejection at validate time
    // rather than tamper detection at execute time). /tmp is UNKNOWN_RISK by design.
    const target = path.join(SAFE_CACHE, 'swap-me');
    fs.rmSync(target, { recursive: true, force: true });
    fs.mkdirSync(target, { recursive: true });
    const result = validateDeletionTarget(target, { allowNonExistent: false });
    try {
      fs.rmSync(target, { recursive: true, force: true });
      fs.symlinkSync('/System', target);
      assert.throws(() => assertUnchanged(result.guard), /TOCTOU|unlinked|changed|nlink/i);
    } finally {
      releaseGuard(result.guard);
      try { fs.unlinkSync(target); } catch { /* already gone */ }
    }
  });

  test('#16 an untouched target passes re-verification (no false TOCTOU alarms)', () => {
    fs.mkdirSync(SAFE_CACHE, { recursive: true });
    const result = validateDeletionTarget(SAFE_CACHE);
    try {
      assert.doesNotThrow(() => assertUnchanged(result.guard),
        'a stable target must not be reported as tampered with');
    } finally {
      releaseGuard(result.guard);
    }
  });

  test('#16 a stale guard expires rather than authorising a much later deletion', () => {
    fs.mkdirSync(SAFE_CACHE, { recursive: true });
    const result = validateDeletionTarget(SAFE_CACHE);
    try {
      assert.throws(() => assertUnchanged(result.guard, { maxAgeMs: -1 }), /stale|age|expired/i);
    } finally {
      releaseGuard(result.guard);
    }
  });

  /* ───────── allowlist ↔ protected-path integration (P1-C #13, #17) ───────── */

  // Regression guard: `validateDeletionTarget` was imported into action-allowlist.js
  // and never called, so any action declaring a filesystem target was authorized with
  // no protected-path, traversal or symlink check at all.

  await testAsync('#13 an allowlisted action that touches the filesystem is actually validated', async () => {
    const { ALLOWLISTED_ACTIONS } = await import('../security/action-allowlist.js');
    for (const [id, def] of Object.entries(ALLOWLISTED_ACTIONS)) {
      if (def.touchesFilesystem) {
        assert.strictEqual(typeof def.resolveTargets, 'function',
          `"${id}" touches the filesystem but declares no targets to validate`);
      }
    }
  });

  await testAsync('#13 traversal and injection in an app name are refused, not sanitised', async () => {
    const { authorizeAllowlistedAction } = await import('../security/action-allowlist.js');
    const hostile = [
      '../../../System/Library.app',
      'Foo.app/../../etc',
      'Safari.app;rm -rf /',
      'Safari.app|cat /etc/passwd',
      'Safari.app$(whoami)',
      '.hidden.app',
      'Safari',            // not a bundle name
    ];
    for (const appName of hostile) {
      await assert.rejects(
        () => authorizeAllowlistedAction('app.removeQuarantine', { appName }),
        /SECURITY ALLOWLIST/,
        `hostile app name was accepted: ${appName}`,
      );
    }
  });

  await testAsync('#13 a target that does not exist cannot be authorized', async () => {
    const { authorizeAllowlistedAction } = await import('../security/action-allowlist.js');
    await assert.rejects(
      () => authorizeAllowlistedAction('app.removeQuarantine', { appName: 'DefinitelyNotInstalled.app' }),
      /none of which passed validation/,
    );
  });

  await testAsync('#13 an action outside the allowlist is refused outright', async () => {
    const { authorizeAllowlistedAction } = await import('../security/action-allowlist.js');
    await assert.rejects(
      () => authorizeAllowlistedAction('storage.rmMinusRf', { path: '/' }),
      /ALLOWLIST VIOLATION/,
    );
  });

  await testAsync('#13 a non-filesystem action authorizes without pinning any guard', async () => {
    const { authorizeAllowlistedAction, releaseAuthorization } = await import('../security/action-allowlist.js');
    const auth = await authorizeAllowlistedAction('network.flushDNS');
    assert.strictEqual(auth.authorized, true);
    assert.strictEqual(auth.guards.length, 0, 'a network action must not pin filesystem guards');
    releaseAuthorization(auth);
  });

  cleanup();
  console.log(`\n═══ path-security results: ${passed} passed, ${failed} failed ═══\n`);
  if (failed > 0) process.exitCode = 1;
  return { passed, failed };
}

await runPathSecurityTests();
