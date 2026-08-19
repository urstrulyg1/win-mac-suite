/**
 * WinSuite & MacSuite v10.0 — Chaos / Fault Injection Harness
 *
 * Deliberately simulates the eleven real-world failure modes so we can assert the
 * v10 requirement: EVERY failure is safe, explainable, and recoverable.
 * Disabled by default; enabled per-scenario by the chaos API or the test suite.
 */

export const FAULT_SCENARIOS = {
  PERMISSION_DENIED:  { id: 'PERMISSION_DENIED',  label: 'Permission denied (TCC/EPERM)',      error: () => Object.assign(new Error('EACCES: permission denied, open \'/Library/Logs/DiagnosticReports\''), { code: 'EACCES' }) },
  MISSING_BINARY:     { id: 'MISSING_BINARY',     label: 'Missing binary',                     error: () => Object.assign(new Error('ENOENT: no such file or directory, spawn /usr/local/bin/docker'), { code: 'ENOENT' }) },
  MALFORMED_OUTPUT:   { id: 'MALFORMED_OUTPUT',   label: 'Malformed command output',           error: () => new Error('Unexpected token \'<\' in JSON at position 0 (system_profiler returned non-JSON)') },
  CORRUPTED_JSON:     { id: 'CORRUPTED_JSON',     label: 'Corrupted JSON state file',          error: () => new Error('JSON parse failure: state file truncated at byte 4096') },
  TIMEOUT:            { id: 'TIMEOUT',            label: 'Command timeout',                    error: () => Object.assign(new Error('ETIMEDOUT: command exceeded 5000ms budget'), { code: 'ETIMEDOUT' }) },
  PROCESS_GONE:       { id: 'PROCESS_GONE',       label: 'Process disappeared mid-operation',  error: () => Object.assign(new Error('ESRCH: process disappeared before signal delivery'), { code: 'ESRCH' }) },
  FILE_GONE:          { id: 'FILE_GONE',          label: 'File disappeared mid-operation',     error: () => Object.assign(new Error('ENOENT: no such file or directory, unlink cache entry'), { code: 'ENOENT' }) },
  INSUFFICIENT_SPACE: { id: 'INSUFFICIENT_SPACE', label: 'Insufficient disk space',            error: () => Object.assign(new Error('ENOSPC: no space left on device'), { code: 'ENOSPC' }) },
  SUBSYSTEM_DOWN:     { id: 'SUBSYSTEM_DOWN',     label: 'Unavailable subsystem',              error: () => new Error('Subsystem unavailable: powermetrics daemon is not responding') },
  HELPER_UNAVAILABLE: { id: 'HELPER_UNAVAILABLE', label: 'Privileged helper unavailable',      error: () => new Error('privileged helper tool is not installed; authorization cannot be obtained') },
  NETWORK_DOWN:       { id: 'NETWORK_DOWN',       label: 'Network unavailable',                error: () => Object.assign(new Error('ENOTFOUND: network is unreachable'), { code: 'ENOTFOUND' }) },
};

class FaultInjector {
  constructor() {
    this.enabled = false;
    this.activeScenario = null;
    this.targetPattern = null; // regex string; null = all targets
    this.remainingTriggers = 0;
    this.history = [];
  }

  arm({ scenario, target = null, triggers = 1 }) {
    if (!FAULT_SCENARIOS[scenario]) {
      throw new Error(`Unknown fault scenario "${scenario}". Known: ${Object.keys(FAULT_SCENARIOS).join(', ')}`);
    }
    this.enabled = true;
    this.activeScenario = scenario;
    this.targetPattern = target;
    this.remainingTriggers = triggers;
    return this.status();
  }

  disarm() {
    this.enabled = false;
    this.activeScenario = null;
    this.targetPattern = null;
    this.remainingTriggers = 0;
    return this.status();
  }

  shouldTrigger(target = '') {
    if (!this.enabled || this.remainingTriggers <= 0) return false;
    if (this.targetPattern && !new RegExp(this.targetPattern).test(target)) return false;
    return true;
  }

  /** Throws the armed fault if this target matches. Safe no-op otherwise. */
  maybeThrow(target = '') {
    if (!this.shouldTrigger(target)) return;
    this.remainingTriggers -= 1;
    const scenario = FAULT_SCENARIOS[this.activeScenario];
    this.history.unshift({ scenario: scenario.id, target, at: new Date().toISOString() });
    if (this.history.length > 100) this.history.pop();
    if (this.remainingTriggers <= 0) this.enabled = false;
    throw scenario.error();
  }

  status() {
    return {
      armed: this.enabled,
      enabled: this.enabled,
      activeScenario: this.activeScenario,
      targetPattern: this.targetPattern,
      remainingTriggers: this.remainingTriggers,
      availableScenarios: Object.values(FAULT_SCENARIOS).map(({ id, label }) => ({ id, label })),
      recentInjections: this.history.slice(0, 10),
    };
  }
}

export const faultInjector = new FaultInjector();
