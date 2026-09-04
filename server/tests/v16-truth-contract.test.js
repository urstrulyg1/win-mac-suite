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

test('truth-safe action handlers are mounted before legacy action handlers', () => {
  const source = read('server.js');
  const truth = source.indexOf("app.use('/api/actions', truthSafeActionsRouter)");
  const legacy = source.indexOf("app.use('/api/actions', actionsRouter)");
  assert.ok(truth >= 0 && legacy >= 0 && truth < legacy);
});

test('truth-safe action router represents unavailable measurements explicitly', () => {
  const source = read('server/routes/truth-safe-actions.js');
  assert.match(source, /UNAVAILABLE/);
  assert.match(source, /measurement:\s*['"]observed['"]/);
  assert.match(source, /measurement:\s*['"]unsupported['"]/);
});

test('maintenance executor does not fabricate update, issue, or reboot counts', () => {
  const source = read('src/maintenance/executor.ts');
  assert.doesNotMatch(source, /totalUpdated:\s*0/);
  assert.doesNotMatch(source, /issuesFound:\s*0/);
  assert.doesNotMatch(source, /issuesFixed:\s*0/);
  assert.doesNotMatch(source, /rebootRequired:\s*plan\.platform/);
  assert.match(source, /issuesFixed:\s*null/);
  assert.match(source, /rebootRequired:\s*null/);
});
