import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const productionRoots = ['src', 'server'];
const excluded = new Set(['server/tests']);
const extensions = new Set(['.js', '.ts', '.tsx', '.json']);
const files = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full);
    if (excluded.has(rel) || [...excluded].some((x) => rel.startsWith(`${x}${path.sep}`))) continue;
    if (entry.isDirectory()) walk(full);
    else if (extensions.has(path.extname(entry.name))) files.push(rel);
  }
}

for (const dir of productionRoots) walk(path.join(root, dir));
const source = files.map((f) => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');

test('production tree contains no known fabricated telemetry', () => {
  const forbidden = [
    /1\.1\.24090\.2/, /Latest Verified/, /v5280/, /100% Health/, /Graphics Driver\s*[:=]\s*['\"]Optimal/, /SFC Scan\s*[:=]\s*['\"]Clean/, /DISM Health\s*[:=]\s*['\"]Healthy/,
    /\b(?:1\.4|1\.7|2\.3|3\.1)\s*GB[^\n]*(?:reclaim|reclaimed)/i,
    /Analyzed query against Windows telemetry/, /Health 96%/, /Optimal System Integrity/,
    /memoryUsagePct\s*=\s*74/, /swapUsedGB\s*=\s*0\.8/, /chromeMemoryMB\s*=\s*3800/, /systemDataGB\s*=\s*48\.2/, /freeDiskGB\s*=\s*18\.4/,
  ];
  for (const pattern of forbidden) assert.doesNotMatch(source, pattern);
});

test('App initial system state is explicitly unmeasured', () => {
  const app = fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf8');
  assert.match(app, /ramGB: null/);
  assert.match(app, /freeDiskGB: null/);
  assert.match(app, /totalDiskGB: null/);
  assert.match(app, /isOnline: null/);
  assert.match(app, /cpuUsage: null/);
  assert.match(app, /memoryUsage: null/);
  assert.doesNotMatch(app, /Local Computer/);
  assert.doesNotMatch(app, /processor: \(data\.processor as string\) \|\| 'CPU'/);
});

test('health contract fails closed when availability is not backed by a health probe', () => {
  const contract = fs.readFileSync(path.join(root, 'server/core/contract.js'), 'utf8');
  assert.match(contract, /availability = AVAILABILITY\.LIMITED/);
  assert.match(contract, /return proposedStatus \|\| HEALTH_STATUS\.INFORMATIONAL/);
});
