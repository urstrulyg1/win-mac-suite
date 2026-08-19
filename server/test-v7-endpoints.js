/**
 * WinSuite & MacSuite v7.0 - Comprehensive Endpoint Test Suite
 */

async function runV7Tests() {
  console.log('Testing WinSuite & MacSuite v7.0 Hardening & Completeness Endpoints...');

  const endpoints = [
    '/api/diagnostics/update-doctor',
    '/api/diagnostics/disk-health',
    '/api/diagnostics/crashes-hangs',
    '/api/diagnostics/system-stability',
    '/api/diagnostics/spotlight-doctor',
    '/api/diagnostics/time-machine',
    '/api/diagnostics/icloud',
    '/api/diagnostics/apple-services',
    '/api/diagnostics/audio',
    '/api/diagnostics/camera-mic',
    '/api/diagnostics/displays',
    '/api/diagnostics/peripherals',
    '/api/diagnostics/finder-clipboard',
    '/api/diagnostics/ssh-doctor',
    '/api/diagnostics/virtualization',
    '/api/diagnostics/browser-health',
    '/api/diagnostics/app-resource',
    '/api/diagnostics/system-timeline',
    '/api/diagnostics/baseline-diff',
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

  let passed = 0;
  let failed = 0;

  for (const ep of endpoints) {
    try {
      const res = await fetch(`http://127.0.0.1:3131${ep}`);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      console.log(`✓ GET ${ep} -> OK`);
      passed++;
    } catch (err) {
      console.error(`✗ GET ${ep} -> Failed:`, err.message);
      failed++;
    }
  }

  // Test Ask Assistant structured output
  try {
    const res = await fetch('http://127.0.0.1:3131/api/actions/ask-assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'Why is my Mac getting hot?' }),
    });
    const data = await res.json();
    console.log(`✓ POST /api/actions/ask-assistant -> OK (Topic: "${data.topic}", Confidence: ${data.confidence})`);
    passed++;
  } catch (err) {
    console.error('✗ Assistant test error:', err.message);
    failed++;
  }

  console.log(`\n========================================`);
  console.log(`Results: ${passed} Passed | ${failed} Failed`);
  console.log(`========================================`);
}

runV7Tests();
