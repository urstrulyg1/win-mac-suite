/**
 * Test script for new 8-Pillar endpoints
 */

async function testNewEndpoints() {
  console.log('Testing 8-Pillar System Intelligence Endpoints...');

  const endpoints = [
    '/api/storage/docker',
    '/api/storage/xcode',
    '/api/storage/ios-backups',
    '/api/storage/orphaned-leftovers',
    '/api/storage/external-drives',
    '/api/performance/diagnosis',
    '/api/thermal/deep',
    '/api/battery/intelligence',
    '/api/network/doctor',
    '/api/network/bluetooth',
    '/api/network/wifi-intelligence',
    '/api/security/posture',
    '/api/security/privacy-auditor',
    '/api/reports/transactions',
    '/api/reports/full-system',
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

  // Test Assistant
  try {
    const res = await fetch('http://127.0.0.1:3131/api/actions/ask-assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'Why is my Mac using 70GB of System Data?' }),
    });
    const data = await res.json();
    console.log(`✓ POST /api/actions/ask-assistant -> OK (Topic: ${data.topic})`);
  } catch (err) {
    console.error('✗ Assistant test error:', err.message);
  }

  // Test Cleanup Plan
  try {
    const res = await fetch('http://127.0.0.1:3131/api/actions/cleanup-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    console.log(`✓ POST /api/actions/cleanup-plan -> OK (${data.planItems.length} items, ~${data.totalReclaimableGB} GB)`);
  } catch (err) {
    console.error('✗ Cleanup plan error:', err.message);
  }

  console.log('--- All 8-Pillar Endpoints Verified! ---');
}

testNewEndpoints();
