/**
 * WinSuite & MacSuite v6.3 - Secure Execution Guard
 * Executes allowlisted commands safely using spawn/execFile with argument arrays.
 * Handles timeouts, process cleanup, sensitive output redaction, and SSE streaming.
 */

import { spawn } from 'child_process';
import os from 'os';
import path from 'path';
import { COMMAND_ALLOWLIST } from './allowlist.js';
import { validateCommandParameters } from './parameter-validator.js';

// Execution Mutex Lock
let activeExecution = null;

export function getActiveExecution() {
  return activeExecution;
}

export function isExecutionLocked() {
  return activeExecution !== null;
}

/**
 * Redacts sensitive credentials, tokens, API keys, and private path structures.
 * @param {string} text
 * @returns {string}
 */
export function redactSensitiveOutput(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/(?:password|secret|token|apikey|api_key|auth|bearer)\s*[:=]\s*[^\s]+/gi, '[REDACTED_SECRET]')
    .replace(/(?:bearer\s+)[a-zA-Z0-9_\-\.]{20,}/gi, 'Bearer [REDACTED_TOKEN]')
    .replace(/ghp_[a-zA-Z0-9]{36}/g, '[REDACTED_GITHUB_TOKEN]')
    .replace(/[a-f0-9]{32,64}/gi, (match) => (match.length >= 32 && match.length <= 64 ? `${match.slice(0, 4)}...[REDACTED_HASH]` : match));
}

/**
 * Classifies output line into INFO, SUCCESS, WARNING, or ERROR
 * @param {string} line
 * @returns {'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'}
 */
export function classifyOutputLine(line) {
  const lower = line.toLowerCase();
  if (lower.includes('error') || lower.includes('failed') || lower.includes('fatal') || lower.includes('denied')) {
    return 'ERROR';
  }
  if (lower.includes('warning') || lower.includes('caution') || lower.includes('deprecated') || lower.includes('skipped')) {
    return 'WARNING';
  }
  if (lower.includes('success') || lower.includes('completed') || lower.includes('done') || lower.includes('[ok]') || lower.includes('healthy')) {
    return 'SUCCESS';
  }
  return 'INFO';
}

/**
 * Resolves standard system binaries to trusted system paths where applicable
 * @param {string} bin
 * @param {'windows' | 'macos'} platform
 * @returns {string}
 */
export function resolveBinaryPath(bin, platform) {
  if (platform === 'windows') {
    const sysRoot = process.env.SystemRoot || 'C:\\Windows';
    const sys32 = path.join(sysRoot, 'System32');
    const psHome = path.join(sys32, 'WindowsPowerShell', 'v1.0');

    switch (bin.toLowerCase()) {
      case 'sfc':
        return path.join(sys32, 'sfc.exe');
      case 'dism':
        return path.join(sys32, 'dism.exe');
      case 'ipconfig':
        return path.join(sys32, 'ipconfig.exe');
      case 'defrag':
        return path.join(sys32, 'defrag.exe');
      case 'powershell':
        return path.join(psHome, 'powershell.exe');
      default:
        return bin; // winget, etc. resolved via safe spawn
    }
  } else if (platform === 'macos') {
    switch (bin.toLowerCase()) {
      case 'diskutil':
        return '/usr/sbin/diskutil';
      case 'tmutil':
        return '/usr/bin/tmutil';
      case 'softwareupdate':
        return '/usr/sbin/softwareupdate';
      case 'spctl':
        return '/usr/sbin/spctl';
      case 'dscacheutil':
        return '/usr/bin/dscacheutil';
      case 'brew':
        return '/opt/homebrew/bin/brew';
      default:
        return bin;
    }
  }
  return bin;
}

/**
 * Securely executes an allowlisted command with structured parameters.
 * @param {string} commandId
 * @param {Object} [params]
 * @param {Function} [onStreamLine] - Optional callback for live log streaming
 * @returns {Promise<{ success: boolean, stdout: string, stderr: string, exitCode: number, durationSeconds: number }>}
 */
export async function executeAllowlistedCommand(commandId, params = {}, onStreamLine = null) {
  const spec = COMMAND_ALLOWLIST[commandId];
  if (!spec) {
    throw new Error(`Command '${commandId}' is not permitted by allowlist.`);
  }

  // Validate platform
  const currentPlatform = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'macos' : 'unsupported';
  if (spec.platform !== currentPlatform) {
    throw new Error(`Command '${commandId}' requires platform '${spec.platform}', but host is '${currentPlatform}'.`);
  }

  // Parameter validation
  const validation = validateCommandParameters(spec, params);
  if (!validation.valid) {
    throw new Error(`Parameter validation failed: ${validation.error}`);
  }

  // Concurrency check
  if (activeExecution) {
    throw new Error(`Another operation ('${activeExecution.commandId}') is currently executing. Please wait.`);
  }

  const isMac = spec.platform === 'macos';
  const requiresSudo = spec.requiresElevation && isMac;
  const sudoPassword = params.sudoPassword || null;
  // Strip password from params immediately
  delete params.sudoPassword;

  const binaryPath = requiresSudo ? '/usr/bin/sudo' : resolveBinaryPath(spec.bin, spec.platform);
  const args = requiresSudo
    ? ['-S', '-p', '', resolveBinaryPath(spec.bin, spec.platform), ...validation.sanitizedArgs]
    : validation.sanitizedArgs;
  const timeoutMs = spec.timeoutMs || 120000;
  const startTime = Date.now();

  let childProcess = null;
  let stdoutAccum = '';
  let stderrAccum = '';
  let timedOut = false;

  activeExecution = {
    commandId,
    startTime,
    childProcess: null,
  };

  try {
    const result = await new Promise((resolve, reject) => {
      try {
        childProcess = spawn(binaryPath, args, {
          shell: false,
          windowsHide: true,
          env: {
            ...process.env,
            LANG: 'en_US.UTF-8',
          },
        });

        // If sudo password is provided, securely write to stdin and close
        if (requiresSudo && sudoPassword && childProcess.stdin) {
          childProcess.stdin.write(`${sudoPassword}\n`);
          childProcess.stdin.end();
        }
      } catch (err) {
        return reject(new Error(`Failed to spawn process for '${commandId}': ${err.message}`));
      }

      if (activeExecution) {
        activeExecution.childProcess = childProcess;
      }

      const timer = setTimeout(() => {
        timedOut = true;
        try {
          if (childProcess && !childProcess.killed) {
            childProcess.kill('SIGKILL');
          }
        } catch {}
        reject(new Error(`Command '${commandId}' exceeded execution timeout of ${Math.round(timeoutMs / 1000)}s.`));
      }, timeoutMs);

      const handleChunk = (chunk, isStderr = false) => {
        const text = chunk.toString('utf8');
        if (isStderr) {
          stderrAccum += text;
        } else {
          stdoutAccum += text;
        }

        if (onStreamLine) {
          const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
          for (const line of lines) {
            const redacted = redactSensitiveOutput(line);
            const level = classifyOutputLine(redacted);
            onStreamLine({
              time: new Date().toLocaleTimeString('en-US', { hour12: false }),
              level,
              message: redacted,
            });
          }
        }
      };

      childProcess.stdout?.on('data', (c) => handleChunk(c, false));
      childProcess.stderr?.on('data', (c) => handleChunk(c, true));

      childProcess.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });

      childProcess.on('close', (code) => {
        clearTimeout(timer);
        if (timedOut) return;
        const durationSeconds = Math.round((Date.now() - startTime) / 100) / 10;
        const isAuthError = requiresSudo && code !== 0 && (
          stderrAccum.toLowerCase().includes('incorrect password') ||
          stderrAccum.toLowerCase().includes('sorry, try again') ||
          stderrAccum.toLowerCase().includes('password is required')
        );

        resolve({
          success: code === 0,
          exitCode: code ?? 0,
          authError: isAuthError,
          error: isAuthError ? 'Authentication failed: Incorrect administrator password.' : undefined,
          stdout: redactSensitiveOutput(stdoutAccum),
          stderr: redactSensitiveOutput(stderrAccum),
          durationSeconds,
        });
      });
    });

    return result;
  } finally {
    activeExecution = null;
  }
}

/**
 * Attempts to cancel the current active execution if any
 */
export function cancelActiveExecution() {
  if (activeExecution && activeExecution.childProcess) {
    try {
      activeExecution.childProcess.kill('SIGTERM');
      setTimeout(() => {
        if (activeExecution?.childProcess && !activeExecution.childProcess.killed) {
          activeExecution.childProcess.kill('SIGKILL');
        }
      }, 2000);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
