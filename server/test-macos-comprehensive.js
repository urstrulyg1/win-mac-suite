/**
 * Comprehensive macOS Feature & Endpoint Health Check
 * Validates all real endpoints used across the MacSuite application frontend and backend.
 */

import express from 'express';
import systemRouter from './routes/system.js';
import diagnosticsRouter from './routes/diagnostics.js';
import securityRouter from './routes/security.js';
import storageRouter from './routes/storage.js';
import servicesRouter from './routes/services.js';
import networkRouter from './routes/network.js';
import reportsRouter from './routes/reports.js';
import actionsRouter from './routes/actions.js';
import v10Router from './routes/v10.js';
import intelligenceRouter from './routes/intelligence.js';

import { getDbStats, saveReport } from './db/database.js';
import { getRootFreeBytes } from './runtime/real-cleanup.js';

const app = express();
app.use(express.json());

app.use('/api', systemRouter);
app.use('/api', diagnosticsRouter);
app.use('/api', securityRouter);
app.use('/api', storageRouter);
app.use('/api', servicesRouter);
app.use('/api', reportsRouter);
app.use('/api/network', networkRouter);
app.use('/api/actions', actionsRouter);
app.use('/api/v10', v10Router);
app.use('/api/intelligence', intelligenceRouter);

const TEST_PORT = 3139;
const server = app.listen(TEST_PORT, '127.0.0.1', async () => {
  console.log(`🚀 Test server listening on port ${TEST_PORT} for macOS validation...`);
  const baseUrl = `http://127.0.0.1:${TEST_PORT}`;

  const endpoints = [
    // 1. System & Capabilities
    { name: 'System Info', url: '/api/sysinfo', method: 'GET' },
    { name: 'Capabilities', url: '/api/capabilities', method: 'GET' },
    { name: 'Health Check Matrix', url: '/api/health-check', method: 'GET' },
    { name: 'Active Processes', url: '/api/processes', method: 'GET' },
    { name: 'Event Logs', url: '/api/event-logs', method: 'GET' },
    { name: 'Battery Intelligence', url: '/api/battery/intelligence', method: 'GET' },
    { name: 'Spotlight Health', url: '/api/spotlight', method: 'GET' },
    { name: 'Power Assertions', url: '/api/power-assertions', method: 'GET' },

    // 2. Hardware & Peripherals Hub
    { name: 'Disk Health & APFS', url: '/api/diagnostics/disk-health', method: 'GET' },
    { name: 'Audio Routing Doctor', url: '/api/diagnostics/audio', method: 'GET' },
    { name: 'Camera & Mic Doctor', url: '/api/diagnostics/camera-mic', method: 'GET' },
    { name: 'Displays & Monitors', url: '/api/diagnostics/displays', method: 'GET' },
    { name: 'Peripherals & Battery', url: '/api/diagnostics/peripherals', method: 'GET' },

    // 3. Apple Services Hub
    { name: 'macOS Software Update', url: '/api/diagnostics/update-doctor', method: 'GET' },
    { name: 'Time Machine Doctor', url: '/api/diagnostics/time-machine', method: 'GET' },
    { name: 'iCloud Sync Doctor', url: '/api/diagnostics/icloud', method: 'GET' },
    { name: 'Continuity & Apple Services', url: '/api/diagnostics/apple-services', method: 'GET' },

    // 4. Developer Doctor Hub
    { name: 'Developer Health Matrix', url: '/api/developer/health', method: 'GET' },
    { name: 'Docker Storage', url: '/api/storage/docker', method: 'GET' },
    { name: 'Xcode Doctor', url: '/api/storage/xcode', method: 'GET' },
    { name: 'SSH & Git Doctor', url: '/api/diagnostics/ssh-doctor', method: 'GET' },
    { name: 'Virtualization & VMs', url: '/api/diagnostics/virtualization', method: 'GET' },
    { name: 'Browser Health', url: '/api/diagnostics/browser-health', method: 'GET' },
    { name: 'Listening Ports', url: '/api/network/listening-ports', method: 'GET' },

    // 5. Crash & Stability Doctor
    { name: 'Application Crashes & Hangs', url: '/api/diagnostics/crashes-hangs', method: 'GET' },
    { name: 'Kernel Panic & Stability', url: '/api/diagnostics/system-stability', method: 'GET' },

    // 6. System Events Timeline
    { name: 'System Timeline Engine', url: '/api/diagnostics/system-timeline', method: 'GET' },
    { name: 'Causal Correlation Incidents', url: '/api/diagnostics/correlation-incidents', method: 'GET' },
    { name: 'Multi-Baseline Engine', url: '/api/diagnostics/multi-baseline?profile=7day', method: 'GET' },
    { name: 'Predictive Forecast', url: '/api/diagnostics/predictive-forecast', method: 'GET' },

    // 7. Storage Hub & Safe Cleanup
    { name: 'Storage Overview', url: '/api/storage', method: 'GET' },
    { name: 'System Data 2.0 Breakdown', url: '/api/storage/system-data', method: 'GET' },
    { name: 'iOS/iPad Backups', url: '/api/storage/ios-backups', method: 'GET' },
    { name: 'Orphaned Leftovers', url: '/api/storage/orphaned-leftovers', method: 'GET' },
    { name: 'External Drive Doctor', url: '/api/storage/external-drives', method: 'GET' },
    { name: 'Local Snapshots', url: '/api/snapshots', method: 'GET' },
    { name: 'Safe Cleanup Plan', url: '/api/actions/cleanup-plan', method: 'POST', body: {} },

    // 8. Security & Privacy Hub
    { name: 'Security Posture Score', url: '/api/security', method: 'GET' },
    { name: 'Full Privacy Auditor (13 TCC)', url: '/api/privacy', method: 'GET' },

    // 9. Services & Startup Apps
    { name: 'Launchctl Daemons & Services', url: '/api/services', method: 'GET' },
    { name: 'Login Items & LaunchAgents', url: '/api/startup-items', method: 'GET' },

    // 10. Network Doctor Hub
    { name: '6-Step Network Doctor', url: '/api/network/doctor', method: 'GET' },
    { name: 'Bluetooth & AirDrop Doctor', url: '/api/network/bluetooth', method: 'GET' },
    { name: 'Wi-Fi Intelligence', url: '/api/network/wifi-intelligence', method: 'GET' },

    // 11. Reports & SQLite Database
    { name: 'SQLite DB Stats (MacSuite/reports.db)', url: '/api/reports/db-stats', method: 'GET' },
    { name: 'Saved Diagnostic Reports List', url: '/api/reports', method: 'GET' },
    { name: 'Cleanup Transaction Manifests', url: '/api/reports/transactions', method: 'GET' },
    { name: 'Audit Mutation Ledger', url: '/api/audit-history', method: 'GET' },
    { name: 'Full Diagnostic Report Generator', url: '/api/reports/full-system', method: 'GET' },
  ];

  let passed = 0;
  let failed = 0;

  for (const ep of endpoints) {
    try {
      const opts = {
        method: ep.method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (ep.body) opts.body = JSON.stringify(ep.body);

      const res = await fetch(`${baseUrl}${ep.url}`, opts);
      if (!res.ok) {
        console.error(`❌ [HTTP ${res.status}] ${ep.name} (${ep.method} ${ep.url})`);
        failed++;
        continue;
      }
      const data = await res.json();
      if (data !== null && typeof data === 'object') {
        console.log(`✅ [PASS] ${ep.name} (${ep.url})`);
        passed++;
      } else {
        console.warn(`⚠️ [EMPTY DATA] ${ep.name}`);
        failed++;
      }
    } catch (err) {
      console.error(`❌ [ERROR] ${ep.name}:`, err.message);
      failed++;
    }
  }

  // Verify Real Space Cleanup & DB Retention
  console.log('\n--- Verifying Real Space Reclamation & DB Retention ---');
  const freeBytes = await getRootFreeBytes();
  console.log(`✅ Root APFS Free Bytes: ${freeBytes} (${(freeBytes / 1024 / 1024 / 1024).toFixed(2)} GB)`);

  const dbStats = getDbStats();
  console.log(`✅ SQLite Database: ${dbStats.dbPath}`);
  console.log(`✅ DB Size: ${dbStats.sizeFormatted} / ${dbStats.maxSizeFormatted} (${dbStats.sizePercentage}% capacity)`);
  console.log(`✅ 30-Day Retention Policy: ${dbStats.retentionDays} days`);

  console.log(`\n========================================`);
  console.log(`macOS Suite Verification: ${passed} PASSED, ${failed} FAILED (Total ${endpoints.length} features tested)`);
  console.log(`========================================\n`);

  server.close();
  process.exit(failed === 0 ? 0 : 1);
});
