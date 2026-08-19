/**
 * WinSuite & MacSuite v10.1 — Hardened Action Allowlist & Privilege Boundary
 *
 * Eliminates generic shell execution: only strictly validated, argument-array based
 * allowlisted actions can be authorized.
 *
 * v10.1 changes (P1-C):
 *   - `validateDeletionTarget` was imported but never called, so an action declaring a
 *     filesystem target was authorized without any protected-path, traversal or symlink
 *     check. Actions now declare `resolveTargets`, and every resolved target is put
 *     through the physical (realpath + lstat) validator before authorization.
 *   - The unused `execFile`/`promisify` import is gone. This module authorizes; it does
 *     not execute. The old name implied otherwise and the dead import made it look as if
 *     it might, which is exactly the ambiguity a privilege boundary must not have.
 *   - `app.removeQuarantine` previously accepted any string without shell metacharacters,
 *     so `../../../System/Library` passed validation. It is now resolved to a real path
 *     under an Applications directory and validated.
 */

import os from 'os';
import path from 'path';
import { validateDeletionTarget, releaseGuard } from './protected-paths.js';

const APPLICATION_DIRS = ['/Applications', path.join(os.homedir(), 'Applications')];

export const ALLOWLISTED_ACTIONS = {
  'network.flushDNS': {
    description: 'Flushes local macOS / Windows mDNSResponder cache',
    commandBin: '/usr/bin/dscacheutil',
    defaultArgs: ['-flushcache'],
    requiresPrivilege: false,
    reversible: true,
    touchesFilesystem: false,
  },
  'storage.cleanXcode': {
    description: 'Purges Xcode DerivedData and build artifacts',
    requiresPrivilege: false,
    reversible: false,
    touchesFilesystem: true,
    // Deletion targets are validated against the protected-path model before authorization.
    resolveTargets: () => [path.join(os.homedir(), 'Library', 'Developer', 'Xcode', 'DerivedData')],
  },
  'storage.cleanDocker': {
    description: 'Prunes dangling Docker images and build cache',
    commandBin: '/usr/local/bin/docker',
    defaultArgs: ['builder', 'prune', '-f'],
    requiresPrivilege: false,
    reversible: false,
    // Docker manages its own storage internally; we never hand it a path.
    touchesFilesystem: false,
  },
  'storage.purgeRam': {
    description: 'Reclaims inactive memory cache buffers',
    commandBin: '/usr/sbin/purge',
    defaultArgs: [],
    requiresPrivilege: false,
    reversible: true,
    touchesFilesystem: false,
  },
  'process.killPort': {
    description: 'Terminates process binding a local TCP port',
    requiresPrivilege: false,
    touchesFilesystem: false,
    validateParams: (params) => {
      if (!params || !/^\d+$/.test(String(params.port).trim())) {
        throw new Error(`[SECURITY ALLOWLIST] Invalid port parameter: ${params?.port}`);
      }
      const port = parseInt(params.port, 10);
      if (isNaN(port) || port < 1 || port > 65535) {
        throw new Error(`[SECURITY ALLOWLIST] Invalid port parameter: ${params.port}`);
      }
      return { port };
    },
  },
  'app.removeQuarantine': {
    description: 'Removes com.apple.quarantine attribute from application bundle',
    requiresPrivilege: false,
    touchesFilesystem: true,
    validateParams: (params) => {
      const name = params?.appName;
      if (!name || typeof name !== 'string') {
        throw new Error(`[SECURITY ALLOWLIST] Invalid app name: ${name}`);
      }
      // A bundle name is a single path segment. Anything containing a separator, a
      // traversal token, a NUL or a shell metacharacter is rejected outright rather
      // than sanitised — sanitising is where traversal bugs come from.
      if (/[/\\;&|><$`\n\r\0]/.test(name) || name.includes('..') || name.startsWith('.')) {
        throw new Error(`[SECURITY ALLOWLIST] App name must be a single bundle name, got: ${name}`);
      }
      if (!name.endsWith('.app')) {
        throw new Error(`[SECURITY ALLOWLIST] Expected an .app bundle name, got: ${name}`);
      }
      return { appName: name };
    },
    resolveTargets: (validated) => APPLICATION_DIRS.map((dir) => path.join(dir, validated.appName)),
    // Only one of the candidate locations needs to exist and validate.
    targetsAreCandidates: true,
  },
};

/**
 * Validates an allowlisted action and, when it touches the filesystem, validates every
 * declared target through the physical protected-path guard.
 *
 * Returns an authorization record. It does NOT execute anything — callers run the
 * command themselves through exec-guard. Guards returned in `guards` pin the validated
 * inodes; the caller must call `releaseAuthorization()` when finished so the pinned file
 * descriptors are closed.
 *
 * @throws when the action is not allowlisted, params fail validation, or any declared
 *         target is protected, escapes via symlink, contains traversal, or is missing.
 */
export async function authorizeAllowlistedAction(actionId, params = {}) {
  const definition = ALLOWLISTED_ACTIONS[actionId];
  if (!definition) {
    throw new Error(`[SECURITY ALLOWLIST VIOLATION] Action "${actionId}" is NOT in the allowlist. Execution rejected.`);
  }

  const validatedParams = definition.validateParams ? definition.validateParams(params) : params;

  const guards = [];
  const validatedTargets = [];

  if (definition.touchesFilesystem && typeof definition.resolveTargets === 'function') {
    const targets = definition.resolveTargets(validatedParams) || [];
    const failures = [];

    for (const target of targets) {
      try {
        const validation = validateDeletionTarget(target);
        guards.push(validation.guard);
        validatedTargets.push({ path: target, realPath: validation.realPath, classification: validation.classification });
      } catch (err) {
        failures.push(`${target}: ${err.message}`);
      }
    }

    const needAll = !definition.targetsAreCandidates;
    const satisfied = needAll ? failures.length === 0 : validatedTargets.length > 0;

    if (!satisfied) {
      // Release anything already pinned before refusing.
      for (const g of guards) { try { releaseGuard(g); } catch { /* already closed */ } }
      throw new Error(
        `[SECURITY ALLOWLIST] Action "${actionId}" declared ${targets.length} filesystem target(s), ` +
        `none of which passed validation. ${failures.join(' | ')}`,
      );
    }
  }

  return {
    actionId,
    definition,
    validatedParams,
    validatedTargets,
    guards,
    authorized: true,
  };
}

/** Closes the pinned file descriptors held by an authorization. Always call this. */
export function releaseAuthorization(authorization) {
  for (const g of authorization?.guards || []) {
    try { releaseGuard(g); } catch { /* already released */ }
  }
}

/**
 * @deprecated Misleading name — this authorizes, it never executed anything.
 * Retained so existing callers keep working; prefer `authorizeAllowlistedAction`.
 */
export const executeAllowlistedAction = authorizeAllowlistedAction;
