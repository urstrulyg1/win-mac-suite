/**
 * WinSuite & MacSuite v8.0 - Safety Policy & Correlation Engine Unit Tests
 */

import assert from 'assert';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { classifyPath, validateDeletionTarget, PATH_CLASSIFICATION } from '../security/protected-paths.js';
import { CorrelationEngine } from '../engine/correlation-engine.js';
import { BaselineForecaster } from '../engine/baseline-forecaster.js';
import { calculateConfidence } from '../models/finding.js';

function runSafetyTests() {
  console.log('Running v8.0 Safety Policy Unit Tests...');
  const HOME = os.homedir();

  // Test 1: Block System Protected Path
  assert.strictEqual(classifyPath('/System/Library/CoreServices'), PATH_CLASSIFICATION.SYSTEM_PROTECTED);
  assert.throws(() => {
    validateDeletionTarget('/System/Library/Extensions');
  }, /SYSTEM PROTECTED/);
  console.log('✓ Test 1 Passed: Deletion of /System/Library/Extensions blocked with SAFETY POLICY VIOLATION');

  // Test 2: Block User Critical Documents
  assert.strictEqual(classifyPath(path.join(HOME, 'Documents/Tax2025.pdf')), PATH_CLASSIFICATION.USER_CRITICAL);
  assert.throws(() => {
    validateDeletionTarget(path.join(HOME, 'Documents/ImportantReport.docx'));
  }, /USER CRITICAL/);
  console.log('✓ Test 2 Passed: Deletion of ~/Documents blocked with SAFETY POLICY VIOLATION');

  // Test 3: Allow Safe Reclaimable Cache Path
  const safeCache = path.join(HOME, 'Library/Caches/Google/Chrome');
  const result = validateDeletionTarget(safeCache);
  assert.strictEqual(result.allowed, true);
  assert.strictEqual(result.classification, PATH_CLASSIFICATION.SAFE_RECLAIMABLE);
  console.log('✓ Test 3 Passed: Safe cache path allowed for reclamation');
}

function runCorrelationEngineTests() {
  console.log('\nRunning v8.0 Correlation Engine Unit Tests...');

  const devMac = JSON.parse(fs.readFileSync('./server/fixtures/developer-mac.json', 'utf8'));
  const devResults = CorrelationEngine.correlate(devMac);

  assert.strictEqual(devResults.incidents.length > 0, true);
  assert.strictEqual(devResults.findings.length > 0, true);
  assert.strictEqual(devResults.incidents[0].relationshipStrength.includes('High'), true);
  console.log(`✓ Test 4 Passed: Developer Mac fixture correctly correlated Memory Pressure -> Crash incident (${devResults.incidents[0].relationshipStrength})`);

  const cleanMac = JSON.parse(fs.readFileSync('./server/fixtures/clean-mac.json', 'utf8'));
  const cleanResults = CorrelationEngine.correlate(cleanMac);
  assert.strictEqual(cleanResults.incidents.length, 0);
  console.log('✓ Test 5 Passed: Clean Mac fixture generated 0 false-positive incidents');
}

function runBaselineAndConfidenceTests() {
  console.log('\nRunning v8.0 Multi-Baseline & Confidence Unit Tests...');

  const comp = BaselineForecaster.getBaselineComparison('30day');
  assert.strictEqual(comp.activeBaseline.id, '30day');
  assert.strictEqual(comp.metrics.length >= 5, true);
  console.log('✓ Test 6 Passed: Multi-baseline 30-day profile evaluated');

  const forecast = BaselineForecaster.getForecast(48, 1.4);
  assert.strictEqual(forecast.storageForecast.estimatedDaysUntilCritical > 0, true);
  console.log(`✓ Test 7 Passed: Storage forecast calculated ${forecast.storageForecast.estimatedDaysUntilCritical} days until threshold`);

  const confidence = calculateConfidence([
    { source: 'kernel probe', observedValue: '88%', expectedRange: '< 75%' },
    { source: 'disk I/O', observedValue: '12 MB/s', expectedRange: '< 5 MB/s' },
  ]);
  assert.strictEqual(confidence.confidenceScore >= 85, true);
  assert.strictEqual(confidence.confidenceLabel, 'High');
  console.log(`✓ Test 8 Passed: Confidence score evaluated statistically (${confidence.confidenceScore}% ${confidence.confidenceLabel})`);
}

function main() {
  runSafetyTests();
  runCorrelationEngineTests();
  runBaselineAndConfidenceTests();
  console.log('\n=============================================');
  console.log('All v8.0 Safety & Diagnostic Unit Tests Passed!');
  console.log('=============================================');
}

main();
