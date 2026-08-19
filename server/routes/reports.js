/**
 * WinSuite & MacSuite v6.3 - Reports & Audit History Route
 * Read-only endpoints: /api/reports, /api/reports/:id, /api/audit-history
 */

import express from 'express';
import { getAuditHistory } from '../audit/audit-logger.js';

const router = express.Router();

// ── GET /api/audit-history ──────────────────────────────────────────────────
router.get('/audit-history', (_req, res) => {
  const history = getAuditHistory();
  res.json({
    count: history.length,
    history,
  });
});

// ── GET /api/reports ────────────────────────────────────────────────────────
router.get('/reports', (_req, res) => {
  const history = getAuditHistory();
  res.json({
    count: history.length,
    reports: history.map((h) => ({
      id: h.id,
      timestamp: h.timestamp,
      title: h.operation,
      risk: h.risk,
      result: h.result,
      duration: h.durationSeconds,
      reclaimedBytes: h.reclaimedBytes || 0,
    })),
  });
});

// ── GET /api/reports/:id ────────────────────────────────────────────────────
router.get('/reports/:id', (req, res) => {
  const history = getAuditHistory();
  const record = history.find((h) => h.id === req.params.id);
  if (!record) {
    return res.status(404).json({ error: 'Report not found.' });
  }
  res.json(record);
});

export default router;
