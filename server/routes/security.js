/**
 * WinSuite & MacSuite v6.5 - Security & Privacy Auditor Route
 * Endpoints:
 * - GET /api/security
 * - GET /api/security/posture
 * - GET /api/security/privacy-auditor
 * - GET /api/privacy
 * - GET /api/privacy/auditor
 * - GET /api/privacy/score
 */

import express from 'express';
import { getWindowsSecurityStatus } from '../helpers/windows-helpers.js';
import {
  getMacSecurityStatus,
  getMacSecurityPosture,
  getMacFullPrivacyAuditor,
} from '../helpers/macos-helpers.js';

const router = express.Router();
const isMac = process.platform === 'darwin';

// ── GET /api/security ───────────────────────────────────────────────────────
router.get('/security', async (_req, res) => {
  try {
    if (isMac) {
      const macSec = await getMacSecurityStatus();
      res.json({ platform: 'macos', ...macSec });
    } else if (process.platform === 'win32') {
      const winSec = await getWindowsSecurityStatus();
      res.json({ platform: 'windows', ...winSec });
    } else {
      res.json({ platform: 'unsupported', available: false, reason: 'Security status is macOS/Windows-only.' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/security/posture ───────────────────────────────────────────────
router.get('/security/posture', async (_req, res) => {
  try {
    if (!isMac) {
      res.json({ available: false, reason: 'Security posture is only measurable on macOS.' });
      return;
    }
    const posture = await getMacSecurityPosture();
    res.json(posture);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/privacy & /api/privacy/auditor & /api/security/privacy-auditor ──
const handlePrivacyAuditor = async (_req, res) => {
  try {
    if (!isMac) {
      res.json({ available: false, reason: 'Privacy audit is only measurable on macOS.' });
      return;
    }
    const privacy = await getMacFullPrivacyAuditor();
    res.json(privacy);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

router.get('/privacy', handlePrivacyAuditor);
router.get('/privacy/auditor', handlePrivacyAuditor);
router.get('/security/privacy-auditor', handlePrivacyAuditor);

// ── GET /api/privacy/score ─────────────────────────────────────────────────
router.get('/privacy/score', async (_req, res) => {
  try {
    if (!isMac) {
      res.json({ available: false, reason: 'Privacy score is only measurable on macOS.' });
      return;
    }
    const auditor = await getMacFullPrivacyAuditor();
    res.json(auditor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
