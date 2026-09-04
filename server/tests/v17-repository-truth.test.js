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
    if (entry.isDirectory()) walk(full); else if (extensions.has(path.extname(entry.name))) files.push(rel);
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
  for (const field of ['ramGB', 'freeDiskGB', 'totalDiskGB', 'cpuUsage', 'memoryUsage']) assert.match(app, new RegExp(`${field}: null`));
  assert.match(app, /isOnline: null/);
  assert.doesNotMatch(app, /Local Computer/);
  assert.doesNotMatch(app, /processor: \(data\.processor as string\) \|\| 'CPU'/);
  assert.doesNotMatch(app, /freeDiskGB: \+\(prev\.freeDiskGB/);
  assert.match(app, /completed with warnings or errors/);
});

test('health contract fails closed when availability is not backed by a health probe', () => {
  const contract = fs.readFileSync(path.join(root, 'server/core/contract.js'), 'utf8');
  assert.match(contract, /availability = AVAILABILITY\.LIMITED/);
  assert.match(contract, /return proposedStatus \|\| HEALTH_STATUS\.INFORMATIONAL/);
  assert.match(contract, /healthEvaluated = counts\.HEALTHY \+ counts\.WARNING \+ counts\.CRITICAL/);
  assert.match(contract, /healthScore: scoreBase/);
  assert.match(contract, /HEALTHY requires evidence/);
});

test('permission state is not optimistic before runtime probing', () => {
  const permissions = fs.readFileSync(path.join(root, 'server/core/permissions.js'), 'utf8');
  assert.match(permissions, /return \{ \.\.\.overrides \};/);
  assert.doesNotMatch(permissions, /USER_APPROVED\]: true/);
  assert.doesNotMatch(permissions, /NETWORK\]: true/);
});

test('system capabilities are runtime probes, not platform assumptions', () => {
  const system = fs.readFileSync(path.join(root, 'server/routes/system.js'), 'utf8');
  assert.match(system, /commandExists\(command\)/);
  assert.doesNotMatch(system, /powershell:\s*isWin \? ['\"]available/);
  assert.doesNotMatch(system, /sfc:\s*isWin \? ['\"]available/);
  assert.doesNotMatch(system, /capabilities:\s*\{[^}]*homebrew:\s*isMac \? ['\"]available/);
  assert.match(system, /capabilities: null/);
});

test('v10 capability matrix never claims checked availability without evidence', () => {
  const v10 = fs.readFileSync(path.join(root, 'server/routes/v10.js'), 'utf8');
  assert.doesNotMatch(v10, /PASS \(Observed\)/);
  assert.doesNotMatch(v10, /PASS \(Pre\/Post Verified\)/);
  assert.doesNotMatch(v10, /status:\s*['\"]AVAILABLE['\"]/);
  assert.match(v10, /status: 'NOT_CHECKED'/);
  assert.match(v10, /evidence: \[\]/);
});

test('degraded probes never substitute caller fallback telemetry after failure', () => {
  const degraded = fs.readFileSync(path.join(root, 'server/runtime/degraded-mode.js'), 'utf8');
  assert.doesNotMatch(degraded, /value:\s*fallbackValue/);
  assert.match(degraded, /value: null/);
});

test('fixture-backed production telemetry is absent', () => {
  assert.equal(fs.existsSync(path.join(root, 'server', 'fixtures')), false);
});
