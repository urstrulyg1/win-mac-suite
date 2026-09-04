import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

test('package exposes the complete regression suite', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.match(pkg.scripts.test, /v10-production-audit\.test\.js/);
  assert.match(pkg.scripts.test, /v11-platform-bugs\.test\.js/);
  assert.match(pkg.scripts.test, /v11-cross-platform\.test\.js/);
});

test('cross-platform suite tests both native platform branches', () => {
  const source = fs.readFileSync(path.join(root, 'server/tests/v11-cross-platform.test.js'), 'utf8');
  assert.match(source, /SIM_PLATFORM/);
  assert.match(source, /darwin/);
  assert.match(source, /win32/);
});

test('system route contains no fabricated disk telemetry defaults', () => {
  const source = fs.readFileSync(path.join(root, 'server/routes/system.js'), 'utf8');
  assert.doesNotMatch(source, /: null \? 256/);
  assert.doesNotMatch(source, /: null \? 128/);
});
