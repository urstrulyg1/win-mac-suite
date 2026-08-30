/**
 * WinSuite & MacSuite v9.0 - Comprehensive Unit & Failure Injection Test Suite
 */

import assert from 'assert';
import { executeAllowlistedAction, ALLOWLISTED_ACTIONS } from '../security/action-allowlist.js';
import { DiagnosticKnowledgeGraph } from '../engine/knowledge-graph.js';
import { DiagnosticExperimentEngine } from '../engine/experiment-engine.js';
import { incidentManager, INCIDENT_STATUS } from '../engine/incident-manager.js';
import { RecommendationEngine } from '../engine/recommendation-engine.js';
import { VerificationEngine } from '../engine/verification-engine.js';

async function runSecurityAllowlistTests() {
  console.log('Running v9.0 Security Allowlist Tests...');

  // Test 1: Valid allowlisted action passes
  const valid = await executeAllowlistedAction('network.flushDNS');
  assert.strictEqual(valid.authorized, true);
  console.log('✓ Test 1 Passed: Allowlisted action network.flushDNS authorized');

  // Test 2: Unallowlisted action rejected
  await assert.rejects(async () => {
    await executeAllowlistedAction('arbitrary.hack.script');
  }, /SECURITY ALLOWLIST VIOLATION/);
  console.log('✓ Test 2 Passed: Unallowlisted action rejected with 403 Forbidden boundary');

  // Test 3: Non-numeric port injection rejected
  await assert.rejects(async () => {
    await executeAllowlistedAction('process.killPort', { port: '3000; rm -rf /' });
  }, /Invalid port parameter/);
  console.log('✓ Test 3 Passed: Metacharacter injection in process.killPort strictly rejected');
}

function runKnowledgeGraphTests() {
  console.log('\nRunning v9.0 Diagnostic Knowledge Graph Tests...');

  const graph = new DiagnosticKnowledgeGraph();
  const chain = graph.findCausalChain('ChromeCrashEvent');
  assert.strictEqual(chain.length > 0, true);
  assert.strictEqual(chain[0].rootCause, 'DockerDesktop');
  assert.strictEqual(chain[0].confidence > 80, true);
  console.log(`✓ Test 4 Passed: Knowledge Graph inferred causal chain: ${chain[0].summary} (Confidence: ${chain[0].confidence}%)`);
}

async function runExperimentAndVerificationTests() {
  console.log('\nRunning v9.0 Experiment & Verification Tests...');

  const exp = await DiagnosticExperimentEngine.runExperiment('exp-docker-ram');
  // Experiments return null results until actually executed with real before/after measurement
  assert.strictEqual(exp.resultDelta, null);
  assert.strictEqual(exp.status, 'REQUIRES_EXECUTION');
  console.log(`✓ Test 5 Passed: Diagnostic Experiment correctly reports REQUIRES_EXECUTION (no fabricated results)`);

  const ver = await VerificationEngine.verifyExecution('network.flushDNS', async () => {});
  assert.strictEqual(ver.verified, true);
  assert.strictEqual(ver.afterState.latencyMs < 100, true);
  console.log('✓ Test 6 Passed: Universal Before/After Verification Engine confirmed post-condition');
}

function runRecommendationAndIncidentTests() {
  console.log('\nRunning v9.0 Recommendation & Incident Lifecycle Tests...');

  const ranked = RecommendationEngine.getRankedRecommendations();
  assert.strictEqual(ranked.length >= 3, true);
  assert.strictEqual(ranked[0].compositeScore >= ranked[1].compositeScore, true);
  console.log(`✓ Test 7 Passed: Ranked ${ranked.length} recommendations by (Impact × Confidence × Safety). Top: "${ranked[0].title}" (Score: ${ranked[0].compositeScore})`);

  const updated = incidentManager.updateIncidentStatus('inc-1042', INCIDENT_STATUS.VERIFIED, 'Memory pressure normalized to 44%.');
  assert.strictEqual(updated.verified, true);
  assert.strictEqual(updated.status, INCIDENT_STATUS.VERIFIED);
  console.log('✓ Test 8 Passed: Incident lifecycle transitioned to VERIFIED with audit evidence');
}

async function main() {
  await runSecurityAllowlistTests();
  runKnowledgeGraphTests();
  await runExperimentAndVerificationTests();
  runRecommendationAndIncidentTests();
  console.log('\n======================================================');
  console.log('All v9.0 Production Intelligence Unit Tests Passed!');
  console.log('======================================================');
}

main();
