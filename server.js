/**
 * WinSuite & MacSuite v11.0 Production Architecture
 * Local Telemetry, Secure Command Allowlist & Operations Server (:3131).
 */

import express from 'express';
import cors from 'cors';
import os from 'os';

import systemRouter from './server/routes/system.js';
import diagnosticsRouter from './server/routes/diagnostics.js';
import securityRouter from './server/routes/security.js';
import storageRouter from './server/routes/storage.js';
import servicesRouter from './server/routes/services.js';
import networkRouter from './server/routes/network.js';
import reportsRouter from './server/routes/reports.js';
import actionsRouter from './server/routes/actions.js';
import windowsAssistantRouter from './server/routes/windows-assistant.js';
import v10Router from './server/routes/v10.js';
import intelligenceRouter from './server/routes/intelligence.js';
import windowsRouter from './server/routes/windows.js';
import windowsV2Router from './server/routes/windows-v2.js';

import { localhostOnlyGuard, concurrencyGuard } from './server/security/request-guard.js';
import { createErrorResponse } from './server/contracts/api-schemas.js';
import { getDegradedModeStatus } from './server/runtime/degraded-mode.js';
import { safeModeMiddleware, safeModeGuardMiddleware, getSafeModeStatus, activateSafeMode, deactivateSafeMode } from './server/security/safe-mode.js';
import { getDatabase } from './server/db/database.js';

const PORT = parseInt(process.env.PORT || '3131', 10);
const app = express();

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3131',
  'http://127.0.0.1:3131',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    if (/\.e2b\.app$/.test(new URL(origin).hostname)) return callback(null, true);
    if (/^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return callback(null, true);
    callback(null, false);
  },
  credentials: true,
}));

app.use(express.json({ limit: '64kb', strict: true }));

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.use((err, _req, res, next) => {
  if (!err) return next();
  if (err.type === 'entity.too.large') {
    return res.status(413).json(createErrorResponse({
      code: 'REQUEST_BODY_TOO_LARGE',
      error: 'Request body exceeds the 64kb limit.',
      remediation: 'Send a smaller payload. No supported endpoint requires a body this large.',
    }));
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json(createErrorResponse({
      code: 'MALFORMED_JSON',
      error: 'Request body is not valid JSON.',
      remediation: 'Send a well-formed JSON object with Content-Type: application/json.',
    }));
  }
  return next(err);
});

app.use(localhostOnlyGuard);
app.use(concurrencyGuard);
app.use(safeModeMiddleware);
app.use(safeModeGuardMiddleware);

app.use('/api', systemRouter);
app.use('/api', diagnosticsRouter);
app.use('/api', securityRouter);
app.use('/api', storageRouter);
app.use('/api', servicesRouter);
app.use('/api', reportsRouter);
app.use('/api/network', networkRouter);
// Windows assistant must be mounted before the generic action router so its
// platform-specific implementation owns POST /api/actions/ask-assistant.
app.use('/api/actions', windowsAssistantRouter);
app.use('/api/actions', actionsRouter);
app.use('/api/v10', v10Router);
app.use('/api/intelligence', intelligenceRouter);
app.use('/api/windows', windowsRouter);
app.use('/api/windows/v2', windowsV2Router);

app.get('/api/v10/safe-mode', (_req, res) => {
  res.json({ safeMode: getSafeModeStatus() });
});

app.post('/api/v10/safe-mode/activate', (req, res) => {
  const result = activateSafeMode(req.body?.source || 'api');
  res.json({ success: true, ...result });
});

app.post('/api/v10/safe-mode/deactivate', (req, res) => {
  const { confirmed } = req.body || {};
  if (!confirmed) {
    return res.status(400).json({
      error: 'Deactivating Safe Mode requires explicit confirmation.',
      remediation: 'Re-send with { "confirmed": true } after the user approves.',
    });
  }
  const result = deactivateSafeMode(req.body?.source || 'api');
  res.json({ success: true, ...result });
});

app.get('/api/health', async (_req, res) => {
  res.json({
    status: 'ok',
    version: '11.0.0',
    timestamp: new Date().toISOString(),
    platform: process.platform,
    uptime: process.uptime(),
  });
});

app.use((req, res) => {
  res.status(404).json(createErrorResponse({
    code: 'ROUTE_NOT_FOUND',
    error: `No route matches ${req.method} ${req.originalUrl}.`,
    recoverable: false,
    remediation: 'See GET /api/v10/contracts/schemas for the published API contract.',
  }));
});

app.use((err, _req, res, _next) => {
  console.error('[v11] Unhandled error:', err);
  res.status(500).json(createErrorResponse({
    code: 'UNEXPECTED_ERROR',
    error: 'The request failed unexpectedly and was stopped before making changes.',
    recoverable: true,
    remediation: 'The system was left in its previous state. Other subsystems are unaffected.',
    details: process.env.NODE_ENV === 'development' ? { message: err?.message } : null,
  }));
});

const isMac = process.platform === 'darwin';
const isWin = process.platform === 'win32';
const detectedPlatform = isMac ? 'macos' : isWin ? 'windows' : 'unsupported';
const brand = isMac ? 'MacSuite' : 'WinSuite';

const server = app.listen(PORT, '127.0.0.1', async () => {
  console.log(`✅  ${brand} (v11.0) telemetry & operations server listening on http://127.0.0.1:${PORT}`);
  console.log(`    Platform: ${detectedPlatform.toUpperCase()} | Host: ${os.hostname()} (${os.arch()})`);
  const runtime = await getDegradedModeStatus();
  console.log(`    Runtime: ${runtime.online ? 'ONLINE' : 'OFFLINE'} | ${runtime.message}`);
  console.log('    Safe Mode: Available via POST /api/v10/safe-mode/activate');
  console.log('    Contract: GET /api/v10/health · /api/v10/permissions/matrix · /api/v10/contracts/schemas');
});

function handleShutdown(signal) {
  console.log(`\n🛑 [${brand}] Received ${signal}. Checkpointing SQLite database and shutting down...`);
  try {
    const db = getDatabase();
    db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
  } catch {}

  server.close(() => {
    console.log(`✓ [${brand}] HTTP Server closed cleanly.`);
    process.exit(0);
  });

  setTimeout(() => process.exit(0), 3000);
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  console.error('[Production Daemon] Unhandled Promise Rejection:', reason);
});
