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
});

test('cross-platform suite tests both native platform branches', () => {
  const source = read('server/tests/v11-cross-platform.test.js');
  assert.match(source, /SIM_PLATFORM/);
  assert.match(source, /darwin/);
  assert.match(source, /win32/);
});

test('system route contains no fabricated telemetry defaults', () => {
  const source = read('server/routes/system.js');
  for (const pattern of [/: null \? 256/, /: null \? 128/, /40\s*°C/, /health\s*[:=]\s*96/, /Health 96%/]) {
    assert.doesNotMatch(source, pattern);
  }
});

test('legacy action router contains no canned telemetry or false-success Windows branches', () => {
  const source = read('server/routes/actions.js');
  for (const pattern of [/Analyzed query against Windows telemetry/, /killedPids:\s*\[\]/, /success:\s*true[\s\S]{0,300}process\.platform === ['"]win32['"]/, /1\.7\s*GB/, /1\.4\s*GB/]) {
    assert.doesNotMatch(source, pattern);
  }
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
  for (const pattern of [/96%/, /40\s*°C/, /Optimal System Integrity/, /Latest Verified/, /Health 96/]) {
    assert.doesNotMatch(source, pattern);
  }
});

test('system info panel does not substitute invented hardware or connectivity values', () => {
  const source = read('src/components/SystemInfoPanel.tsx');
  for (const pattern of [/Local Host/, /System CPU/, /\barm64\b/, /Darwin/]) {
    assert.doesNotMatch(source, pattern);
  }
});
