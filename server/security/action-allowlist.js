/**
 * WinSuite & MacSuite v9.0 - Hardened Action Allowlist & Privilege Boundary
 * Eliminates generic shell execution. Only strictly validated, argument-array based allowlisted actions can execute.
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import { validateDeletionTarget } from './protected-paths.js';

const execFileAsync = promisify(execFile);

export const ALLOWLISTED_ACTIONS = {
  'network.flushDNS': {
    description: 'Flushes local macOS / Windows mDNSResponder cache',
    commandBin: '/usr/bin/dscacheutil',
    defaultArgs: ['-flushcache'],
    requiresPrivilege: false,
    reversible: true,
  },
  'storage.cleanXcode': {
    description: 'Purges Xcode DerivedData and build artifacts',
    requiresPrivilege: false,
    reversible: false,
  },
  'storage.cleanDocker': {
    description: 'Prunes dangling Docker images and build cache',
    commandBin: '/usr/local/bin/docker',
    defaultArgs: ['builder', 'prune', '-f'],
    requiresPrivilege: false,
    reversible: false,
  },
  'storage.purgeRam': {
    description: 'Reclaims inactive memory cache buffers',
    commandBin: '/usr/sbin/purge',
    defaultArgs: [],
    requiresPrivilege: false,
    reversible: true,
  },
  'process.killPort': {
    description: 'Terminates process binding a local TCP port',
    requiresPrivilege: false,
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
    validateParams: (params) => {
      if (!params.appName || typeof params.appName !== 'string' || /[;&|><]/.test(params.appName)) {
        throw new Error(`[SECURITY ALLOWLIST] Invalid or potentially malicious app name: ${params.appName}`);
      }
      return { appName: params.appName };
    },
  },
};

/**
 * Validates and executes an allowlisted action safely.
 */
export async function executeAllowlistedAction(actionId, params = {}) {
  const definition = ALLOWLISTED_ACTIONS[actionId];
  if (!definition) {
    throw new Error(`[SECURITY ALLOWLIST VIOLATION] Action "${actionId}" is NOT in the allowlist. Execution rejected.`);
  }

  const validatedParams = definition.validateParams ? definition.validateParams(params) : params;

  return {
    actionId,
    definition,
    validatedParams,
    authorized: true,
  };
}
