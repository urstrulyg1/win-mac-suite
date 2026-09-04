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

  // Empty graph invents nothing: no seeded Chrome/Docker telemetry, no causal chain without evidence.
  const graph = new DiagnosticKnowledgeGraph();
  const chain = graph.findCausalChain('ChromeCrashEvent');
  assert.strictEqual(Array.isArray(chain), true);
  assert.strictEqual(chain.length, 0);
  console.log('✓ Test 4 Passed: Knowledge Graph returns no invented causal chain without observed relationships');
}

async function runExperimentAndVerificationTests() {
  console.log('\nRunning v9.0 Experiment & Verification Tests...');

  const exp = await DiagnosticExperimentEngine.runExperiment('exp-docker-ram');
  // Experiments return null results until actually executed with real before/after measurement
  assert.strictEqual(exp.resultDelta, null);
  assert.strictEqual(exp.status, 'REQUIRES_EXECUTION');
  console.log(`✓ Test 5 Passed: Diagnostic Experiment correctly reports REQUIRES_EXECUTION (no fabricated results)`);

  // No measurements supplied -> explicitly unverified, never a fabricated 14ms PASS.
  const ver = await VerificationEngine.verifyExecution('network.flushDNS', async () => {});
  assert.strictEqual(ver.verified, false);
  assert.strictEqual(ver.beforeState, null);
  assert.strictEqual(ver.afterState, null);
  console.log('✓ Test 6 Passed: Verification Engine reports inconclusive without measurements (no fabricated post-condition)');

  // Supplied measurements verify honestly.
  const ver2 = await VerificationEngine.verifyExecution('network.flushDNS', async () => {}, {
    preState: { dnsResolution: 'FAIL' },
    postState: { dnsResolution: 'PASS', latencyMs: 14 },
    verified: true,
  });
  assert.strictEqual(ver2.verified, true);
  console.log('✓ Test 6b Passed: Verification Engine verifies when real measurements are supplied');
}

function runRecommendationAndIncidentTests() {
  console.log('\nRunning v9.0 Recommendation & Incident Lifecycle Tests...');

  // No observed findings -> no invented recommendations (no 14.2 GB / 96% fabrications).
  const ranked = RecommendationEngine.getRankedRecommendations();
  assert.strictEqual(Array.isArray(ranked), true);
  assert.strictEqual(ranked.length, 0);
  console.log('✓ Test 7 Passed: Recommendation engine returns no invented recommendations without observed findings');

  // Observed findings rank honestly.
  const ranked2 = RecommendationEngine.getRankedRecommendations([
    { id: 'rec-a', title: 'Observed issue A', impact: 80, confidence: 70, safety: 90, category: 'storage', actionId: 'storage.inspect' },
    { id: 'rec-b', title: 'Observed issue B', impact: 50, confidence: 50, safety: 50, category: 'storage', actionId: 'storage.inspect' },
  ]);
  assert.strictEqual(ranked2.length, 2);
  assert.strictEqual(ranked2[0].compositeScore >= ranked2[1].compositeScore, true);
  assert.strictEqual(ranked2[0].reclaimedEstimate, null);
  console.log('✓ Test 7b Passed: Observed findings rank without invented reclaim figures');

  // No seeded incidents: the store starts empty and only records observed incidents.
  assert.strictEqual(incidentManager.getAllIncidents().length, 0);
  const recorded = incidentManager.recordIncident({ id: 'inc-observed-1', title: 'Observed memory pressure', status: INCIDENT_STATUS.CONFIRMED });
  assert.strictEqual(recorded.id, 'inc-observed-1');
  const updated = incidentManager.updateIncidentStatus('inc-observed-1', INCIDENT_STATUS.VERIFIED, 'Observed verification evidence.');
  assert.strictEqual(updated.verified, true);
  assert.strictEqual(updated.status, INCIDENT_STATUS.VERIFIED);
  assert.strictEqual(incidentManager.updateIncidentStatus('inc-1042', INCIDENT_STATUS.VERIFIED), null);
  console.log('✓ Test 8 Passed: Incident lifecycle records observed incidents only (no seeded inc-1042)');
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
