/**
 * WinSuite & MacSuite v11.2 - Security & Privacy Auditor Route
 * Endpoints:
 * - GET /api/security
 * - GET /api/security/posture
 * - GET /api/security/privacy-auditor
 * - GET /api/privacy
 * - GET /api/privacy/auditor
 * - GET /api/privacy/score
 * - GET /api/security/privacy-risk   (macOS — privacy risk score)
 */

import express from 'express';
import {
  getWindowsSecurityStatus,
  getWindowsPrivacyAuditor,
} from '../helpers/windows-helpers.js';
import {
  getMacSecurityStatus,
  getMacSecurityPosture,
  getMacFullPrivacyAuditor,
  getMacPrivacyRiskScore,
} from '../helpers/macos-helpers.js';

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

// ── GET /api/security/posture ───────────────────────────────────────────────
router.get('/security/posture', async (_req, res) => {
  try {
    if (isMac) {
      res.json(await getMacSecurityPosture());
    } else {
      // Use real Windows security probe — never fabricate a score
      const winSec = await getWindowsSecurityStatus();
      const checks = [];
      if (winSec.realtimeProtection !== null) {
        checks.push({ name: 'Microsoft Defender Antivirus', passed: !!winSec.realtimeProtection, detail: winSec.realtimeProtection ? `Real-time protection active (sig ${winSec.signatureVersion || 'unknown'})` : 'Real-time protection not enabled' });
      } else {
        checks.push({ name: 'Microsoft Defender Antivirus', passed: null, detail: 'UNAVAILABLE — Defender status could not be queried' });
      }
      if (winSec.encryption?.status !== null) {
        checks.push({ name: 'BitLocker Drive Encryption', passed: winSec.encryption?.status === 'On', detail: winSec.encryption?.status === 'On' ? `Encrypted (${winSec.encryption?.percentage ?? '?'}%)` : `Status: ${winSec.encryption?.status || 'Unknown'}` });
      } else {
        checks.push({ name: 'BitLocker Drive Encryption', passed: null, detail: 'UNAVAILABLE — BitLocker status could not be queried' });
      }
      if (winSec.firewall?.active !== null) {
        checks.push({ name: 'Windows Firewall', passed: !!winSec.firewall?.active, detail: winSec.firewall?.active ? 'At least one profile active' : 'No firewall profiles active' });
      } else {
        checks.push({ name: 'Windows Firewall', passed: null, detail: 'UNAVAILABLE — Firewall status could not be queried' });
      }
      // Score is ONLY computed from real probe results — no hardcoded value
      const scoredChecks = checks.filter(c => c.passed !== null);
      const securityScore = scoredChecks.length > 0
        ? Math.round((scoredChecks.filter(c => c.passed).length / scoredChecks.length) * 100)
        : null;
      res.json({
        securityScore,
        checks,
        measurement: winSec.measurement,
        note: securityScore === null ? 'Security score unavailable — Windows security APIs did not respond.' : undefined,
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/privacy & /api/privacy/auditor & /api/security/privacy-auditor ──
const handlePrivacyAuditor = async (_req, res) => {
  try {
    const privacy = isMac
      ? await getMacFullPrivacyAuditor()
      : await getWindowsPrivacyAuditor();
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
    const auditor = isMac
      ? await getMacFullPrivacyAuditor()
      : await getWindowsPrivacyAuditor();
    res.json(auditor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/security/privacy-risk ────────────────────────────────────────
router.get('/security/privacy-risk', async (_req, res) => {
  try {
    if (isMac) {
      res.json(await getMacPrivacyRiskScore());
    } else {
      res.status(404).json({ note: 'Privacy Risk Score is macOS-only. Use /api/privacy for Windows privacy audit.' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
