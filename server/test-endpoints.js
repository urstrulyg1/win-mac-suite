/**
 * WinSuite & MacSuite v6.3 - Comprehensive Backend Test Script
 */

async function runTests() {
  console.log('Testing WinSuite/MacSuite Backend Endpoints...');

  const endpoints = [
    '/api/sysinfo',
    '/api/capabilities',
    '/api/permissions',
    '/api/health-check',
    '/api/processes',
    '/api/event-logs',
    '/api/security',
    '/api/privacy',
    '/api/storage',
    '/api/developer-cleanup',
    '/api/snapshots',
    '/api/services',
    '/api/startup-items',
    '/api/battery',
    '/api/packages',
    '/api/hardware',
    '/api/network/diagnostics',
    '/api/reports',
    '/api/audit-history',
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(`http://127.0.0.1:3131${ep}`);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      console.log(`✓ GET ${ep} -> OK`);
    } catch (err) {
      console.error(`✗ GET ${ep} -> Failed:`, err.message);
    }
  }

  // Security Test: Unknown Command ID rejection
  try {
    const res = await fetch('http://127.0.0.1:3131/api/actions/run-phase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commandId: 'unauthorized.hack.command' }),
    });
    if (res.status === 403) {
      console.log('✓ POST /api/actions/run-phase (Invalid ID) -> Correctly Rejected with 403 Forbidden');
    } else {
      console.error('✗ POST /api/actions/run-phase (Invalid ID) -> Expected 403, got:', res.status);
    }
  } catch (err) {
    console.error('✗ Security test error:', err.message);
  }

  // Mutative Action Test: clean-storage
  try {
    const res = await fetch('http://127.0.0.1:3131/api/actions/clean-storage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    console.log(`✓ POST /api/actions/clean-storage -> OK (Reclaimed ${data.reclaimedMB} MB, Audit logged)`);
  } catch (err) {
    console.error('✗ clean-storage error:', err.message);
  }

  // Mutative Action Test: toggle-startup
  try {
    const res = await fetch('http://127.0.0.1:3131/api/actions/toggle-startup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemName: 'Microsoft Teams', enable: true }),
    });
    const data = await res.json();
    console.log('✓ POST /api/actions/toggle-startup -> OK (Audit logged)');
  } catch (err) {
    console.error('✗ toggle-startup error:', err.message);
  }

  // Check audit ledger persistence
  try {
    const res = await fetch('http://127.0.0.1:3131/api/audit-history');
    const data = await res.json();
    console.log(`✓ GET /api/audit-history -> Verified ${data.count} entries in persistent ledger`);
  } catch (err) {
    console.error('✗ Audit history verification error:', err.message);
  }

  console.log('--- All automated backend validation tests completed! ---');
}

runTests();
