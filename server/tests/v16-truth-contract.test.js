import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('package exposes the complete regression suite', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.match(pkg.scripts.test, /v10-production-audit\.test\.js/);
  assert.match(pkg.scripts.test, /v11-platform-bugs\.test\.js/);
  assert.match(pkg.scripts.test, /v11-cross-platform\.test\.js/);
  assert.match(pkg.scripts.test, /v16-truth-contract\.test\.js/);
});

test('cross-platform suite tests both native platform branches', () => {
  const source = read('server/tests/v11-cross-platform.test.js');
  assert.match(source, /SIM_PLATFORM/);
  assert.match(source, /darwin/);
  assert.match(source, /win32/);
});

test('system route contains no fabricated telemetry defaults', () => {
  const source = read('server/routes/system.js');
  for (const pattern of [/: null \? 256/, /: null \? 128/, /40\s*°C/, /Health 96%/]) assert.doesNotMatch(source, pattern);
});

test('legacy action router contains no known canned telemetry or fake cleanup totals', () => {
  const source = read('server/routes/actions.js');
  for (const pattern of [/Analyzed query against Windows telemetry/, /killedPids:\s*\[\]/, /1\.7\s*GB/, /1\.4\s*GB/]) assert.doesNotMatch(source, pattern);
});

test('platform phase templates contain configuration only, never observed result fields', () => {
  for (const file of ['src/platform/windows.ts', 'src/platform/macos.ts']) {
    const source = read(file);
    for (const pattern of [/successResult\s*:/, /verificationSummary\s*:/, /details\s*:/, /logs\s*:/]) {
      assert.doesNotMatch(source, pattern, `${file} contains a runtime-result field`);
    }
  }
});

test('platform capability defaults never claim host capabilities without a probe', () => {
  const source = read('src/platform/capabilities.ts');
  assert.doesNotMatch(source, /DEFAULT_WINDOWS_CAPABILITIES/);
  assert.doesNotMatch(source, /DEFAULT_MACOS_CAPABILITIES/);
  assert.match(source, /return \{\};/);
});

test('correlation engine never substitutes guessed telemetry', () => {
  const source = read('server/engine/correlation-engine.js');
  for (const pattern of [/memoryUsagePct\s*=\s*74/, /swapUsedGB\s*=\s*0\.8/, /chromeMemoryMB\s*=\s*3800/, /systemDataGB\s*=\s*48\.2/, /freeDiskGB\s*=\s*18\.4/, /relationshipStrength:\s*['"]High/]) {
    assert.doesNotMatch(source, pattern);
  }
  assert.match(source, /Number\.isFinite\(rawTelemetry\.memoryUsagePct\)/);
});

test('known fabricated telemetry values are absent from production source', () => {
  const files = [
    'src/platform/windows.ts', 'src/platform/macos.ts', 'src/maintenance/executor.ts',
    'server/routes/actions.js', 'server/routes/system.js', 'server/engine/correlation-engine.js',
    'src/components/LandingHero.tsx', 'src/components/SystemInfoPanel.tsx',
  ];
  const source = files.map(read).join('\n');
  for (const pattern of [
    /1\.1\.24090\.2/, /Latest Verified/, /Graphics Driver['\"]?\s*:\s*['\"]Optimal/,
    /SFC Scan['\"]?\s*:\s*['\"]Clean/, /DISM Health['\"]?\s*:\s*['\"]Healthy/,
    /1\.4\s*GB[^\n]*(?:Reclaimed|reclaimed)/i, /1\.7\s*GB[^\n]*(?:Reclaimed|reclaimed)/i,
    /v5280/, /Battery Condition['\"]?\s*:\s*['\"]Normal \(100% Health\)/,
    /2\.3\s*GB[^\n]*(?:Reclaimed|reclaimed)/i, /3\.1\s*GB[^\n]*(?:Reclaimed|reclaimed)/i,
  ]) assert.doesNotMatch(source, pattern);
});

test('truth-safe action router never reports measured data when measurement is unavailable', () => {
  const source = read('server/routes/truth-safe-actions.js');
  assert.match(source, /UNAVAILABLE/);
  assert.match(source, /measurement:\s*['"]observed['"]/);
  assert.match(source, /measurement:\s*['"]unsupported['"]/);
});

test('maintenance executor derives results only from observed backend execution', () => {
  const source = read('src/maintenance/executor.ts');
  assert.doesNotMatch(source, /totalUpdated:\s*0/);
  assert.doesNotMatch(source, /issuesFound:\s*0/);
  assert.doesNotMatch(source, /issuesFixed:\s*0/);
  assert.doesNotMatch(source, /rebootRequired:\s*plan\.platform/);
  assert.match(source, /issuesFixed:\s*null/);
  assert.match(source, /rebootRequired:\s*null/);
});

test('fabricated telemetry fixture files are not present', () => {
  for (const file of ['server/fixtures/clean-mac.json', 'server/fixtures/developer-mac.json', 'server/fixtures/low-storage-mac.json']) {
    assert.equal(fs.existsSync(path.join(root, file)), false, `${file} must not exist`);
  }
});

test('landing dashboard does not contain known fabricated telemetry values', () => {
  const source = read('src/components/LandingHero.tsx');
  for (const pattern of [/96%/, /40\s*°C/, /Optimal System Integrity/, /Latest Verified/, /Health 96/]) assert.doesNotMatch(source, pattern);
});

test('system info panel does not contain invented host or CPU fallback values', () => {
  const source = read('src/components/SystemInfoPanel.tsx');
  for (const pattern of [/Local Host/, /System CPU/]) assert.doesNotMatch(source, pattern);
});
