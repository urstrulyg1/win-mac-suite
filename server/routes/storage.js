/**
 * WinSuite & MacSuite v6.5 - Storage & Intelligence Route
 * Endpoints:
 * - GET /api/storage
 * - GET /api/storage/system-data
 * - GET /api/storage/docker
 * - GET /api/storage/xcode
 * - GET /api/storage/ios-backups
 * - GET /api/storage/orphaned-leftovers
 * - GET /api/storage/external-drives
 * - GET /api/developer-cleanup
 * - GET /api/snapshots
 */

import express from 'express';
import si from 'systeminformation';
import {
  getMacDeveloperArtifacts,
  getMacLargeFiles,
  getMacSystemDataBreakdown,
  getMacDockerStorage,
  getMacXcodeDoctor,
  getMacIosBackups,
  getMacOrphanedLeftovers,
  getMacExternalDrives,
  runSafeCommand,
} from '../helpers/macos-helpers.js';
import {
  getWindowsDeveloperArtifacts,
} from '../helpers/windows-helpers.js';

const router = express.Router();
const isMac = process.platform === 'darwin';

// ── GET /api/storage ────────────────────────────────────────────────────────
router.get('/storage', async (_req, res) => {
  try {
    const fsSize = await si.fsSize();
    const primary = Array.isArray(fsSize)
      ? fsSize.find((f) => f.mount === '/System/Volumes/Data' || f.mount === '/' || f.mount === 'C:') || fsSize[0]
      : null;

    const totalGB = primary ? Math.round(primary.size / 1024 / 1024 / 1024) : null;
    const usedGB = primary ? Math.round(primary.used / 1024 / 1024 / 1024) : null;
    const freeGB = primary ? +( (primary.size - primary.used) / 1024 / 1024 / 1024 ).toFixed(1) : null;
    const percentUsed = primary ? Math.round(primary.use || 0) : null;

    // Real breakdown and large files from macOS telemetry (never estimated ratios).
    let breakdown = null;
    let largeFiles = [];
    if (isMac) {
      const [sysData, macLarge] = await Promise.all([
        getMacSystemDataBreakdown().catch(() => null),
        getMacLargeFiles().catch(() => []),
      ]);
      breakdown = sysData && Array.isArray(sysData.categories) ? sysData.categories : null;
      largeFiles = macLarge;
    }

    res.json({
      platform: isMac ? 'macos' : 'unsupported',
      totalGB,
      usedGB,
      freeGB,
      percentUsed,
      breakdown,
      largeFiles,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/storage/system-data ───────────────────────────────────────────
router.get('/storage/system-data', async (_req, res) => {
  try {
    if (isMac) {
      const breakdown = await getMacSystemDataBreakdown();
      res.json(breakdown);
    } else {
      res.json({
        platform: 'unsupported',
        available: false,
        reason: 'System Data breakdown is only measurable on macOS.',
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/storage/docker ────────────────────────────────────────────────
router.get('/storage/docker', async (_req, res) => {
  try {
    if (!isMac) { res.json({ available: false, reason: 'Docker storage is only measurable on macOS.' }); return; }
    const dockerInfo = await getMacDockerStorage();
    res.json(dockerInfo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/storage/xcode ─────────────────────────────────────────────────
router.get('/storage/xcode', async (_req, res) => {
  try {
    if (!isMac) { res.json({ available: false, reason: 'Xcode storage is only measurable on macOS.' }); return; }
    const xcodeInfo = await getMacXcodeDoctor();
    res.json(xcodeInfo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/storage/ios-backups ───────────────────────────────────────────
router.get('/storage/ios-backups', async (_req, res) => {
  try {
    if (!isMac) { res.json({ available: false, reason: 'iOS backups are only measurable on macOS.' }); return; }
    const backups = await getMacIosBackups();
    res.json(backups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/storage/orphaned-leftovers ────────────────────────────────────
router.get('/storage/orphaned-leftovers', async (_req, res) => {
  try {
    if (!isMac) { res.json({ available: false, reason: 'Orphaned leftovers are only measurable on macOS.' }); return; }
    const leftovers = await getMacOrphanedLeftovers();
    res.json({ count: leftovers.length, leftovers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/storage/external-drives ───────────────────────────────────────
router.get('/storage/external-drives', async (_req, res) => {
  try {
    if (!isMac) { res.json({ available: false, reason: 'External drives are only measurable on macOS.' }); return; }
    const drives = await getMacExternalDrives();
    res.json({ count: drives.length, drives });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/developer-cleanup ──────────────────────────────────────────────
router.get('/developer-cleanup', async (_req, res) => {
  try {
    if (!isMac && process.platform !== 'win32') {
      res.json({ platform: 'unsupported', available: false, artifacts: [] });
      return;
    }
    const artifacts = isMac
      ? await getMacDeveloperArtifacts()
      : await getWindowsDeveloperArtifacts();

    res.json({
      platform: isMac ? 'macos' : 'windows',
      artifacts,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/snapshots ──────────────────────────────────────────────────────
router.get('/snapshots', async (_req, res) => {
  try {
    if (isMac) {
      const tmOut = await runSafeCommand('/usr/bin/tmutil', ['listlocalsnapshots', '/']);
      const lines = tmOut ? tmOut.split('\n').filter((l) => l.includes('com.apple.TimeMachine')) : [];
      // tmutil does not report per-snapshot sizes; report the ID honestly without inventing a size.
      const snapshots = lines.map((line) => ({
        id: line.trim(),
        date: line.replace('com.apple.TimeMachine.', ''),
        size: 'Unavailable',
      }));

      res.json({
        platform: 'macos',
        count: snapshots.length,
        snapshots,
      });
    } else {
      res.json({
        platform: 'unsupported',
        count: 0,
        snapshots: [],
        available: false,
        reason: 'Local snapshots are only queryable on macOS.',
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
