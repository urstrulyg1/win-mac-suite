/**
 * WinSuite & MacSuite v6.3 Production Architecture
 * Local Telemetry, Secure Command Allowlist & Operations Server (:3131).
 *
 * Modular Route Organization:
 * - /api/sysinfo, /api/capabilities, /api/permissions -> routes/system.js
 * - /api/health-check, /api/processes, /api/event-logs -> routes/diagnostics.js
 * - /api/security, /api/privacy                       -> routes/security.js
 * - /api/storage, /api/developer-cleanup, /api/snapshots -> routes/storage.js
 * - /api/services, /api/startup-items                 -> routes/services.js
 * - /api/network/diagnostics                          -> routes/network.js
 * - /api/reports, /api/audit-history                  -> routes/reports.js
 * - /api/actions/*                                    -> routes/actions.js
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

import { localhostOnlyGuard, concurrencyGuard } from './server/security/request-guard.js';

const PORT = 3131;
const app = express();

// Local origin and security configuration
app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3131', 'http://127.0.0.1:3131'] }));
app.use(express.json());
app.use(localhostOnlyGuard);
app.use(concurrencyGuard);

// Mount modular sub-routers
app.use('/api', systemRouter);
app.use('/api', diagnosticsRouter);
app.use('/api', securityRouter);
app.use('/api', storageRouter);
app.use('/api', servicesRouter);
app.use('/api', reportsRouter);
app.use('/api/network', networkRouter);
app.use('/api/actions', actionsRouter);

const isMac = process.platform === 'darwin';
const isWin = process.platform === 'win32';
const detectedPlatform = isMac ? 'macos' : isWin ? 'windows' : 'unsupported';
const brand = isMac ? 'MacSuite' : 'WinSuite';

app.listen(PORT, '127.0.0.1', () => {
  console.log(`✅  ${brand} (v6.3) telemetry & operations server listening on http://127.0.0.1:${PORT}`);
  console.log(`    Platform: ${detectedPlatform.toUpperCase()} | Host: ${os.hostname()} (${os.arch()})`);
});
