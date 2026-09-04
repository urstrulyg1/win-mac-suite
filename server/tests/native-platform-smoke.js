import assert from 'node:assert/strict';
import http from 'node:http';

const port = Number(process.env.SMOKE_PORT || 3131);
const expected = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'macos' : 'unsupported';

if (expected === 'unsupported') {
  console.log('Native platform smoke skipped: unsupported host OS.');
  process.exit(0);
}

function request(pathname) {
  return new Promise((resolve, reject) => {
    const req = http.get({ hostname: '127.0.0.1', port, path: pathname, timeout: 15000 }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch {}
        resolve({ status: res.statusCode, body: json });
      });
    });
    req.on('timeout', () => req.destroy(new Error(`Timeout: ${pathname}`)));
    req.on('error', reject);
  });
}

const probes = [
  '/api/health',
  '/api/sysinfo',
  '/api/capabilities',
  '/api/permissions',
  '/api/health-score',
  '/api/apps/inventory',
  '/api/services',
  '/api/storage',
  '/api/network/diagnostics',
  '/api/diagnostics/disk-health',
];

for (const pathname of probes) {
  const result = await request(pathname);
  assert.ok(result.status >= 200 && result.status < 500, `${pathname} returned ${result.status}`);
  assert.ok(result.body && typeof result.body === 'object', `${pathname} did not return JSON`);
  console.log(`✓ ${pathname} -> ${result.status}`);
}

const sysinfo = await request('/api/sysinfo');
assert.equal(sysinfo.body.platform, expected, `Expected ${expected}, got ${sysinfo.body.platform}`);
assert.notEqual(sysinfo.body.totalDiskGB, 256, 'Fabricated 256GB disk fallback detected');
assert.notEqual(sysinfo.body.freeDiskGB, 128, 'Fabricated 128GB disk fallback detected');
assert.notEqual(sysinfo.body.processor, 'Apple Silicon M3 Pro', 'Fabricated processor detected');

console.log(`✓ Native ${expected} platform smoke test passed`);
