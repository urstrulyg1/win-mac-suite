/**
 * WinSuite & MacSuite v6.3 - Services & Startup Items Route
 * Read-only endpoints: /api/services, /api/startup-items
 */

import express from 'express';
import { getWindowsServicesList, getWindowsStartupItems } from '../helpers/windows-helpers.js';
import { getMacServicesList, getMacStartupItems } from '../helpers/macos-helpers.js';

const router = express.Router();
const isMac = process.platform === 'darwin';
const isWin = process.platform === 'win32';

// ── GET /api/services ───────────────────────────────────────────────────────
router.get('/services', async (_req, res) => {
  try {
    if (!isMac && !isWin) {
      res.json({ platform: 'unsupported', count: 0, services: [] });
      return;
    }
    const services = isMac ? await getMacServicesList() : await getWindowsServicesList();
    res.json({
      platform: isMac ? 'macos' : 'windows',
      count: services.length,
      services,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/startup-items ──────────────────────────────────────────────────
router.get('/startup-items', async (_req, res) => {
  try {
    if (!isMac && !isWin) {
      res.json({ platform: 'unsupported', count: 0, list: [] });
      return;
    }
    const list = isMac ? await getMacStartupItems() : await getWindowsStartupItems();
    res.json({
      platform: isMac ? 'macos' : 'windows',
      count: list.length,
      list,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
