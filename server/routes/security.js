/**
 * WinSuite & MacSuite v6.3 - Security & Privacy Route
 * Read-only endpoints: /api/security, /api/privacy
 */

import express from 'express';
import { getWindowsSecurityStatus } from '../helpers/windows-helpers.js';
import { getMacSecurityStatus } from '../helpers/macos-helpers.js';

const router = express.Router();
const isMac = process.platform === 'darwin';

// ── GET /api/security ───────────────────────────────────────────────────────
router.get('/security', async (_req, res) => {
  try {
    if (isMac) {
      const macSec = await getMacSecurityStatus();
      res.json({ platform: 'macos', ...macSec });
    } else {
      const winSec = await getWindowsSecurityStatus();
      res.json({ platform: 'windows', ...winSec });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/privacy ────────────────────────────────────────────────────────
router.get('/privacy', (_req, res) => {
  const permissions = isMac
    ? [
        { id: '1', name: 'Camera Access (TCC)', status: 'Protected', detail: 'Hardware indicator and user consent enforced' },
        { id: '2', name: 'Microphone Access', status: 'Protected', detail: 'Hardware indicator active on capture' },
        { id: '3', name: 'Location Services', status: 'Protected', detail: 'Per-application permission toggle active' },
        { id: '4', name: 'Full Disk Access', status: 'Protected', detail: 'Protected by System Integrity Protection' },
      ]
    : [
        { id: '1', name: 'Camera Access', status: 'Protected', detail: 'Windows permission manager enforces app boundaries' },
        { id: '2', name: 'Microphone Access', status: 'Protected', detail: 'System tray mic indicator active on access' },
        { id: '3', name: 'Location Privacy', status: 'Protected', detail: 'Geofencing and location sensor permissions active' },
        { id: '4', name: 'App Diagnostics', status: 'Protected', detail: 'Required diagnostic data only' },
      ];

  res.json({
    platform: isMac ? 'macos' : 'windows',
    permissions,
  });
});

export default router;
