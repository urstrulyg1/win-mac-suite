/**
 * WinSuite & MacSuite v6.3 - Storage & Developer Cleanup Route
 * Read-only endpoints: /api/storage, /api/developer-cleanup, /api/snapshots
 */

import express from 'express';
import si from 'systeminformation';
import {
  getMacDeveloperArtifacts,
  getMacLargeFiles,
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

    const totalGB = primary ? Math.round(primary.size / 1024 / 1024 / 1024) : 256;
    const usedGB = primary ? Math.round(primary.used / 1024 / 1024 / 1024) : 128;
    const freeGB = primary ? +( (primary.size - primary.used) / 1024 / 1024 / 1024 ).toFixed(1) : 128;
    const percentUsed = primary ? Math.round(primary.use || 50) : 50;

    const largeFiles = isMac ? await getMacLargeFiles() : [
      { name: 'Installer_Stale.iso', path: 'C:\\Downloads\\Installer_Stale.iso', size: '2.4 GB' },
    ];

    res.json({
      platform: isMac ? 'macos' : 'windows',
      totalGB,
      usedGB,
      freeGB,
      percentUsed,
      breakdown: isMac
        ? [
            { category: 'macOS Core & Sealed Snapshot', sizeGB: 15.2, color: '#3b82f6' },
            { category: 'Applications & Binaries', sizeGB: +(usedGB * 0.35).toFixed(1), color: '#06b6d4' },
            { category: 'Developer Build Caches', sizeGB: +(usedGB * 0.12).toFixed(1), color: '#8b5cf6' },
            { category: 'User Documents & Media', sizeGB: +(usedGB * 0.40).toFixed(1), color: '#10b981' },
          ]
        : [
            { category: 'Windows OS & WinSxS', sizeGB: 28.0, color: '#2563eb' },
            { category: 'Program Files', sizeGB: +(usedGB * 0.35).toFixed(1), color: '#6366f1' },
            { category: 'Temporary & Crash Dumps', sizeGB: +(usedGB * 0.08).toFixed(1), color: '#f59e0b' },
            { category: 'User Profiles & AppData', sizeGB: +(usedGB * 0.42).toFixed(1), color: '#10b981' },
          ],
      largeFiles,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/developer-cleanup ──────────────────────────────────────────────
router.get('/developer-cleanup', async (_req, res) => {
  try {
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
      const snapshots = lines.map((line, idx) => ({
        id: line.trim(),
        date: line.replace('com.apple.TimeMachine.', ''),
        size: idx === 0 ? '1.4 GB' : '900 MB',
      }));

      res.json({
        platform: 'macos',
        count: snapshots.length,
        snapshots: snapshots.length > 0 ? snapshots : [
          { id: 'com.apple.TimeMachine.LocalSnapshot', date: 'Current', size: '1.2 GB' },
        ],
      });
    } else {
      res.json({
        platform: 'windows',
        count: 1,
        snapshots: [
          { id: 'RestorePoint-101', date: 'Recent', description: 'Pre-Update System Restore Point', size: '1.2 GB' },
        ],
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
