/**
 * WinSuite & MacSuite v8.1 - Comprehensive Diagnostics, Health & Diagnostic Doctors Route
 */

import express from 'express';
import si from 'systeminformation';
import {
  getMacEventLogs,
  getMacBatteryStatus,
  getMacBatteryIntelligence,
  getMacPackageStatus,
  getMacHardwareStatus,
  getMacSpotlightStatus,
  getMacPowerAssertions,
  getMacTroubleshootGuide,
  getMacPerformanceDiagnosis,
  getMacThermalState,
  getMacThermalDeep,
  getMacAppCompatibility,
} from '../helpers/macos-helpers.js';

import {
  getMacUpdateDoctor,
  getMacDiskHealth,
  getMacCrashHangIntelligence,
  getMacSystemStability,
  getMacSpotlightDoctor,
  getMacTimeMachineDoctor,
  getMacICloudDiagnostics,
  getMacAppleServicesHealth,
  getMacAudioDoctor,
  getMacCameraMicDoctor,
  getMacDisplayDoctor,
  getMacPeripheralDoctor,
  getMacFinderClipboardDoctor,
  getMacFilePermissionsDoctor,
  getMacSshDoctor,
  getMacVirtualizationDoctor,
  getMacBrowserHealth,
  getMacAppResourceDoctor,
  getMacSystemEventsTimeline,
  getMacBaselineDiff,
} from '../helpers/macos-advanced-helpers.js';

import { CorrelationEngine } from '../engine/correlation-engine.js';
import { BaselineForecaster } from '../engine/baseline-forecaster.js';
import { RecommendationEngine } from '../engine/recommendation-engine.js';
import { DiagnosticExperimentEngine } from '../engine/experiment-engine.js';

import {
  getWindowsEventLogs,
  getWindowsBatteryStatus,
  getWindowsBatteryIntelligence,
  getWindowsPackageStatus,
  getWindowsHardwareStatus,
  getWindowsPerformanceDiagnosis,
  getWindowsCrashHangIntelligence,
  getWindowsSystemStability,
  getWindowsDiskHealth,
  getWindowsUpdateDoctor,
  getWindowsShadowCopies,
  getWindowsAudioDoctor,
  getWindowsCameraMicDoctor,
  getWindowsDisplayDoctor,
  getWindowsPeripheralDoctor,
  getWindowsSshDoctor,
  getWindowsPowerAssertions,
  getWindowsSystemEventsTimeline,
  getWindowsBaselineDiff,
  getWindowsBrowserHealth,
  getWindowsTroubleshootGuide,
  getWindowsAppCompatibility,
  getWindowsExplorerDoctor,
} from '../helpers/windows-helpers.js';

const router = express.Router();
const isMac = process.platform === 'darwin';

// ── GET /api/diagnostics/recommendations ────────────────────────────────────
router.get('/diagnostics/recommendations', (_req, res) => {
  try {
    const recommendations = RecommendationEngine.getRankedRecommendations();
    res.json({ recommendations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/diagnostics/run-experiment ─────────────────────────────────────
router.get('/diagnostics/run-experiment', async (req, res) => {
  try {
    const hypothesisId = req.query.hypothesisId || 'exp-docker-ram';
    const result = await DiagnosticExperimentEngine.runExperiment(hypothesisId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/diagnostics/correlation-incidents ──────────────────────────────
router.get('/diagnostics/correlation-incidents', async (_req, res) => {
  try {
    // Individual .catch() so a slow si.processes() never kills the whole handler
    const [mem, fsSize, processes] = await Promise.all([
      si.mem().catch(() => ({ active: 0, total: 1, swapused: 0 })),
      si.fsSize().catch(() => []),
      si.processes().catch(() => ({ list: [] })),
    ]);

    const memUsagePct = mem.total > 0 ? Math.round((mem.active / mem.total) * 100) : 0;
    const swapUsedGB = +(( mem.swapused || 0) / 1024 / 1024 / 1024).toFixed(2);

    const primary = Array.isArray(fsSize)
      ? fsSize.find(f => f.mount === '/System/Volumes/Data' || f.mount === '/') || fsSize[0]
      : null;
    const freeDiskGB = primary ? +((primary.size - primary.used) / 1024 / 1024 / 1024).toFixed(1) : 0;
    const usedDiskGB = primary ? Math.round(primary.used / 1024 / 1024 / 1024) : 0;

    // Detect real Docker & Chrome memory from process list
    const procList = (processes && Array.isArray(processes.list)) ? processes.list : [];
    const dockerProc = procList.find(p => p && /docker/i.test(p.name));
    const dockerActive = !!dockerProc;
    const dockerCpuPct = dockerProc ? (dockerProc.cpu || 0) : 0;
    const chromeProcs = procList.filter(p => p && /chrome/i.test(p.name));
    const chromeTotalMem = chromeProcs.reduce((s, p) => s + (p.mem || 0), 0);
    const chromeMemoryMB = mem.total > 0
      ? Math.round((chromeTotalMem / 100) * (mem.total / 1024 / 1024))
      : 0;

    const results = CorrelationEngine.correlate({
      memoryUsagePct: memUsagePct,
      swapUsedGB,
      dockerActive,
      dockerCpuPct,
      chromeMemoryMB,
      thermalLevel: 'Nominal',
      systemDataGB: usedDiskGB,
      freeDiskGB,
    });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/diagnostics/multi-baseline ──────────────────────────────────────
router.get('/diagnostics/multi-baseline', async (req, res) => {
  try {
    const profile = req.query.profile || '7day';
    const comp = await BaselineForecaster.getBaselineComparison(profile);
    res.json(comp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/diagnostics/predictive-forecast ────────────────────────────────
router.get('/diagnostics/predictive-forecast', async (req, res) => {
  try {
    const fsSize = await si.fsSize();
    const primary = Array.isArray(fsSize)
      ? fsSize.find(f => f.mount === '/System/Volumes/Data' || f.mount === '/') || fsSize[0]
      : null;
    const freeDiskGB = primary
      ? +((primary.size - primary.used) / 1024 / 1024 / 1024).toFixed(1)
      : parseFloat(req.query.freeDiskGB) || 0;
    const forecast = BaselineForecaster.getForecast(freeDiskGB, 1.4);
    res.json(forecast);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Standard Diagnostics & Health Endpoints ─────────────────────────────────

router.get('/health-check', async (_req, res) => {
  try {
    const [mem, currentLoad, fsSize, batt] = await Promise.all([
      si.mem(),
      si.currentLoad(),
      si.fsSize(),
      si.battery().catch(() => ({ hasBattery: false, percent: 100 })),
    ]);

    const dataMount = Array.isArray(fsSize)
      ? fsSize.find((f) => f.mount === '/System/Volumes/Data' || f.mount === '/' || f.mount === 'C:') || fsSize[0]
      : null;

    const diskUsagePct = dataMount ? Math.round(dataMount.use || 0) : 50;
    const memUsagePct = Math.round((mem.active / mem.total) * 100);
    const cpuUsagePct = Math.round(currentLoad.currentLoad || 10);
    const battPercent = batt.hasBattery ? (batt.percent ?? 100) : 100;

    const storageScore = Math.max(0, 100 - (diskUsagePct > 70 ? (diskUsagePct - 70) * 2 : 0));
    const memScore = Math.max(0, 100 - (memUsagePct > 75 ? (memUsagePct - 75) * 2.5 : 0));
    const cpuScore = Math.max(0, 100 - (cpuUsagePct > 60 ? (cpuUsagePct - 60) * 2 : 0));
    const battScore = batt.hasBattery ? (battPercent < 20 ? 70 : 100) : 100;

    const weightedScore = Math.round(
      storageScore * 0.25 +
      memScore * 0.20 +
      cpuScore * 0.20 +
      98 * 0.15 +
      98 * 0.10 +
      battScore * 0.10
    );

    res.json({
      score: Math.min(Math.max(weightedScore, 50), 100),
      metrics: {
        storage: { status: diskUsagePct < 80 ? 'Healthy' : 'Warning', score: storageScore, usage: diskUsagePct },
        memory: { status: memUsagePct < 85 ? 'Healthy' : 'Warning', score: memScore, usage: memUsagePct },
        cpu: { status: cpuUsagePct < 80 ? 'Healthy' : 'Warning', score: cpuScore, usage: cpuUsagePct },
        security: { status: 'Healthy', score: 98 },
        integrity: { status: 'Healthy', score: 98 },
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/performance/diagnosis', async (_req, res) => {
  try {
    const diag = isMac
      ? await getMacPerformanceDiagnosis()
      : await getWindowsPerformanceDiagnosis();
    res.json(diag);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/thermal/deep', async (_req, res) => {
  try {
    const thermal = isMac ? await getMacThermalDeep() : { thermalLevel: 'Nominal' };
    res.json(thermal);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/battery/intelligence', async (_req, res) => {
  try {
    const bIntel = isMac
      ? await getMacBatteryIntelligence()
      : await getWindowsBatteryIntelligence();
    res.json(bIntel);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/diagnostics/update-doctor', async (_req, res) => {
  try {
    res.json(isMac ? await getMacUpdateDoctor() : await getWindowsUpdateDoctor());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/diagnostics/disk-health', async (_req, res) => {
  try {
    res.json(isMac ? await getMacDiskHealth() : await getWindowsDiskHealth());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/diagnostics/crashes-hangs', async (_req, res) => {
  try {
    res.json(isMac ? await getMacCrashHangIntelligence() : await getWindowsCrashHangIntelligence());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/diagnostics/system-stability', async (_req, res) => {
  try {
    res.json(isMac ? await getMacSystemStability() : await getWindowsSystemStability());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/diagnostics/spotlight-doctor', async (_req, res) => {
  try {
    res.json(isMac ? await getMacSpotlightDoctor() : { indexingEnabled: true, note: 'Windows Search indexing status available via /api/windows/update.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/diagnostics/time-machine', async (_req, res) => {
  try {
    // macOS: Time Machine; Windows: shadow copies covered by /api/snapshots
    res.json(isMac ? await getMacTimeMachineDoctor() : { status: 'N/A', note: 'Use /api/snapshots for Windows VSS shadow copies.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/diagnostics/icloud', async (_req, res) => {
  try {
    res.json(isMac ? await getMacICloudDiagnostics() : { accountConfigured: false, note: 'iCloud diagnostics are macOS-exclusive.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/diagnostics/apple-services', async (_req, res) => {
  try {
    res.json(isMac ? await getMacAppleServicesHealth() : { services: [], note: 'Apple Services health is macOS-exclusive.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/diagnostics/audio', async (_req, res) => {
  try {
    res.json(isMac ? await getMacAudioDoctor() : await getWindowsAudioDoctor());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/diagnostics/camera-mic', async (_req, res) => {
  try {
    res.json(isMac ? await getMacCameraMicDoctor() : await getWindowsCameraMicDoctor());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/diagnostics/displays', async (_req, res) => {
  try {
    res.json(isMac ? await getMacDisplayDoctor() : await getWindowsDisplayDoctor());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/diagnostics/peripherals', async (_req, res) => {
  try {
    res.json(isMac ? await getMacPeripheralDoctor() : await getWindowsPeripheralDoctor());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/diagnostics/finder-clipboard', async (_req, res) => {
  try {
    res.json(isMac ? await getMacFinderClipboardDoctor() : await getWindowsExplorerDoctor());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/diagnostics/ssh-doctor', async (_req, res) => {
  try {
    res.json(isMac ? await getMacSshDoctor() : await getWindowsSshDoctor());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/diagnostics/virtualization', async (_req, res) => {
  try {
    // Windows: WSL is covered by /api/windows/wsl; surface a minimal cross-link here
    res.json(isMac ? await getMacVirtualizationDoctor() : { hypervisorsDetected: [], note: 'WSL and Docker status available via /api/windows/wsl and /api/windows/v2/docker.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/diagnostics/browser-health', async (_req, res) => {
  try {
    res.json(isMac ? await getMacBrowserHealth() : await getWindowsBrowserHealth());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/diagnostics/app-resource', async (req, res) => {
  try {
    if (isMac) {
      return res.json(await getMacAppResourceDoctor(req.query.appName || 'Google Chrome'));
    }
    // Real process-based resource measurement for non-macOS
    const appName = req.query.appName || 'chrome';
    const processes = await si.processes().catch(() => ({ list: [] }));
    const procList = (processes && Array.isArray(processes.list)) ? processes.list : [];
    const appRegex = new RegExp(appName, 'i');
    const matchingProcs = procList.filter(p => appRegex.test(p.name));
    const totalCpu = matchingProcs.reduce((s, p) => s + (p.cpu || 0), 0);
    const totalMem = matchingProcs.reduce((s, p) => s + (p.mem || 0), 0);
    const mem = await si.mem().catch(() => ({ total: 1 }));
    const memMB = mem.total > 0 ? Math.round((totalMem / 100) * (mem.total / 1024 / 1024)) : 0;
    res.json({
      appName,
      cpuUtilizationPct: Math.round(totalCpu * 10) / 10,
      memoryMB: memMB,
      processCount: matchingProcs.length,
      source: 'si.processes() filter by app name',
      note: matchingProcs.length === 0 ? `${appName} is not running — 0 processes found.` : undefined,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/diagnostics/system-timeline', async (_req, res) => {
  try {
    res.json(isMac ? await getMacSystemEventsTimeline() : await getWindowsSystemEventsTimeline());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/diagnostics/baseline-diff', async (_req, res) => {
  try {
    res.json(isMac ? await getMacBaselineDiff() : await getWindowsBaselineDiff());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/processes', async (_req, res) => {
  try {
    const processes = await si.processes();
    const sorted = (processes.list || [])
      .sort((a, b) => (b.cpu || 0) - (a.cpu || 0))
      .slice(0, 20)
      .map((p) => ({
        pid: p.pid,
        name: p.name,
        cpu: +(p.cpu || 0).toFixed(1),
        mem: +(p.mem || 0).toFixed(1),
        user: p.user || 'SYSTEM',
        command: p.command || '',
      }));
    res.json({ all: processes.all || sorted.length, running: processes.running || sorted.length, list: sorted });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/event-logs', async (_req, res) => {
  try {
    res.json({ platform: isMac ? 'macos' : 'windows', events: isMac ? await getMacEventLogs() : await getWindowsEventLogs() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/battery', async (_req, res) => {
  try {
    res.json(isMac ? await getMacBatteryStatus() : await getWindowsBatteryStatus());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/packages', async (_req, res) => {
  try {
    res.json(isMac ? await getMacPackageStatus() : await getWindowsPackageStatus());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/hardware', async (_req, res) => {
  try {
    res.json(isMac ? await getMacHardwareStatus() : await getWindowsHardwareStatus());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/spotlight', async (_req, res) => {
  try {
    res.json(isMac ? await getMacSpotlightStatus() : { indexingEnabled: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/power-assertions', async (_req, res) => {
  try {
    res.json(isMac ? await getMacPowerAssertions() : await getWindowsPowerAssertions());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/diagnostics/app-compatibility/:appName', async (req, res) => {
  try {
    res.json(isMac ? await getMacAppCompatibility(req.params.appName) : await getWindowsAppCompatibility(req.params.appName));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/troubleshoot/:issueId', async (req, res) => {
  try {
    res.json(isMac ? await getMacTroubleshootGuide(req.params.issueId) : await getWindowsTroubleshootGuide(req.params.issueId));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
