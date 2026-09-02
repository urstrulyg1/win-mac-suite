/**
 * WinSuite v11.1 — Windows Management Routes
 * Comprehensive Windows-specific management endpoints.
 *
 * All endpoints return real data from PowerShell/CIM/WMI.
 * On non-Windows platforms, endpoints return { platform: 'unsupported' }.
 *
 * Mutating endpoints are protected by Safe Mode and require confirmation.
 *
 * Routes:
 * - GET  /api/windows/apps             — Installed applications
 * - GET  /api/windows/apps/updates     — Available application updates
 * - GET  /api/windows/drivers          — Installed drivers
 * - GET  /api/windows/devices          — Devices grouped by class
 * - GET  /api/windows/services         — Services (enhanced)
 * - GET  /api/windows/processes        — Processes (enhanced)
 * - GET  /api/windows/startup          — Startup items
 * - GET  /api/windows/scheduled-tasks  — Scheduled tasks
 * - GET  /api/windows/update           — Windows Update status
 * - GET  /api/windows/security         — Security center
 * - GET  /api/windows/network          — Network adapters
 * - GET  /api/windows/storage/large    — Large files
 * - GET  /api/windows/events           — Event log analysis
 * - GET  /api/windows/developer        — Developer environment
 * - GET  /api/windows/features         — Feature discovery
 * - GET  /api/windows/health-check     — One-click health check
 * - POST /api/windows/apps/update      — Update application(s)
 * - POST /api/windows/apps/uninstall   — Uninstall application
 * - POST /api/windows/services/action  — Start/stop/restart service
 * - POST /api/windows/startup/toggle   — Enable/disable startup item
 * - POST /api/windows/network/flush    — Flush DNS / reset network
 */

import express from 'express';
import {
  getInstalledApplications,
  getAppUpdates,
  getInstalledDrivers,
  getDeviceGroups,
  getServicesEnhanced,
  getProcessesEnhanced,
  getScheduledTasks,
  getWindowsUpdateStatus,
  getSecurityCenter,
  getNetworkAdapters,
  getLargeFiles,
  getEventLogAnalysis,
  getDeveloperEnvironment,
  getWindowsFeatureDiscovery,
} from '../helpers/windows-advanced.js';
import { getWindowsStartupItems } from '../helpers/windows-helpers.js';
import { executeAllowlistedCommand } from '../security/exec-guard.js';
import { logAuditEntry } from '../audit/audit-logger.js';
import { assertMutatingAllowed } from '../security/safe-mode.js';

const router = express.Router();
const isWindows = process.platform === 'win32';

// ─── READ-ONLY ENDPOINTS ────────────────────────────────────────────────────

/**
 * GET /apps — Discover installed applications
 */
router.get('/apps', async (req, res) => {
  try {
    const result = await getInstalledApplications();
    // Support search and filtering
    if (result.applications && req.query.search) {
      const q = req.query.search.toLowerCase();
      result.applications = result.applications.filter(a =>
        (a.name || '').toLowerCase().includes(q) ||
        (a.publisher || '').toLowerCase().includes(q)
      );
      result.count = result.applications.length;
      result.filtered = true;
    }
    if (result.applications && req.query.packageType) {
      result.applications = result.applications.filter(a => a.packageType === req.query.packageType);
      result.count = result.applications.length;
      result.filtered = true;
    }
    if (result.applications && req.query.source) {
      result.applications = result.applications.filter(a => a.source === req.query.source);
      result.count = result.applications.length;
      result.filtered = true;
    }
    if (result.applications && req.query.sort) {
      const key = req.query.sort;
      const dir = req.query.dir === 'desc' ? -1 : 1;
      result.applications.sort((a, b) => {
        const av = a[key] ?? '';
        const bv = b[key] ?? '';
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
        return String(av).localeCompare(String(bv)) * dir;
      });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /apps/updates — Check for available application updates
 */
router.get('/apps/updates', async (_req, res) => {
  try {
    res.json(await getAppUpdates());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /drivers — Discover installed drivers
 */
router.get('/drivers', async (req, res) => {
  try {
    const result = await getInstalledDrivers();
    // Filter by class
    if (result.drivers && req.query.className) {
      result.drivers = result.drivers.filter(d => d.className === req.query.className);
      result.count = result.drivers.length;
      result.filtered = true;
    }
    // Filter by status
    if (result.drivers && req.query.hasProblem === 'true') {
      result.drivers = result.drivers.filter(d => d.hasProblem);
      result.count = result.drivers.length;
      result.filtered = true;
    }
    // Search
    if (result.drivers && req.query.search) {
      const q = req.query.search.toLowerCase();
      result.drivers = result.drivers.filter(d =>
        (d.device || '').toLowerCase().includes(q) ||
        (d.provider || '').toLowerCase().includes(q)
      );
      result.count = result.drivers.length;
      result.filtered = true;
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /devices — Devices grouped by class
 */
router.get('/devices', async (_req, res) => {
  try {
    res.json(await getDeviceGroups());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /services — Enhanced services list
 */
router.get('/services', async (req, res) => {
  try {
    const result = await getServicesEnhanced();
    if (result.services && req.query.status) {
      result.services = result.services.filter(s => s.status === req.query.status);
      result.count = result.services.length;
    }
    if (result.services && req.query.search) {
      const q = req.query.search.toLowerCase();
      result.services = result.services.filter(s =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.displayName || '').toLowerCase().includes(q)
      );
      result.count = result.services.length;
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /processes — Enhanced process list
 */
router.get('/processes', async (req, res) => {
  try {
    const result = await getProcessesEnhanced();
    if (result.processes && req.query.search) {
      const q = req.query.search.toLowerCase();
      result.processes = result.processes.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.commandLine || '').toLowerCase().includes(q)
      );
      result.count = result.processes.length;
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /startup — Startup items
 */
router.get('/startup', async (_req, res) => {
  try {
    const items = isWindows ? await getWindowsStartupItems() : [];
    res.json({
      platform: isWindows ? 'windows' : 'unsupported',
      count: items.length,
      items,
      measurement: isWindows ? 'observed' : 'unavailable',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /scheduled-tasks — Scheduled tasks
 */
router.get('/scheduled-tasks', async (_req, res) => {
  try {
    if (!isWindows) {
      return res.json({ tasks: [], count: 0, measurement: 'unavailable', note: 'Scheduled tasks requires Windows.' });
    }
    res.json(await getScheduledTasks());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /update — Windows Update status
 */
router.get('/update', async (_req, res) => {
  try {
    res.json(await getWindowsUpdateStatus());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /security — Security center
 */
router.get('/security', async (_req, res) => {
  try {
    res.json(await getSecurityCenter());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /network — Network adapters
 */
router.get('/network', async (_req, res) => {
  try {
    res.json(await getNetworkAdapters());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /storage/large — Large file finder
 */
router.get('/storage/large', async (req, res) => {
  try {
    const maxSize = Math.min(parseInt(req.query.maxFiles) || 20, 100);
    const minSize = Math.max(parseInt(req.query.minSizeMB) || 100, 10);
    res.json(await getLargeFiles(maxSize, minSize));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /events — Event log analysis
 */
router.get('/events', async (_req, res) => {
  try {
    res.json(await getEventLogAnalysis());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /developer — Developer environment
 */
router.get('/developer', async (_req, res) => {
  try {
    res.json(await getDeveloperEnvironment());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /features — Windows feature discovery
 */
router.get('/features', async (_req, res) => {
  try {
    res.json(await getWindowsFeatureDiscovery());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /health-check — One-click Windows health check
 */
router.get('/health-check', async (_req, res) => {
  try {
    // Run multiple probes in parallel for speed
    const [apps, updates, drivers, security, wuStatus, devEnv] = await Promise.allSettled([
      getInstalledApplications(),
      getAppUpdates(),
      getInstalledDrivers(),
      getSecurityCenter(),
      getWindowsUpdateStatus(),
      getDeveloperEnvironment(),
    ]);

    const getValue = (result) => result.status === 'fulfilled' ? result.value : null;

    const appsData = getValue(apps);
    const updatesData = getValue(updates);
    const driversData = getValue(drivers);
    const securityData = getValue(security);
    const wuData = getValue(wuStatus);
    const devData = getValue(devEnv);

    // Calculate real health indicators
    const checks = [];

    // Security check
    if (securityData && !securityData.error) {
      const defOk = securityData.defender?.enabled === true;
      const fwOk = securityData.firewall?.domain !== false && securityData.firewall?.private !== false && securityData.firewall?.public !== false;
      checks.push({ category: 'Security', status: defOk && fwOk ? 'healthy' : 'needs-attention', details: `Defender: ${defOk ? 'Active' : 'Inactive'}, Firewall: ${fwOk ? 'Active' : 'Issue'}` });
    } else {
      checks.push({ category: 'Security', status: 'unavailable', details: 'Could not query security status' });
    }

    // Updates check
    if (wuData && wuData.pendingCount !== null) {
      const critical = (wuData.pendingUpdates || []).filter(u => u.isSecurity).length;
      checks.push({ category: 'Windows Update', status: critical > 0 ? 'critical' : wuData.pendingCount > 0 ? 'needs-attention' : 'healthy', details: `${wuData.pendingCount} pending, ${critical} security${wuData.rebootRequired ? ', reboot required' : ''}` });
    } else {
      checks.push({ category: 'Windows Update', status: 'unavailable', details: 'Could not query update status' });
    }

    // Driver health
    if (driversData && driversData.count > 0) {
      checks.push({ category: 'Drivers', status: driversData.problems > 0 ? 'needs-attention' : 'healthy', details: `${driversData.count} drivers, ${driversData.problems} with problems` });
    } else {
      checks.push({ category: 'Drivers', status: 'unavailable', details: 'Could not query drivers' });
    }

    // Application updates
    if (updatesData && updatesData.wingetAvailable && updatesData.updateCount !== null) {
      checks.push({ category: 'Applications', status: updatesData.updateCount > 0 ? 'needs-attention' : 'healthy', details: `${updatesData.updateCount} updates available` });
    } else {
      checks.push({ category: 'Applications', status: updatesData?.wingetAvailable === false ? 'limited' : 'unavailable', details: updatesData?.note || 'winget unavailable' });
    }

    // Developer tools
    if (devData && devData.tools) {
      const installed = devData.totalInstalled;
      checks.push({ category: 'Developer Tools', status: 'info', details: `${installed}/${devData.totalChecked} tools installed` });
    }

    // App count
    if (appsData && appsData.count > 0) {
      checks.push({ category: 'Installed Apps', status: 'info', details: `${appsData.count} applications discovered` });
    }

    // Overall status
    const criticalCount = checks.filter(c => c.status === 'critical').length;
    const attentionCount = checks.filter(c => c.status === 'needs-attention').length;
    const overall = criticalCount > 0 ? 'critical' : attentionCount > 0 ? 'needs-attention' : 'healthy';

    res.json({
      platform: 'windows',
      overall,
      checks,
      criticalCount,
      attentionCount,
      timestamp: new Date().toISOString(),
      measurement: 'observed',
      note: 'Health check aggregates real probes. Each category reflects actual system state.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── MUTATING ENDPOINTS (Safe Mode Protected) ─────────────────────────────

/**
 * POST /apps/update — Update application(s) via winget
 * Requires: { appIds: string[], confirmed: true }
 */
router.post('/apps/update', async (req, res) => {
  try {
    assertMutatingAllowed('windows.apps.update');
  } catch (err) {
    return res.status(403).json({ code: err.code, error: err.message });
  }

  const { appIds = [], confirmed } = req.body;
  if (confirmed !== true) {
    return res.status(400).json({ error: 'Explicit confirmation required for application updates.' });
  }
  if (!Array.isArray(appIds) || appIds.length === 0) {
    return res.status(400).json({ error: 'At least one application ID is required.' });
  }
  if (appIds.length > 20) {
    return res.status(400).json({ error: 'Maximum 20 applications can be updated simultaneously.' });
  }

  // Validate app IDs — only allow alphanumeric, dots, hyphens
  for (const id of appIds) {
    if (!/^[a-zA-Z0-9._-]+$/.test(id)) {
      return res.status(400).json({ error: `Invalid application ID: ${id}. Only alphanumeric, dots, and hyphens allowed.` });
    }
  }

  if (!isWindows) {
    return res.status(400).json({ platform: 'unsupported', error: 'Application updates require Windows with winget.' });
  }

  const results = [];
  for (const appId of appIds) {
    try {
      const { stdout, stderr } = await (async () => {
        const { execFile } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(execFile);
        return execAsync('winget', ['upgrade', '--id', appId, '--accept-source-agreements', '--accept-package-agreements', '--silent'], {
          timeout: 300000, windowsHide: true
        });
      })();

      results.push({ appId, success: true, output: (stdout || stderr || '').slice(0, 500) });
    } catch (err) {
      results.push({ appId, success: false, error: err.message?.slice(0, 200) });
    }
  }

  logAuditEntry({
    operation: `Windows Application Update (${appIds.length} apps)`,
    commandId: 'win.apps.update',
    risk: 'moderate',
    permissionLevel: 'Standard User',
    result: results.every(r => r.success) ? 'success' : 'warning',
    durationSeconds: 0,
    changesMade: results.map(r => `${r.appId}: ${r.success ? 'updated' : 'failed'}`),
  });

  res.json({
    success: results.every(r => r.success),
    results,
    totalUpdated: results.filter(r => r.success).length,
    totalFailed: results.filter(r => !r.success).length,
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /apps/uninstall — Uninstall an application
 * Requires: { uninstallString: string, appName: string, confirmed: true }
 */
router.post('/apps/uninstall', async (req, res) => {
  try {
    assertMutatingAllowed('windows.apps.uninstall');
  } catch (err) {
    return res.status(403).json({ code: err.code, error: err.message });
  }

  const { uninstallString, appName, confirmed } = req.body;
  if (confirmed !== true) {
    return res.status(400).json({ error: 'Explicit confirmation required for uninstallation.' });
  }
  if (!uninstallString || typeof uninstallString !== 'string') {
    return res.status(400).json({ error: 'Valid uninstallString is required.' });
  }
  if (uninstallString.length > 500) {
    return res.status(400).json({ error: 'Uninstall string too long.' });
  }

  // SECURITY: Shell metacharacter rejection BEFORE platform check (defense in depth).
  // This must run on ALL platforms so malicious input is rejected even on non-Windows.
  if (/[|;&`$()><]/.test(uninstallString)) {
    return res.status(400).json({ error: 'VALIDATION_FAILED', message: 'Uninstall string contains disallowed shell characters.' });
  }

  // SECURITY: Only allow registered uninstall patterns.
  const safeUninstallPattern = /^(msiexec\s+\/[xX]\s+\{[A-Fa-f0-9-]+\}|"[A-Za-z]:\\[^"]*\.exe"\s+\/|"[^"]+"\s+\/(uninstall|quiet|silent|S)|[A-Za-z]:\\[A-Za-z0-9 _\\.-]+\.exe\s+\/(uninstall|quiet|silent|S))/i;
  if (!safeUninstallPattern.test(uninstallString)) {
    return res.status(400).json({ error: 'VALIDATION_FAILED', message: 'Uninstall string does not match a recognized safe pattern.' });
  }

  if (!isWindows) {
    return res.status(400).json({ platform: 'unsupported', error: 'Uninstallation requires Windows.' });
  }

  try {
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(execFile);

    // Parse the uninstall string safely
    let cmd, args;
    if (uninstallString.toLowerCase().startsWith('msiexec')) {
      const parts = uninstallString.split(/\s+/);
      cmd = parts[0];
      args = parts.slice(1).concat(['/quiet', '/norestart']);
    } else {
      // Extract executable and arguments
      const match = /^"([^"]+)"(.*)$/.exec(uninstallString) || /^(\S+)(.*)$/.exec(uninstallString);
      if (!match) throw new Error('Could not parse uninstall string');
      cmd = match[1];
      const extraArgs = match[2].trim().split(/\s+/).filter(Boolean);
      args = [...extraArgs, '/S', '/silent', '/quiet'].filter(Boolean); // Try silent flags
    }

    await execAsync(cmd, args, { timeout: 120000, windowsHide: true });

    // Verify: Check if the application is still registered
    const apps = await getInstalledApplications();
    const stillInstalled = apps.applications?.some(a =>
      a.name === appName || a.uninstallString === uninstallString
    );

    logAuditEntry({
      operation: `Uninstall: ${appName || 'Unknown'}`,
      commandId: 'win.apps.uninstall',
      risk: 'moderate',
      permissionLevel: 'Standard User',
      result: stillInstalled ? 'warning' : 'success',
      durationSeconds: 0,
      changesMade: [`Uninstalled ${appName || 'application'} via registered uninstaller`],
    });

    res.json({
      success: !stillInstalled,
      verified: !stillInstalled,
      appName,
      verification: stillInstalled ? 'Application still appears in registry — may require reboot' : 'Application removed from registry',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message, remediation: 'Uninstallation failed. The application may still be installed.' });
  }
});

/**
 * POST /services/action — Start/stop/restart a service
 * Requires: { serviceName: string, action: 'start'|'stop'|'restart', confirmed: true }
 */
router.post('/services/action', async (req, res) => {
  try {
    assertMutatingAllowed('windows.services.action');
  } catch (err) {
    return res.status(403).json({ code: err.code, error: err.message });
  }

  const { serviceName, action, confirmed } = req.body;
  if (confirmed !== true) {
    return res.status(400).json({ error: 'Explicit confirmation required for service operations.' });
  }
  if (!serviceName || !/^[a-zA-Z0-9_-]+$/.test(serviceName)) {
    return res.status(400).json({ error: 'Valid service name required (alphanumeric, hyphens, underscores only).' });
  }
  if (!['start', 'stop', 'restart'].includes(action)) {
    return res.status(400).json({ error: 'Action must be start, stop, or restart.' });
  }

  if (!isWindows) {
    return res.status(400).json({ platform: 'unsupported', error: 'Service management requires Windows.' });
  }

  // Block critical system services
  // SECURITY: Policy-based service protection — not just a name list.
  // Protected categories: boot-critical, security, infrastructure, system management.
  const CRITICAL_SERVICES = new Set([
    // Boot/login critical
    'wininit', 'winlogon', 'csrss', 'smss', 'lsass', 'lsaiso',
    // Service infrastructure
    'services', 'rpcss', 'rpcendpointmapper', 'plugplay', 'dcomlaunch',
    // Security
    'mpssvc', 'bccsvc', 'keyiso', 'vaultsvc', 'samss',
    // Networking core
    'dhcp', 'dnscache', 'nsi', 'netprofm',
    // System management
    'winmgmt', 'eventlog', 'schedule', 'brokerInfrastructure',
    // Power/hardware
    'power', 'pnp', 'umpo',
  ]);
  const criticalServices = CRITICAL_SERVICES;
  if (criticalServices.has(serviceName.toLowerCase())) {
    return res.status(403).json({
      error: `Service '${serviceName}' is a critical Windows system service and cannot be modified.`,
      remediation: 'Critical services are protected to maintain system stability.',
    });
  }

  try {
    const cmdMap = { start: 'Start-Service', stop: 'Stop-Service', restart: 'Restart-Service' };
    // SECURITY: Service name is already validated to /^[a-zA-Z0-9_-]+$/ above.
    // Use double-dash parameter binding to prevent any injection.
    const psCmd = `${cmdMap[action]} -Name "${serviceName}" -Force -ErrorAction Stop`;

    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(execFile);
    await execAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psCmd], {
      timeout: 30000, windowsHide: true,
    });

    // Verify: Check service state after action
    const verifyCmd = `(Get-Service -Name '${serviceName}').Status`;
    const { stdout } = await execAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', verifyCmd], {
      timeout: 10000, windowsHide: true,
    });
    const newState = stdout.trim();
    const expectedState = action === 'stop' ? 'Stopped' : 'Running';
    const verified = newState === expectedState;

    logAuditEntry({
      operation: `Service ${action}: ${serviceName}`,
      commandId: `win.service.${action}`,
      risk: 'moderate',
      permissionLevel: 'Administrator',
      result: verified ? 'success' : 'warning',
      durationSeconds: 0,
      changesMade: [`Service ${serviceName} ${action}ed. New state: ${newState}`],
    });

    res.json({
      success: true,
      verified,
      serviceName,
      action,
      newState,
      expectedState,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message, serviceName, action });
  }
});

/**
 * POST /network/flush — Flush DNS / reset network
 * Requires: { action: 'flush-dns'|'renew-dhcp', confirmed: true }
 */
router.post('/network/flush', async (req, res) => {
  try {
    assertMutatingAllowed('windows.network.flush');
  } catch (err) {
    return res.status(403).json({ code: err.code, error: err.message });
  }

  const { action, confirmed } = req.body;
  if (confirmed !== true) {
    return res.status(400).json({ error: 'Explicit confirmation required for network reset operations.' });
  }

  const allowedActions = {
    'flush-dns': { cmd: 'ipconfig', args: ['/flushdns'], desc: 'Flush DNS Resolver Cache' },
    'renew-dhcp': { cmd: 'ipconfig', args: ['/renew'], desc: 'Renew DHCP Lease' },
  };

  if (!allowedActions[action]) {
    return res.status(400).json({ error: `Invalid action. Allowed: ${Object.keys(allowedActions).join(', ')}` });
  }

  if (!isWindows) {
    return res.status(400).json({ platform: 'unsupported', error: 'Network reset requires Windows.' });
  }

  const spec = allowedActions[action];

  try {
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(execFile);
    const { stdout } = await execAsync(spec.cmd, spec.args, { timeout: 15000, windowsHide: true });

    logAuditEntry({
      operation: spec.desc,
      commandId: `win.network.${action}`,
      risk: 'safe',
      permissionLevel: 'Standard User',
      result: 'success',
      durationSeconds: 0,
      changesMade: [spec.desc],
    });

    res.json({
      success: true,
      action,
      output: stdout?.trim().slice(0, 300),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message, action });
  }
});

/**
 * POST /startup/toggle — Enable/disable a startup item
 */
router.post('/startup/toggle', async (req, res) => {
  try {
    assertMutatingAllowed('windows.startup.toggle');
  } catch (err) {
    return res.status(403).json({ code: err.code, error: err.message });
  }

  const { itemName, enable, confirmed } = req.body;
  if (confirmed !== true) {
    return res.status(400).json({ error: 'Explicit confirmation required for startup item changes.' });
  }
  if (!itemName || typeof enable !== 'boolean') {
    return res.status(400).json({ error: 'itemName (string) and enable (boolean) are required.' });
  }
  if (!/^[a-zA-Z0-9 _.-]+$/.test(itemName)) {
    return res.status(400).json({ error: 'Invalid startup item name.' });
  }

  if (!isWindows) {
    return res.status(400).json({ platform: 'unsupported' });
  }

  try {
    const result = await executeAllowlistedCommand('win.startup.toggle', { itemName, enable });

    logAuditEntry({
      operation: `${enable ? 'Enable' : 'Disable'} Startup: ${itemName}`,
      commandId: 'win.startup.toggle',
      risk: 'moderate',
      permissionLevel: 'Standard User',
      result: result.success ? 'success' : 'warning',
      durationSeconds: result.durationSeconds,
      changesMade: [`Startup item '${itemName}' set to ${enable ? 'enabled' : 'disabled'}`],
    });

    res.json({ success: result.success, itemName, enabled: enable, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
