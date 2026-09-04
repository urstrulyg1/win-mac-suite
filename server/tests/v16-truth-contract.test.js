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

test('system route contains no fabricated disk telemetry defaults', () => {
  const source = read('server/routes/system.js');
  assert.doesNotMatch(source, /: null \? 256/);
  assert.doesNotMatch(source, /: null \? 128/);
  assert.doesNotMatch(source, /40\s*°C/);
});

test('legacy action router contains no canned Windows assistant answer or Windows false-success branches', () => {
  const source = read('server/routes/actions.js');
  assert.doesNotMatch(source, /Analyzed query against Windows telemetry/);
  assert.doesNotMatch(source, /killedPids:\s*\[\]/);
});

test('truth-safe action router never reports measured data when measurement is unavailable', () => {
  const source = read('server/routes/truth-safe-actions.js');
  assert.match(source, /UNAVAILABLE/);
  assert.match(source, /measurement:\s*['"]observed['"]/);
  assert.match(source, /measurement:\s*['"]unsupported['"]/);
});

test('maintenance executor does not fabricate update, issue, reclaim, or reboot counts', () => {
  const source = read('src/maintenance/executor.ts');
  assert.doesNotMatch(source, /totalUpdated:\s*0/);
  assert.doesNotMatch(source, /issuesFound:\s*0/);
  assert.doesNotMatch(source, /issuesFixed:\s*0/);
  assert.doesNotMatch(source, /rebootRequired:\s*plan\.platform/);
  assert.match(source, /issuesFixed:\s*null/);
  assert.match(source, /rebootRequired:\s*null/);
});
