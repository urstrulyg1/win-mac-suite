/**
 * WinSuite & MacSuite v8.0 - Server-Side Protected Paths Policy Engine
 * Strictly enforces filesystem safety rules on all mutation endpoints.
 */

import path from 'path';
import os from 'os';

const HOME = os.homedir();

export const PATH_CLASSIFICATION = {
  SYSTEM_PROTECTED: 'SYSTEM_PROTECTED',
  USER_CRITICAL: 'USER_CRITICAL',
  APPLICATION_BUNDLE: 'APPLICATION_BUNDLE',
  SAFE_RECLAIMABLE: 'SAFE_RECLAIMABLE',
  UNKNOWN_RISK: 'UNKNOWN_RISK',
};

// System protected root paths
const SYSTEM_PROTECTED_PREFIXES = [
  '/System',
  '/Library',
  '/usr',
  '/bin',
  '/sbin',
  '/private',
  '/etc',
  '/var',
  '/Volumes',
  'C:\\Windows',
  'C:\\Program Files',
  'C:\\Program Files (x86)',
];

// User critical personal document folders
const USER_CRITICAL_DIRECTORIES = [
  path.join(HOME, 'Documents'),
  path.join(HOME, 'Desktop'),
  path.join(HOME, 'Pictures'),
  path.join(HOME, 'Movies'),
  path.join(HOME, 'Music'),
  path.join(HOME, 'Personal'),
  path.join(HOME, 'Work'),
];

// Known safe reclaimable cache directories
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
  path.join(HOME, 'Downloads'), // With explicit user confirmation
];

/**
 * Classifies any given filesystem path.
 * @param {string} targetPath
 * @returns {string} One of PATH_CLASSIFICATION
 */
export function classifyPath(targetPath) {
  if (!targetPath || typeof targetPath !== 'string') return PATH_CLASSIFICATION.UNKNOWN_RISK;

  const normalized = path.resolve(targetPath);

  // Check system protected
  for (const sysPrefix of SYSTEM_PROTECTED_PREFIXES) {
    if (normalized === sysPrefix || normalized.startsWith(sysPrefix + path.sep)) {
      return PATH_CLASSIFICATION.SYSTEM_PROTECTED;
    }
  }

  // Check user critical
  for (const userDir of USER_CRITICAL_DIRECTORIES) {
    if (normalized === userDir || normalized.startsWith(userDir + path.sep)) {
      return PATH_CLASSIFICATION.USER_CRITICAL;
    }
  }

  // Check safe reclaimable
  for (const safePrefix of SAFE_RECLAIMABLE_PREFIXES) {
    if (normalized === safePrefix || normalized.startsWith(safePrefix + path.sep)) {
      return PATH_CLASSIFICATION.SAFE_RECLAIMABLE;
    }
  }

  if (normalized.endsWith('.app') || normalized.includes('.app/')) {
    return PATH_CLASSIFICATION.APPLICATION_BUNDLE;
  }

  return PATH_CLASSIFICATION.UNKNOWN_RISK;
}

/**
 * Validates whether a path is allowed to be deleted.
 * Throws an Error if safety violation occurs.
 * @param {string} targetPath
 * @returns {{ allowed: boolean, classification: string, reason: string }}
 */
export function validateDeletionTarget(targetPath) {
  const classification = classifyPath(targetPath);

  if (classification === PATH_CLASSIFICATION.SYSTEM_PROTECTED) {
    throw new Error(`[SAFETY POLICY VIOLATION] Target "${targetPath}" is a SYSTEM PROTECTED path. Deletions are strictly blocked.`);
  }

  if (classification === PATH_CLASSIFICATION.USER_CRITICAL) {
    throw new Error(`[SAFETY POLICY VIOLATION] Target "${targetPath}" resides in a USER CRITICAL document directory. Deletions are strictly blocked.`);
  }

  if (classification === PATH_CLASSIFICATION.UNKNOWN_RISK) {
    throw new Error(`[SAFETY POLICY VIOLATION] Target "${targetPath}" has UNKNOWN classification risk. Automatic deletion rejected.`);
  }

  return {
    allowed: true,
    classification,
    reason: 'Path is classified as SAFE_RECLAIMABLE or APPLICATION_BUNDLE.',
  };
}
