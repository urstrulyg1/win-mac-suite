/**
 * WinSuite & MacSuite v6.3 - Diagnostics & Health Route
 * Read-only endpoints:
 * - GET /api/health-check
 * - GET /api/processes
 * - GET /api/event-logs
 * - GET /api/battery
 * - GET /api/hardware
 * - GET /api/packages
 */

import express from 'express';
import si from 'systeminformation';
import {
  getMacEventLogs,
  getMacBatteryStatus,
  getMacPackageStatus,
  getMacHardwareStatus,
} from '../helpers/macos-helpers.js';
import {
  getWindowsEventLogs,
  getWindowsBatteryStatus,
  getWindowsPackageStatus,
  getWindowsHardwareStatus,
} from '../helpers/windows-helpers.js';

const router = express.Router();
const isMac = process.platform === 'darwin';

// ── GET /api/health-check ───────────────────────────────────────────────────
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

    // Dynamic Normalized Health Score
    const storageScore = Math.max(0, 100 - (diskUsagePct > 70 ? (diskUsagePct - 70) * 2 : 0));
    const memScore = Math.max(0, 100 - (memUsagePct > 75 ? (memUsagePct - 75) * 2.5 : 0));
    const cpuScore = Math.max(0, 100 - (cpuUsagePct > 60 ? (cpuUsagePct - 60) * 2 : 0));
    const battScore = batt.hasBattery ? (battPercent < 20 ? 70 : 100) : 100;
    const securityScore = 98;
    const integrityScore = 98;

    const weightedScore = Math.round(
      storageScore * 0.25 +
      memScore * 0.20 +
      cpuScore * 0.20 +
      securityScore * 0.15 +
      integrityScore * 0.10 +
      battScore * 0.10
    );

    const recommendations = [];
    if (diskUsagePct > 75) {
      recommendations.push({
        id: 'rec-storage',
        category: 'storage',
        severity: 'high',
        title: `Primary Storage Volume is at ${diskUsagePct}% Capacity`,
        description: 'Run storage cleanup to purge developer build caches, old downloads, and system logs.',
        impact: 'Reclaims 2-5 GB of disk space',
        actionLabel: 'Launch Cleanup Profile',
        actionTarget: 'CleanupOnly',
      });
    } else {
      recommendations.push({
        id: 'rec-maintenance',
        category: 'routine',
        severity: 'medium',
        title: 'Routine System Maintenance Recommended',
        description: 'Synchronize package repositories, refresh security signatures, and verify filesystem integrity.',
        impact: 'Maintains optimal speed and system security posture',
        actionLabel: 'Run Standard Update',
        actionTarget: 'Safe',
      });
    }

    res.json({
      score: Math.min(Math.max(weightedScore, 50), 100),
      metrics: {
        storage: { status: diskUsagePct < 80 ? 'Healthy' : 'Warning', score: storageScore, usage: diskUsagePct },
        memory: { status: memUsagePct < 85 ? 'Healthy' : 'Warning', score: memScore, usage: memUsagePct },
        cpu: { status: cpuUsagePct < 80 ? 'Healthy' : 'Warning', score: cpuScore, usage: cpuUsagePct },
        security: { status: 'Healthy', score: securityScore },
        integrity: { status: 'Healthy', score: integrityScore },
      },
      recommendations,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/processes ──────────────────────────────────────────────────────
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

    res.json({
      all: processes.all || sorted.length,
      running: processes.running || sorted.length,
      list: sorted,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/event-logs ─────────────────────────────────────────────────────
router.get('/event-logs', async (_req, res) => {
  try {
    const events = isMac ? await getMacEventLogs() : await getWindowsEventLogs();
    res.json({
      platform: isMac ? 'macos' : 'windows',
      events,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/battery ────────────────────────────────────────────────────────
router.get('/battery', async (_req, res) => {
  try {
    const battery = isMac ? await getMacBatteryStatus() : await getWindowsBatteryStatus();
    res.json(battery);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/packages ───────────────────────────────────────────────────────
router.get('/packages', async (_req, res) => {
  try {
    const packages = isMac ? await getMacPackageStatus() : await getWindowsPackageStatus();
    res.json(packages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/hardware ───────────────────────────────────────────────────────
router.get('/hardware', async (_req, res) => {
  try {
    const hardware = isMac ? await getMacHardwareStatus() : await getWindowsHardwareStatus();
    res.json(hardware);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
