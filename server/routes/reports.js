/**
 * WinSuite & MacSuite v6.5 - Reports, Transaction Manifest & Export Route
 * Endpoints:
 * - GET /api/reports/transactions
 * - GET /api/reports/full-system
 * - GET /api/reports/html
 * - GET /api/audit-history
 */

import express from 'express';
import os from 'os';
import si from 'systeminformation';
import { getAuditHistory } from '../audit/audit-logger.js';
import { getCleanupTransactions } from '../audit/transaction-manifest.js';
import {
  getMacSystemDataBreakdown,
  getMacPerformanceDiagnosis,
  getMacBatteryIntelligence,
  getMacNetworkDoctor,
  getMacSecurityPosture,
  getMacFullPrivacyAuditor,
  getMacDeveloperEnvironmentDoctor,
  getMacDeepStartupInventory,
} from '../helpers/macos-helpers.js';

const router = express.Router();
const isMac = process.platform === 'darwin';

// ── GET /api/reports/transactions ───────────────────────────────────────────
router.get('/reports/transactions', (_req, res) => {
  try {
    const txs = getCleanupTransactions();
    res.json({ transactions: txs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/audit-history ──────────────────────────────────────────────────
router.get('/audit-history', (_req, res) => {
  try {
    const history = getAuditHistory();
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/reports/full-system (Diagnostic Report Generator) ───────────────
router.get('/reports/full-system', async (_req, res) => {
  try {
    const [osInfo, cpu, mem, sysData, perf, batt, net, sec, priv, dev, startup] = await Promise.all([
      si.osInfo(),
      si.cpu(),
      si.mem(),
      isMac ? getMacSystemDataBreakdown() : null,
      isMac ? getMacPerformanceDiagnosis() : null,
      isMac ? getMacBatteryIntelligence() : null,
      isMac ? getMacNetworkDoctor() : null,
      isMac ? getMacSecurityPosture() : null,
      isMac ? getMacFullPrivacyAuditor() : null,
      isMac ? getMacDeveloperEnvironmentDoctor() : null,
      isMac ? getMacDeepStartupInventory() : null,
    ]);

    const report = {
      product: isMac ? 'MacSuite Intelligence' : 'WinSuite Intelligence',
      version: '6.5.0',
      timestamp: new Date().toISOString(),
      hostname: os.hostname(),
      platform: isMac ? 'macOS' : 'Windows',
      os: `${osInfo.distro || 'macOS'} ${osInfo.release || ''}`,
      hardware: {
        chip: `${cpu.manufacturer || 'Apple'} ${cpu.brand || 'Silicon'}`,
        arch: os.arch(),
        ramGB: Math.round(mem.total / 1024 / 1024 / 1024),
      },
      storageIntelligence: sysData,
      performanceDiagnosis: perf,
      batteryIntelligence: batt,
      networkDoctor: net,
      securityPosture: sec,
      privacyAuditor: priv,
      developerDoctor: dev,
      startupManager: startup,
    };

    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
