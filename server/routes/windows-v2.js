/**
 * WinSuite v12.0 — Windows Management Routes (Expansion Pack)
 * All new endpoints for the comprehensive Windows feature expansion.
 *
 * Routes:
 * - GET  /api/windows/v2/update/history       — Windows Update history
 * - GET  /api/windows/v2/update/diagnostics   — Update troubleshooting
 * - GET  /api/windows/v2/update/failed        — Failed updates list
 * - GET  /api/windows/v2/drivers/signing      — Driver signing audit
 * - GET  /api/windows/v2/drivers/backup       — Driver backup status
 * - GET  /api/windows/v2/drivers/problems     — Problem devices
 * - GET  /api/windows/v2/bsod                 — BSOD/Crash analysis
 * - GET  /api/windows/v2/crashes/apps         — Application crashes
 * - GET  /api/windows/v2/boot                 — Boot performance
 * - GET  /api/windows/v2/integrity            — SFC/DISM health
 * - GET  /api/windows/v2/storage/overview     — Storage overview
 * - GET  /api/windows/v2/storage/duplicates   — Duplicate files
 * - GET  /api/windows/v2/storage/disks        — Disk health (SMART)
 * - GET  /api/windows/v2/network/connections  — TCP connections
 * - GET  /api/windows/v2/network/ports        — Listening ports
 * - GET  /api/windows/v2/network/wifi         — WiFi networks
 * - GET  /api/windows/v2/network/dns          — DNS diagnostics
 * - GET  /api/windows/v2/network/firewall     — Firewall rules
 * - GET  /api/windows/v2/reliability          — Reliability timeline
 * - GET  /api/windows/v2/snapshot             — System snapshot
 * - GET  /api/windows/v2/recovery             — Recovery center
 * - GET  /api/windows/v2/hardware             — Hardware diagnostics
 * - GET  /api/windows/v2/printers             — Printer center
 * - GET  /api/windows/v2/power                — Power & battery
 * - GET  /api/windows/v2/privacy              — Privacy audit
 * - GET  /api/windows/v2/wsl                  — WSL manager
 * - GET  /api/windows/v2/docker               — Docker health
 * - GET  /api/windows/v2/environment          — Environment health
 * - GET  /api/windows/v2/cleanup              — Cleanup advisor
 * - GET  /api/windows/v2/services/deps        — Service dependencies
 * - GET  /api/windows/v2/tasks/analysis       — Scheduled task analysis
 * - GET  /api/windows/v2/action-center        — Unified action center
 * - POST /api/windows/v2/snapshot/create      — Create system snapshot
 * - POST /api/windows/v2/cleanup/execute      — Execute safe cleanup
 * - POST /api/windows/v2/recovery/restore     — Create restore point
 * - POST /api/windows/v2/integrity/sfc        — Run SFC scan
 * - POST /api/windows/v2/integrity/dism       — Run DISM repair
 * - POST /api/windows/v2/power/plan           — Change power plan
 */

import express from 'express';
import {
  getUpdateHistory, getUpdateDiagnostics, getFailedUpdates,
  getDriverSigningAudit, getDriverBackupStatus, getProblemDevices,
  getBSODAnalysis, getAppCrashes,
  getBootPerformance,
  getSystemIntegrity,
  getStorageOverview, getDuplicateFiles, getDiskHealth,
  getNetworkConnections, getListeningPorts, getWiFiNetworks, getDNSDiagnostics, getFirewallRules,
  getReliabilityTimeline,
  createSystemSnapshot,
  getRecoveryStatus,
  getHardwareDiagnostics, getPrinters,
  getPowerBattery,
  getPrivacyAudit,
  getWSLStatus, getDockerHealth,
  getEnvironmentHealth,
  getCleanupAdvisor,
  getServiceDependencies,
  getScheduledTaskAnalysis,
} from '../helpers/windows-advanced-v2.js';
import {
  getSecurityCenter, getWindowsUpdateStatus, getInstalledDrivers,
  getInstalledApplications, getAppUpdates, getEventLogAnalysis,
  getLargeFiles, getNetworkAdapters,
} from '../helpers/windows-advanced.js';
import { assertMutatingAllowed } from '../security/safe-mode.js';
import { logAuditEntry } from '../audit/audit-logger.js';

const router = express.Router();
const isWindows = process.platform === 'win32';

// ─── READ-ONLY ENDPOINTS ────────────────────────────────────────────────────

// Update Intelligence
router.get('/update/history', async (_req, res) => {
  try { res.json(await getUpdateHistory()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/update/diagnostics', async (_req, res) => {
  try { res.json(await getUpdateDiagnostics()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/update/failed', async (_req, res) => {
  try { res.json(await getFailedUpdates()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// Driver Management
router.get('/drivers/signing', async (_req, res) => {
  try { res.json(await getDriverSigningAudit()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/drivers/backup', async (_req, res) => {
  try { res.json(await getDriverBackupStatus()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/drivers/problems', async (_req, res) => {
  try { res.json(await getProblemDevices()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// BSOD & Crash
router.get('/bsod', async (_req, res) => {
  try { res.json(await getBSODAnalysis()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/crashes/apps', async (_req, res) => {
  try { res.json(await getAppCrashes()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// Boot Performance
router.get('/boot', async (_req, res) => {
  try { res.json(await getBootPerformance()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// System Integrity (SFC/DISM)
router.get('/integrity', async (_req, res) => {
  try { res.json(await getSystemIntegrity()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// Storage
router.get('/storage/overview', async (_req, res) => {
  try { res.json(await getStorageOverview()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/storage/duplicates', async (req, res) => {
  try {
    const scanPath = req.query.path || null;
    const maxResults = Math.min(parseInt(req.query.max) || 50, 200);
    res.json(await getDuplicateFiles(scanPath, maxResults));
  }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/storage/disks', async (_req, res) => {
  try { res.json(await getDiskHealth()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// Network
router.get('/network/connections', async (req, res) => {
  try {
    const result = await getNetworkConnections();
    if (result.connections && req.query.state) {
      result.connections = result.connections.filter(c => c.state === req.query.state);
      result.filtered = true;
    }
    if (result.connections && req.query.process) {
      const q = req.query.process.toLowerCase();
      result.connections = result.connections.filter(c => (c.processName || '').toLowerCase().includes(q));
      result.filtered = true;
    }
    res.json(result);
  }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/network/ports', async (_req, res) => {
  try { res.json(await getListeningPorts()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/network/wifi', async (_req, res) => {
  try { res.json(await getWiFiNetworks()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/network/dns', async (_req, res) => {
  try { res.json(await getDNSDiagnostics()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/network/firewall', async (req, res) => {
  try {
    const result = await getFirewallRules();
    if (result.rules && req.query.direction) {
      result.rules = result.rules.filter(r => r.direction === req.query.direction);
      result.filtered = true;
    }
    if (result.rules && req.query.enabled === 'true') {
      result.rules = result.rules.filter(r => r.enabled === true);
      result.filtered = true;
    }
    res.json(result);
  }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// Reliability
router.get('/reliability', async (_req, res) => {
  try { res.json(await getReliabilityTimeline()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// Snapshot
router.get('/snapshot', async (_req, res) => {
  try { res.json(await createSystemSnapshot()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// Recovery
router.get('/recovery', async (_req, res) => {
  try { res.json(await getRecoveryStatus()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// Hardware
router.get('/hardware', async (_req, res) => {
  try { res.json(await getHardwareDiagnostics()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/printers', async (_req, res) => {
  try { res.json(await getPrinters()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// Power
router.get('/power', async (_req, res) => {
  try { res.json(await getPowerBattery()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// Privacy
router.get('/privacy', async (_req, res) => {
  try { res.json(await getPrivacyAudit()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// WSL
router.get('/wsl', async (_req, res) => {
  try { res.json(await getWSLStatus()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// Docker
router.get('/docker', async (_req, res) => {
  try { res.json(await getDockerHealth()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// Environment
router.get('/environment', async (_req, res) => {
  try { res.json(await getEnvironmentHealth()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// Cleanup
router.get('/cleanup', async (_req, res) => {
  try { res.json(await getCleanupAdvisor()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// Service Dependencies
router.get('/services/deps', async (_req, res) => {
  try { res.json(await getServiceDependencies()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// Scheduled Task Analysis
router.get('/tasks/analysis', async (_req, res) => {
  try { res.json(await getScheduledTaskAnalysis()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── UNIFIED ACTION CENTER (Aggregation) ────────────────────────────────────

router.get('/action-center', async (_req, res) => {
  try {
    const [security, wuStatus, drivers, apps, events] = await Promise.allSettled([
      getSecurityCenter(),
      getWindowsUpdateStatus(),
      getInstalledDrivers(),
      getAppUpdates(),
      getEventLogAnalysis(),
    ]);

    const val = (r) => r.status === 'fulfilled' ? r.value : null;
    const secData = val(security);
    const wuData = val(wuStatus);
    const drvData = val(drivers);
    const appData = val(apps);
    const evtData = val(events);

    const items = [];

    // Critical items
    if (secData && secData.defender?.enabled === false) {
      items.push({ severity: 'critical', category: 'Security', title: 'Microsoft Defender is disabled', action: 'Enable Defender', link: '/security' });
    }
    if (secData && secData.firewall?.domain === false) {
      items.push({ severity: 'critical', category: 'Security', title: 'Domain Firewall is disabled', action: 'Review firewall settings', link: '/security' });
    }
    if (wuData && wuData.rebootRequired) {
      items.push({ severity: 'critical', category: 'Updates', title: 'Restart required to complete updates', action: 'Schedule restart', link: '/updates' });
    }
    if (drvData && drvData.problems > 0) {
      items.push({ severity: 'high', category: 'Drivers', title: `${drvData.problems} driver(s) have problems`, action: 'Review problem drivers', link: '/drivers' });
    }

    // High priority
    if (wuData && wuData.pendingCount > 0) {
      const secUpdates = (wuData.pendingUpdates || []).filter(u => u.isSecurity).length;
      items.push({
        severity: secUpdates > 0 ? 'critical' : 'high',
        category: 'Updates',
        title: `${wuData.pendingCount} updates pending${secUpdates > 0 ? ` (${secUpdates} security)` : ''}`,
        action: 'Review and install updates',
        link: '/updates',
      });
    }
    if (appData && appData.wingetAvailable && appData.updateCount > 0) {
      items.push({ severity: 'medium', category: 'Applications', title: `${appData.updateCount} application updates available`, action: 'Update applications', link: '/apps/updates' });
    }

    // Events
    if (evtData && evtData.summary) {
      const critCount = evtData.summary.criticalCount || 0;
      const errCount = evtData.summary.errorCount || 0;
      if (critCount > 0) {
        items.push({ severity: 'high', category: 'Events', title: `${critCount} critical events in last 7 days`, action: 'Review event logs', link: '/events' });
      }
      if (errCount > 10) {
        items.push({ severity: 'medium', category: 'Events', title: `${errCount} error events in last 7 days`, action: 'Review event logs', link: '/events' });
      }
    }

    // Informational
    if (appData?.wingetAvailable === false) {
      items.push({ severity: 'info', category: 'Tools', title: 'winget is not installed', action: 'Install from https://aka.ms/getwinget', link: null });
    }

    const summary = {
      critical: items.filter(i => i.severity === 'critical').length,
      high: items.filter(i => i.severity === 'high').length,
      medium: items.filter(i => i.severity === 'medium').length,
      info: items.filter(i => i.severity === 'info').length,
    };

    res.json({
      platform: 'windows',
      summary,
      items: items.sort((a, b) => {
        const order = { critical: 0, high: 1, medium: 2, info: 3 };
        return (order[a.severity] || 99) - (order[b.severity] || 99);
      }),
      timestamp: new Date().toISOString(),
      measurement: 'observed',
      note: 'Action Center aggregates real probes. Each item links to evidence and remediation.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── MUTATING ENDPOINTS (Safe Mode Protected) ─────────────────────────────

/**
 * POST /snapshot/create — Create a system snapshot
 */
router.post('/snapshot/create', async (req, res) => {
  try { assertMutatingAllowed('windows.snapshot.create'); }
  catch (err) { return res.status(403).json({ code: err.code, error: err.message }); }

  const { confirmed, label } = req.body;
  if (confirmed !== true) return res.status(400).json({ error: 'Explicit confirmation required.' });

  if (!isWindows) return res.status(400).json({ platform: 'unsupported', error: 'Snapshots require Windows.' });

  try {
    const snapshot = await createSystemSnapshot();
    logAuditEntry({
      operation: `System Snapshot${label ? `: ${label}` : ''}`,
      commandId: 'win.snapshot.create',
      risk: 'safe',
      permissionLevel: 'Standard User',
      result: 'success',
      durationSeconds: 0,
      changesMade: ['Created system snapshot'],
    });
    res.json({ success: true, snapshot: snapshot.snapshot, label, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /cleanup/execute — Execute safe cleanup
 */
router.post('/cleanup/execute', async (req, res) => {
  try { assertMutatingAllowed('windows.cleanup.execute'); }
  catch (err) { return res.status(403).json({ code: err.code, error: err.message }); }

  const { confirmed, categories = [] } = req.body;
  if (confirmed !== true) return res.status(400).json({ error: 'Explicit confirmation required.' });
  if (!Array.isArray(categories) || categories.length === 0) {
    return res.status(400).json({ error: 'At least one category must be selected.' });
  }
  // SECURITY: Validate each category is a string (no objects, no injection)
  for (const cat of categories) {
    if (typeof cat !== 'string' || cat.length > 100) {
      return res.status(400).json({ error: 'VALIDATION_FAILED', message: 'Each category must be a string under 100 characters.' });
    }
  }

  const allowedCategories = ['Windows Temp', 'User Temp', 'Crash Dumps', 'Windows Update Cache'];
  for (const cat of categories) {
    if (!allowedCategories.includes(cat)) {
      return res.status(400).json({ error: `Category '${cat}' is not allowed for safe cleanup. Allowed: ${allowedCategories.join(', ')}` });
    }
  }

  if (!isWindows) return res.status(400).json({ platform: 'unsupported', error: 'Cleanup requires Windows.' });

  const { execFile } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(execFile);

  const results = [];
  for (const cat of categories) {
    try {
      let cmd, args;
      switch (cat) {
        case 'Windows Temp':
          cmd = 'powershell.exe';
          args = ['-NoProfile', '-Command', "Get-ChildItem $env:SystemRoot\\Temp -Recurse -ErrorAction SilentlyContinue | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue"];
          break;
        case 'User Temp':
          cmd = 'powershell.exe';
          args = ['-NoProfile', '-Command', "Get-ChildItem $env:TEMP -Recurse -ErrorAction SilentlyContinue | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue"];
          break;
        case 'Crash Dumps':
          cmd = 'powershell.exe';
          args = ['-NoProfile', '-Command', "Get-ChildItem $env:SystemRoot\\Minidump,$env:LOCALAPPDATA\\CrashDumps -File -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue"];
          break;
        case 'Windows Update Cache':
          cmd = 'powershell.exe';
          args = ['-NoProfile', '-Command', "Get-ChildItem $env:SystemRoot\\SoftwareDistribution\\Download -Recurse -ErrorAction SilentlyContinue | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue"];
          break;
        default:
          continue;
      }
      await execAsync(cmd, args, { timeout: 30000, windowsHide: true });
      results.push({ category: cat, success: true });
    } catch (err) {
      results.push({ category: cat, success: false, error: err.message?.slice(0, 200) });
    }
  }

  logAuditEntry({
    operation: `Cleanup: ${categories.join(', ')}`,
    commandId: 'win.cleanup.execute',
    risk: 'safe',
    permissionLevel: 'Standard User',
    result: results.every(r => r.success) ? 'success' : 'warning',
    durationSeconds: 0,
    changesMade: results.map(r => `${r.category}: ${r.success ? 'cleaned' : 'failed'}`),
  });

  res.json({
    success: results.every(r => r.success),
    results,
    cleaned: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /recovery/restore — Create a System Restore point
 */
router.post('/recovery/restore', async (req, res) => {
  try { assertMutatingAllowed('windows.recovery.restore'); }
  catch (err) { return res.status(403).json({ code: err.code, error: err.message }); }

  const { confirmed, description } = req.body;
  if (confirmed !== true) return res.status(400).json({ error: 'Explicit confirmation required.' });

  if (!isWindows) return res.status(400).json({ platform: 'unsupported', error: 'System Restore requires Windows.' });

  const safeDesc = (description || 'WinSuite Restore Point').replace(/[^a-zA-Z0-9 _-]/g, '').slice(0, 100);

  try {
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(execFile);
    await execAsync('powershell.exe', [
      '-NoProfile', '-Command',
      `Checkpoint-Computer -Description '${safeDesc}' -RestorePointType 'MODIFY_SETTINGS'`
    ], { timeout: 60000, windowsHide: true });

    logAuditEntry({
      operation: `Create Restore Point: ${safeDesc}`,
      commandId: 'win.recovery.restore',
      risk: 'moderate',
      permissionLevel: 'Administrator',
      result: 'success',
      durationSeconds: 0,
      changesMade: [`Created restore point: ${safeDesc}`],
    });

    res.json({ success: true, description: safeDesc, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /integrity/sfc — Run SFC scan
 */
router.post('/integrity/sfc', async (req, res) => {
  try { assertMutatingAllowed('windows.integrity.sfc'); }
  catch (err) { return res.status(403).json({ code: err.code, error: err.message }); }

  const { confirmed } = req.body;
  if (confirmed !== true) return res.status(400).json({ error: 'Explicit confirmation required.' });
  if (!isWindows) return res.status(400).json({ platform: 'unsupported', error: 'SFC requires Windows.' });

  try {
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(execFile);
    const startTime = Date.now();
    const { stdout } = await execAsync('powershell.exe', [
      '-NoProfile', '-Command', 'sfc /scannow'
    ], { timeout: 600000, windowsHide: true, maxBuffer: 5 * 1024 * 1024 });

    const duration = Math.round((Date.now() - startTime) / 1000);
    const output = stdout.slice(0, 2000);
    const noViolations = output.includes('did not find any integrity violations');
    const corruptFound = output.includes('found corrupt files');

    logAuditEntry({
      operation: 'SFC /scannow',
      commandId: 'win.integrity.sfc',
      risk: 'safe',
      permissionLevel: 'Administrator',
      result: corruptFound ? 'warning' : 'success',
      durationSeconds: duration,
      changesMade: [corruptFound ? 'Corrupt files detected' : noViolations ? 'No integrity violations' : 'Scan completed'],
    });

    res.json({ success: true, output, duration, noViolations, corruptFound, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /integrity/dism — Run DISM repair
 */
router.post('/integrity/dism', async (req, res) => {
  try { assertMutatingAllowed('windows.integrity.dism'); }
  catch (err) { return res.status(403).json({ code: err.code, error: err.message }); }

  const { confirmed, action = 'CheckHealth' } = req.body;
  if (confirmed !== true) return res.status(400).json({ error: 'Explicit confirmation required.' });
  if (!['CheckHealth', 'ScanHealth', 'RestoreHealth'].includes(action)) {
    return res.status(400).json({ error: 'Action must be CheckHealth, ScanHealth, or RestoreHealth.' });
  }
  if (!isWindows) return res.status(400).json({ platform: 'unsupported', error: 'DISM requires Windows.' });

  try {
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(execFile);
    const startTime = Date.now();
    const { stdout } = await execAsync('dism.exe', ['/Online', '/Cleanup-Image', `/${action}`], {
      timeout: action === 'RestoreHealth' ? 1800000 : 300000,
      windowsHide: true, maxBuffer: 5 * 1024 * 1024,
    });

    const duration = Math.round((Date.now() - startTime) / 1000);
    const output = stdout.slice(0, 2000);

    logAuditEntry({
      operation: `DISM /${action}`,
      commandId: `win.integrity.dism.${action.toLowerCase()}`,
      risk: action === 'RestoreHealth' ? 'moderate' : 'safe',
      permissionLevel: 'Administrator',
      result: 'success',
      durationSeconds: duration,
      changesMade: [`DISM /${action} completed`],
    });

    res.json({ success: true, action, output, duration, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /power/plan — Change power plan
 */
router.post('/power/plan', async (req, res) => {
  try { assertMutatingAllowed('windows.power.plan'); }
  catch (err) { return res.status(403).json({ code: err.code, error: err.message }); }

  const { confirmed, planGuid } = req.body;
  if (confirmed !== true) return res.status(400).json({ error: 'Explicit confirmation required.' });
  if (typeof planGuid !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(planGuid)) {
    return res.status(400).json({ error: 'Valid power plan GUID required.' });
  }
  if (!isWindows) return res.status(400).json({ platform: 'unsupported', error: 'Power plan management requires Windows.' });

  try {
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(execFile);
    await execAsync('powercfg', ['/setactive', planGuid], { timeout: 10000, windowsHide: true });

    logAuditEntry({
      operation: `Power Plan: ${planGuid}`,
      commandId: 'win.power.plan',
      risk: 'safe',
      permissionLevel: 'Standard User',
      result: 'success',
      durationSeconds: 0,
      changesMade: [`Activated power plan: ${planGuid}`],
    });

    res.json({ success: true, planGuid, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
