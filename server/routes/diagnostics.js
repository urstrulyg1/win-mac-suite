/**
 * WinSuite & MacSuite v8.0 - Comprehensive Diagnostics, Health & Diagnostic Doctors Route
 */

import express from 'express';
import si from 'systeminformation';
import {
  getMacSecurityPosture,
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
  getWindowsPackageStatus,
  getWindowsHardwareStatus,
} from '../helpers/windows-helpers.js';

const router = express.Router();
const isMac = process.platform === 'darwin';

// Honest "not measurable here" payload. Never fabricate a healthy-looking value.
function macOnly(reason) {
  return { available: false, reason };
}

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
      thermalLevel: (isMac ? (await getMacThermalDeep().catch(() => null))?.thermalLevel ?? 'Unknown' : 'Unknown'),
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
      si.battery().catch(() => ({ hasBattery: false, percent: null })),
    ]);

    const dataMount = Array.isArray(fsSize)
      ? fsSize.find((f) => f.mount === '/System/Volumes/Data' || f.mount === '/' || f.mount === 'C:') || fsSize[0]
      : null;

    // Every metric is either a real reading or `null` (Unavailable). No fabricated defaults.
    const diskUsagePct = dataMount ? Math.round(dataMount.use || 0) : null;
    const memUsagePct = mem.total > 0 ? Math.round((mem.active / mem.total) * 100) : null;
    const cpuUsagePct = currentLoad.currentLoad != null ? Math.round(currentLoad.currentLoad) : null;
    const battPercent = batt.hasBattery && batt.percent != null ? batt.percent : null;

    const storageScore = diskUsagePct == null ? null : Math.max(0, 100 - (diskUsagePct > 70 ? (diskUsagePct - 70) * 2 : 0));
    const memScore = memUsagePct == null ? null : Math.max(0, 100 - (memUsagePct > 75 ? (memUsagePct - 75) * 2.5 : 0));
    const cpuScore = cpuUsagePct == null ? null : Math.max(0, 100 - (cpuUsagePct > 60 ? (cpuUsagePct - 60) * 2 : 0));
    const battScore = battPercent == null ? null : (battPercent < 20 ? 70 : 100);

    // Security & integrity are probed from the real system, macOS only.
    let securityScore = null;
    let integrityScore = null;
    if (isMac) {
      try {
        const posture = await getMacSecurityPosture();
        securityScore = posture?.securityScore ?? null;
        const sip = (posture?.checks || []).find((c) => /System Integrity Protection/i.test(c?.name || ''));
        integrityScore = sip ? (sip.passed ? 100 : 40) : null;
      } catch {
        securityScore = null;
        integrityScore = null;
      }
    }

    // Weighted score is renormalised over whatever metrics are actually available,
    // so missing telemetry never silently inflates or fabricates the result.
    const parts = [];
    if (storageScore != null) parts.push([storageScore, 0.30]);
    if (memScore != null) parts.push([memScore, 0.25]);
    if (cpuScore != null) parts.push([cpuScore, 0.25]);
    if (securityScore != null) parts.push([securityScore, 0.20]);
    if (battScore != null) parts.push([battScore, 0.10]);
    const totalWeight = parts.reduce((sum, [, w]) => sum + w, 0);
    const score = totalWeight > 0
      ? Math.round(parts.reduce((sum, [v, w]) => sum + v * (w / totalWeight), 0))
      : null;

    res.json({
      score,
      available: totalWeight > 0,
      metrics: {
        storage: diskUsagePct == null ? { status: 'Unavailable', score: null, usage: null } : { status: diskUsagePct < 80 ? 'Healthy' : 'Warning', score: storageScore, usage: diskUsagePct },
        memory: memUsagePct == null ? { status: 'Unavailable', score: null, usage: null } : { status: memUsagePct < 85 ? 'Healthy' : 'Warning', score: memScore, usage: memUsagePct },
        cpu: cpuUsagePct == null ? { status: 'Unavailable', score: null, usage: null } : { status: cpuUsagePct < 80 ? 'Healthy' : 'Warning', score: cpuScore, usage: cpuUsagePct },
        security: securityScore == null ? { status: 'Unavailable', score: null } : { status: securityScore >= 80 ? 'Healthy' : 'Warning', score: securityScore },
        integrity: integrityScore == null ? { status: 'Unavailable', score: null } : { status: integrityScore >= 80 ? 'Healthy' : 'Warning', score: integrityScore },
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/performance/diagnosis', async (_req, res) => {
  try {
    const diag = isMac ? await getMacPerformanceDiagnosis() : macOnly('Performance diagnosis is macOS-only.');
    res.json(diag);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/thermal/deep', async (_req, res) => {
  try {
    const thermal = isMac ? await getMacThermalDeep() : macOnly('Thermal telemetry is macOS-only.');
    res.json(thermal);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/battery/intelligence', async (_req, res) => {
  try {
    const bIntel = isMac ? await getMacBatteryIntelligence() : macOnly('Battery intelligence is macOS-only.');
    res.json(bIntel);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/diagnostics/update-doctor', async (_req, res) => {
  try {
    res.json(isMac ? await getMacUpdateDoctor() : macOnly('Software update checks are macOS-only.'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/diagnostics/disk-health', async (_req, res) => {
  try {
    res.json(isMac ? await getMacDiskHealth() : macOnly('Disk health is macOS-only.'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/diagnostics/crashes-hangs', async (_req, res) => {
  try {
    res.json(isMac ? await getMacCrashHangIntelligence() : macOnly('Crash/hang diagnostics are macOS-only.'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/diagnostics/system-stability', async (_req, res) => {
  try {
    res.json(isMac ? await getMacSystemStability() : macOnly('System stability is macOS-only.'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/diagnostics/spotlight-doctor', async (_req, res) => {
  try {
    res.json(isMac ? await getMacSpotlightDoctor() : macOnly('Spotlight status is macOS-only.'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/diagnostics/time-machine', async (_req, res) => {
  try {
    res.json(isMac ? await getMacTimeMachineDoctor() : macOnly('Time Machine is macOS-only.'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/diagnostics/icloud', async (_req, res) => {
  try {
    res.json(isMac ? await getMacICloudDiagnostics() : macOnly('iCloud diagnostics are macOS-only.'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/diagnostics/apple-services', async (_req, res) => {
  try {
    res.json(isMac ? await getMacAppleServicesHealth() : macOnly('Apple services health is macOS-only.'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/diagnostics/audio', async (_req, res) => {
  try {
    res.json(isMac ? await getMacAudioDoctor() : macOnly('Audio diagnostics are macOS-only.'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/diagnostics/camera-mic', async (_req, res) => {
  try {
    res.json(isMac ? await getMacCameraMicDoctor() : macOnly('Camera/mic diagnostics are macOS-only.'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/diagnostics/displays', async (_req, res) => {
  try {
    res.json(isMac ? await getMacDisplayDoctor() : macOnly('Display diagnostics are macOS-only.'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/diagnostics/peripherals', async (_req, res) => {
  try {
    res.json(isMac ? await getMacPeripheralDoctor() : macOnly('Peripheral diagnostics are macOS-only.'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/diagnostics/finder-clipboard', async (_req, res) => {
  try {
    res.json(isMac ? await getMacFinderClipboardDoctor() : macOnly('Finder diagnostics are macOS-only.'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/diagnostics/ssh-doctor', async (_req, res) => {
  try {
    res.json(isMac ? await getMacSshDoctor() : macOnly('SSH diagnostics are macOS-only.'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/diagnostics/virtualization', async (_req, res) => {
  try {
    res.json(isMac ? await getMacVirtualizationDoctor() : macOnly('Virtualization diagnostics are macOS-only.'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/diagnostics/browser-health', async (_req, res) => {
  try {
    res.json(isMac ? await getMacBrowserHealth() : macOnly('Browser health is macOS-only.'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/diagnostics/app-resource', async (req, res) => {
  try {
    res.json(isMac ? await getMacAppResourceDoctor(req.query.appName || 'Google Chrome') : macOnly('App resource usage is macOS-only.'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/diagnostics/system-timeline', async (_req, res) => {
  try {
    res.json(isMac ? await getMacSystemEventsTimeline() : macOnly('System event timeline is macOS-only.'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/diagnostics/baseline-diff', async (_req, res) => {
  try {
    res.json(isMac ? await getMacBaselineDiff() : macOnly('Baseline diff is macOS-only.'));
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
    res.json(isMac ? await getMacSpotlightStatus() : macOnly('Spotlight status is macOS-only.'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/power-assertions', async (_req, res) => {
  try {
    res.json(isMac ? await getMacPowerAssertions() : macOnly('Power assertions are macOS-only.'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/diagnostics/app-compatibility/:appName', async (req, res) => {
  try {
    res.json(isMac ? await getMacAppCompatibility(req.params.appName) : macOnly('App compatibility is macOS-only.'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/troubleshoot/:issueId', async (req, res) => {
  try {
    res.json(isMac ? await getMacTroubleshootGuide(req.params.issueId) : macOnly('Troubleshoot guides are macOS-only.'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
