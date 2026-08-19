/**
 * WinSuite & MacSuite v8.0 - Complete Production Intelligence & Regression Test Suite
 */

async function runV8TestSuite() {
  console.log('Testing WinSuite & MacSuite v8.0 Production Intelligence...');

  const endpoints = [
    '/api/diagnostics/correlation-incidents',
    '/api/diagnostics/multi-baseline?profile=firstRun',
    '/api/diagnostics/multi-baseline?profile=30day',
    '/api/diagnostics/multi-baseline?profile=developer',
    '/api/diagnostics/predictive-forecast',
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

  // Validate correlation output
  try {
    const res = await fetch('http://127.0.0.1:3131/api/diagnostics/correlation-incidents');
    const data = await res.json();
    if (data.incidents && data.incidents.length > 0) {
      console.log(`✓ Correlation Verification -> Identified ${data.incidents.length} Causal Incident Clusters (Root Cause: "${data.incidents[0].rootCause}")`);
      passed++;
    } else {
      throw new Error('No incident clusters generated');
    }
  } catch (err) {
    console.error('✗ Correlation Verification Failed:', err.message);
    failed++;
  }

  console.log(`\n======================================================`);
  console.log(`v8.0 Regression Suite: ${passed} Passed | ${failed} Failed`);
  console.log(`======================================================`);
}

runV8TestSuite();
