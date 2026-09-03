/**
 * Centralized API Client for WinSuite / MacSuite
 *
 * All backend communication flows through this module.
 * Uses relative URLs (proxied by Vite dev server to 127.0.0.1:3131).
 *
 * Architecture:
 *   API Client → Typed Contracts → React Hooks → Components
 */

const API_BASE = '/api';

export interface ApiError {
  code: string;
  error: string;
  recoverable?: boolean;
  remediation?: string;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T | null;
  error: ApiError | null;
}

/**
 * Core fetch wrapper with consistent error handling.
 * Never throws — returns structured ApiResponse instead.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const url = path.startsWith('/') ? `${API_BASE}${path.slice(path.startsWith('/api') ? 4 : 0)}` : `${API_BASE}/${path}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), (options as any).timeoutMs || 60000);

    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      let error: ApiError;
      try {
        error = await res.json();
      } catch {
        error = {
          code: `HTTP_${res.status}`,
          error: `Request failed with status ${res.status}`,
          recoverable: res.status >= 500,
        };
      }
      return { ok: false, status: res.status, data: null, error };
    }

    const data = await res.json();
    return { ok: true, status: res.status, data, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const isAbort = message.includes('aborted') || message.includes('AbortError');
    return {
      ok: false,
      status: 0,
      data: null,
      error: {
        code: isAbort ? 'REQUEST_TIMEOUT' : 'NETWORK_ERROR',
        error: isAbort ? 'Request timed out' : `Backend unreachable: ${message}`,
        recoverable: true,
        remediation: isAbort
          ? 'The operation took too long. Try again or reduce scope.'
          : 'Ensure the backend server is running on port 3131.',
      },
    };
  }
}

/** GET request */
export function apiGet<T = unknown>(path: string, timeoutMs = 30000): Promise<ApiResponse<T>> {
  return apiFetch<T>(path, { method: 'GET', timeoutMs } as any);
}

/** POST request with JSON body */
export function apiPost<T = unknown>(path: string, body: unknown, timeoutMs = 60000): Promise<ApiResponse<T>> {
  return apiFetch<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
    timeoutMs,
  } as any);
}

// ─── Domain-specific API functions ──────────────────────────────────────────

export const systemApi = {
  getInfo: () => apiGet('/sysinfo'),
  getCapabilities: () => apiGet('/capabilities'),
  getPermissions: () => apiGet('/permissions'),
  getThermal: () => apiGet('/thermal'),
};

export const diagnosticsApi = {
  getHealthCheck: () => apiGet('/health-check'),
  getProcesses: () => apiGet('/processes'),
  getEventLogs: () => apiGet('/event-logs'),
  getBattery: () => apiGet('/battery'),
  getPackages: () => apiGet('/packages'),
  getHardware: () => apiGet('/hardware'),
  getRecommendations: () => apiGet('/diagnostics/recommendations'),
  getCorrelationIncidents: () => apiGet('/diagnostics/correlation-incidents'),
  getBaseline: (profile = '7day') => apiGet(`/diagnostics/multi-baseline?profile=${profile}`),
  getForecast: () => apiGet('/diagnostics/predictive-forecast'),
  getPerformanceDiagnosis: () => apiGet('/performance/diagnosis'),
  getThermalDeep: () => apiGet('/thermal/deep'),
  getBatteryIntelligence: () => apiGet('/battery/intelligence'),
  getUpdateDoctor: () => apiGet('/diagnostics/update-doctor'),
  getDiskHealth: () => apiGet('/diagnostics/disk-health'),
  getCrashHang: () => apiGet('/diagnostics/crashes-hangs'),
  getSystemStability: () => apiGet('/diagnostics/system-stability'),
  getSpotlight: () => apiGet('/diagnostics/spotlight-doctor'),
  getTimeMachine: () => apiGet('/diagnostics/time-machine'),
  getICloud: () => apiGet('/diagnostics/icloud'),
  getAppleServices: () => apiGet('/diagnostics/apple-services'),
  getAudio: () => apiGet('/diagnostics/audio'),
  getCameraMic: () => apiGet('/diagnostics/camera-mic'),
  getDisplays: () => apiGet('/diagnostics/displays'),
  getPeripherals: () => apiGet('/diagnostics/peripherals'),
  getFinderClipboard: () => apiGet('/diagnostics/finder-clipboard'),
  getSshDoctor: () => apiGet('/diagnostics/ssh-doctor'),
  getVirtualization: () => apiGet('/diagnostics/virtualization'),
  getBrowserHealth: () => apiGet('/diagnostics/browser-health'),
  getAppResource: (appName: string) => apiGet(`/diagnostics/app-resource?appName=${encodeURIComponent(appName)}`),
  getSystemTimeline: () => apiGet('/diagnostics/system-timeline'),
  getBaselineDiff: () => apiGet('/diagnostics/baseline-diff'),
  runExperiment: (hypothesisId: string) => apiGet(`/diagnostics/run-experiment?hypothesisId=${encodeURIComponent(hypothesisId)}`),
  getTroubleshoot: (issueId: string) => apiGet(`/troubleshoot/${encodeURIComponent(issueId)}`),
  getAppCompatibility: (appName: string) => apiGet(`/diagnostics/app-compatibility/${encodeURIComponent(appName)}`),
  getPowerAssertions: () => apiGet('/power-assertions'),
  getSpotlightStatus: () => apiGet('/spotlight'),
};

export const securityApi = {
  getStatus: () => apiGet('/security'),
  getPrivacy: () => apiGet('/privacy'),
  // macOS extended security
  getPrivacyRisk: () => apiGet('/security/privacy-risk', 20000),
};

export const storageApi = {
  getStorage: () => apiGet('/storage'),
  getDocker: () => apiGet('/storage/docker'),
  getXcode: () => apiGet('/storage/xcode'),
  getSnapshots: () => apiGet('/snapshots'),
  // macOS extended storage
  getDuplicates: (scanPath?: string, max = 50) =>
    apiGet(`/storage/duplicates${scanPath ? `?path=${encodeURIComponent(scanPath)}&max=${max}` : `?max=${max}`}`, 60000),
  getLargeFiles: () => apiGet('/storage/large-files', 15000),
  getFilePermissions: (targetPath?: string) =>
    apiGet(`/storage/file-permissions${targetPath ? `?path=${encodeURIComponent(targetPath)}` : ''}`, 10000),
};

export const networkApi = {
  getDiagnostics: () => apiGet('/network/diagnostics', 30000),
  getListeningPorts: () => apiGet('/network/listening-ports'),
  // macOS extended network
  getDnsDiagnostics: () => apiGet('/network/dns-diagnostics', 20000),
  getFirewallRules: () => apiGet('/network/firewall-rules', 20000),
};

export const servicesApi = {
  getServices: () => apiGet('/services'),
  getStartupItems: () => apiGet('/startup-items'),
};

export const reportsApi = {
  generate: (body: { title: string; reportType: string; summary: string }) =>
    apiPost('/reports/generate', body),
  getHistory: () => apiGet('/audit-history'),
};

export const actionsApi = {
  runPhase: (body: { commandId: string; confirmed?: boolean; sessionId?: string; parameters?: Record<string, unknown> }) =>
    apiPost('/actions/run-phase', body, 300000),
  cancel: () => apiPost('/actions/cancel', {}),
  askAssistant: (query: string) => apiPost('/actions/ask-assistant', { query }, 30000),
  cleanupPlan: () => apiPost('/actions/cleanup-plan', {}),
  executeCleanup: (body: { selectedItemIds: string[]; confirmed: boolean; idempotencyKey?: string; dryRun?: boolean }) =>
    apiPost('/actions/execute-cleanup', body, 120000),
  undoCleanup: (transactionId: string) => apiPost('/actions/undo-cleanup', { transactionId }),
  cleanStorage: () => apiPost('/actions/clean-storage', {}, 60000),
  cleanDocker: (body: { pruneImages?: boolean; pruneBuildCache?: boolean; pruneContainers?: boolean }) =>
    apiPost('/actions/clean-docker', body, 30000),
  cleanXcode: () => apiPost('/actions/clean-xcode', {}, 30000),
  toggleStartup: (itemName: string, enable: boolean) =>
    apiPost('/actions/toggle-startup', { itemName, enable }),
  toggleService: (serviceName: string, action: string, confirmed: boolean) =>
    apiPost('/actions/toggle-service', { serviceName, action, confirmed }),
  runIntegrityCheck: () => apiPost('/actions/run-integrity-check', {}, 600000),
  thinSnapshots: (confirmed: boolean) =>
    apiPost('/actions/thin-snapshots', { confirmed }, 180000),
  purgeRam: (body?: { idempotencyKey?: string; dryRun?: boolean }) =>
    apiPost('/actions/purge-ram', body || {}),
  restartAudio: () => apiPost('/actions/restart-audio', {}),
  rebuildIconCache: () => apiPost('/actions/rebuild-icon-cache', {}),
  brewDoctor: () => apiPost('/actions/brew-doctor', {}, 60000),
  brewAutoremove: () => apiPost('/actions/brew-autoremove', {}, 120000),
  cleanXcodeSimulators: () => apiPost('/actions/clean-xcode-simulators', {}),
  killPort: (port: number, body?: { idempotencyKey?: string; dryRun?: boolean }) =>
    apiPost('/actions/kill-port', { port, ...body }, 30000),
  removeQuarantine: (appPath?: string, appName?: string) =>
    apiPost('/actions/remove-quarantine', { appPath, appName }),
  ejectDrive: (volumePath: string, force?: boolean) =>
    apiPost('/actions/eject-drive', { volumePath, force }),
};

export const appsApi = {
  getInventory: () => apiGet('/apps/inventory'),
  getFootprint: (appName: string) => apiGet(`/apps/footprint/${encodeURIComponent(appName)}`),
};

export const developerApi = {
  getHealth: () => apiGet('/developer/health'),
};

/**
 * Creates an SSE (Server-Sent Events) connection for live log streaming.
 */
export function createLogStream(
  sessionId: string,
  onMessage: (data: { type: string; entry?: unknown }) => void,
): EventSource | null {
  try {
    const es = new EventSource(`${API_BASE}/actions/stream/${encodeURIComponent(sessionId)}`);
    es.onmessage = (event) => {
      try {
        onMessage(JSON.parse(event.data));
      } catch { /* ignore parse errors from malformed SSE */ }
    };
    return es;
  } catch {
    return null;
  }
}

// ─── Windows Management API ─────────────────────────────────────────────────

export const windowsApi = {
  // ── v1 Read-only ──
  getApps: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiGet(`/windows/apps${qs}`, 30000);
  },
  getAppUpdates: () => apiGet('/windows/apps/updates', 30000),
  getDrivers: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiGet(`/windows/drivers${qs}`, 30000);
  },
  getDevices: () => apiGet('/windows/devices', 30000),
  getServices: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiGet(`/windows/services${qs}`, 20000);
  },
  getProcesses: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiGet(`/windows/processes${qs}`, 20000);
  },
  getStartup: () => apiGet('/windows/startup', 15000),
  getScheduledTasks: () => apiGet('/windows/scheduled-tasks', 20000),
  getWindowsUpdate: () => apiGet('/windows/update', 30000),
  getSecurity: () => apiGet('/windows/security', 20000),
  getNetwork: () => apiGet('/windows/network', 15000),
  getLargeFiles: (maxFiles = 20, minSizeMB = 100) =>
    apiGet(`/windows/storage/large?maxFiles=${maxFiles}&minSizeMB=${minSizeMB}`, 30000),
  getEvents: () => apiGet('/windows/events', 20000),
  getDeveloper: () => apiGet('/windows/developer', 20000),
  getFeatures: () => apiGet('/windows/features', 15000),
  getHealthCheck: () => apiGet('/windows/health-check', 60000),

  // ── v1 Mutating ──
  updateApps: (appIds: string[]) =>
    apiPost('/windows/apps/update', { appIds, confirmed: true }, 300000),
  uninstallApp: (uninstallString: string, appName: string) =>
    apiPost('/windows/apps/uninstall', { uninstallString, appName, confirmed: true }, 120000),
  serviceAction: (serviceName: string, action: 'start' | 'stop' | 'restart') =>
    apiPost('/windows/services/action', { serviceName, action, confirmed: true }, 30000),
  toggleStartup: (itemName: string, enable: boolean) =>
    apiPost('/windows/startup/toggle', { itemName, enable, confirmed: true }),
  networkFlush: (action: 'flush-dns' | 'renew-dhcp') =>
    apiPost('/windows/network/flush', { action, confirmed: true }),

  // ── v2 Read-only (Expansion Pack) ──
  // Update Intelligence
  getUpdateHistory: () => apiGet('/windows/v2/update/history', 30000),
  getUpdateDiagnostics: () => apiGet('/windows/v2/update/diagnostics', 20000),
  getFailedUpdates: () => apiGet('/windows/v2/update/failed', 30000),

  // Driver Management
  getDriverSigning: () => apiGet('/windows/v2/drivers/signing', 30000),
  getDriverBackup: () => apiGet('/windows/v2/drivers/backup', 15000),
  getProblemDevices: () => apiGet('/windows/v2/drivers/problems', 20000),

  // BSOD & Crash
  getBSOD: () => apiGet('/windows/v2/bsod', 20000),
  getAppCrashes: () => apiGet('/windows/v2/crashes/apps', 20000),

  // Boot Performance
  getBootPerformance: () => apiGet('/windows/v2/boot', 20000),

  // System Integrity
  getSystemIntegrity: () => apiGet('/windows/v2/integrity', 60000),

  // Storage
  getStorageOverview: () => apiGet('/windows/v2/storage/overview', 30000),
  getDuplicates: (path?: string, max = 50) =>
    apiGet(`/windows/v2/storage/duplicates${path ? `?path=${encodeURIComponent(path)}&max=${max}` : `?max=${max}`}`, 60000),
  getDiskHealth: () => apiGet('/windows/v2/storage/disks', 15000),

  // Network
  getConnections: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiGet(`/windows/v2/network/connections${qs}`, 20000);
  },
  getListeningPorts: () => apiGet('/windows/v2/network/ports', 15000),
  getWiFi: () => apiGet('/windows/v2/network/wifi', 10000),
  getDNS: () => apiGet('/windows/v2/network/dns', 20000),
  getFirewallRules: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiGet(`/windows/v2/network/firewall${qs}`, 30000);
  },

  // Reliability
  getReliability: () => apiGet('/windows/v2/reliability', 30000),

  // System Snapshot
  getSnapshot: () => apiGet('/windows/v2/snapshot', 30000),

  // Recovery
  getRecovery: () => apiGet('/windows/v2/recovery', 20000),

  // Hardware
  getHardware: () => apiGet('/windows/v2/hardware', 20000),
  getPrinters: () => apiGet('/windows/v2/printers', 15000),

  // Power
  getPower: () => apiGet('/windows/v2/power', 15000),

  // Privacy
  getPrivacy: () => apiGet('/windows/v2/privacy', 15000),

  // Developer Tools
  getWSL: () => apiGet('/windows/v2/wsl', 10000),
  getDocker: () => apiGet('/windows/v2/docker', 10000),
  getEnvironment: () => apiGet('/windows/v2/environment', 15000),

  // Cleanup
  getCleanup: () => apiGet('/windows/v2/cleanup', 60000),

  // Services & Tasks
  getServiceDeps: () => apiGet('/windows/v2/services/deps', 60000),
  getTaskAnalysis: () => apiGet('/windows/v2/tasks/analysis', 30000),

  // System Extras (Enhancement Pack)
  getClipboard: () => apiGet('/windows/v2/clipboard', 10000),
  getEnvVars: () => apiGet('/windows/v2/env-vars', 15000),
  getHostsFile: () => apiGet('/windows/v2/hosts', 10000),
  getServicesSummary: () => apiGet('/windows/v2/services/summary', 20000),

  // Action Center
  getActionCenter: () => apiGet('/windows/v2/action-center', 60000),

  // ── v2 Mutating ──
  createSnapshot: (label?: string) =>
    apiPost('/windows/v2/snapshot/create', { confirmed: true, label }, 30000),
  executeCleanup: (categories: string[]) =>
    apiPost('/windows/v2/cleanup/execute', { confirmed: true, categories }, 30000),
  createRestorePoint: (description?: string) =>
    apiPost('/windows/v2/recovery/restore', { confirmed: true, description }, 60000),
  runSFC: () => apiPost('/windows/v2/integrity/sfc', { confirmed: true }, 600000),
  runDISM: (action: 'CheckHealth' | 'ScanHealth' | 'RestoreHealth') =>
    apiPost('/windows/v2/integrity/dism', { confirmed: true, action }, action === 'RestoreHealth' ? 1800000 : 300000),
  setPowerPlan: (planGuid: string) =>
    apiPost('/windows/v2/power/plan', { confirmed: true, planGuid }),
};
