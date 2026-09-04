/**
 * Safety and correlation tests. No checked-in telemetry fixtures are used.
 */
import assert from 'assert';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { classifyPath, validateDeletionTarget, releaseGuard, PATH_CLASSIFICATION } from '../security/protected-paths.js';
import { CorrelationEngine } from '../engine/correlation-engine.js';

function runSafetyTests() {
  const HOME = os.homedir();
  assert.strictEqual(classifyPath('/System/Library/CoreServices'), PATH_CLASSIFICATION.SYSTEM_PROTECTED);
  assert.throws(() => validateDeletionTarget('/System/Library/Extensions'), /SYSTEM PROTECTED/);
  assert.strictEqual(classifyPath(path.join(HOME, 'Documents/Tax2025.pdf')), PATH_CLASSIFICATION.USER_CRITICAL);
  assert.throws(() => validateDeletionTarget(path.join(HOME, 'Documents/ImportantReport.docx')), /USER CRITICAL/);

  const safeCache = path.join(HOME, 'Library/Caches/WinSuite-Test');
  fs.mkdirSync(safeCache, { recursive: true });
  try {
    const result = validateDeletionTarget(safeCache);
    assert.strictEqual(result.allowed, true);
    assert.strictEqual(result.classification, PATH_CLASSIFICATION.SAFE_RECLAIMABLE);
    releaseGuard(result.guard);
  } finally {
    try { fs.rmSync(safeCache, { recursive: true, force: true }); } catch {}
  }

  assert.throws(() => validateDeletionTarget(path.join(HOME, 'Library/Caches/DoesNotExist-zzz')), /does not exist/);
}

function runCorrelationTests() {
  const empty = CorrelationEngine.correlate({});
  assert.deepStrictEqual(empty.findings, []);
  assert.deepStrictEqual(empty.incidents, []);

  const observed = CorrelationEngine.correlate({
    memoryUsagePct: 82,
    swapUsedGB: 1.2,
    chromeMemoryMB: 3400,
    dockerActive: false,
  });
  assert.ok(observed.findings.length > 0);
  assert.ok(observed.incidents.length > 0);
  assert.ok(observed.findings[0].evidence.some((e) => e.displayValue === '82%' || e.value === '82%' || e.observedValue === '82%'));

  const missing = CorrelationEngine.correlate({ memoryUsagePct: 82 });
  assert.equal(missing.findings.length, 0);
  assert.equal(missing.incidents.length, 0);
}

runSafetyTests();
runCorrelationTests();
console.log('✓ v8 safety and evidence-only correlation tests passed');
