/**
 * v10 trust and safety routes.
 * Runtime observations must come from real probes or command execution.
 * Configuration metadata is never emitted as observed machine state.
 */
import express from 'express';
import { getSafeModeStatus, activateSafeMode, deactivateSafeMode } from '../security/safe-mode.js';
import { AVAILABILITY, HEALTH_STATUS, createSubsystemReport, aggregateReports, validateContract } from '../core/contract.js';
import { PERMISSION, PERMISSION_SCENARIOS, buildPermissionMatrix, createPermissionState, resolveFeatureAvailability, FEATURE_PERMISSION_MATRIX } from '../core/permissions.js';
import { calibrationEngine } from '../core/calibration.js';
import { operationRegistry } from '../runtime/operations.js';
import { ACTION_POLICIES } from '../runtime/idempotency.js';
import { getDegradedModeStatus } from '../runtime/degraded-mode.js';
import { faultInjector, FAULT_SCENARIOS } from '../chaos/fault-injector.js';
import { redactReport, redactText } from '../privacy/redactor.js';
import { SCHEMA_REGISTRY, REQUEST_SCHEMAS, validateRequest, createErrorResponse, enforceResponse } from '../contracts/api-schemas.js';

const router = express.Router();

router.get('/health', async (_req, res) => {
  try {
    const runtime = await getDegradedModeStatus();
    const perms = createPermissionState({});
    const defs = [
      ['hardware', 'Hardware & Inventory', 'system.hardware'],
      ['storage', 'Storage Doctor', 'storage.overview'],
      ['memory', 'Memory & Performance', 'processes.list'],
      ['battery', 'Battery & Power', 'battery.health'],
      ['network', 'Network Doctor', 'network.diagnostics'],
      ['security', 'Security Posture', 'security.posture'],
      ['crashes', 'Crash & Stability', 'crashes.reports'],
      ['developer', 'Developer Environment', 'developer.toolchains'],
    ];
    const reports = defs.map(([subsystem, displayName, feature]) => {
      const resolved = resolveFeatureAvailability(feature, perms);
      // Permission availability is not a health observation. No probe has run here.
      return createSubsystemReport({
        subsystem,
        displayName,
        availability: resolved.availability,
        status: HEALTH_STATUS.INFORMATIONAL,
        findings: [],
        evidence: [],
        recommendations: (resolved.grantInstructions || []).map((g) => ({ label: `Grant ${g.label}`, description: g.howToGrant })),
        requiredPermissions: resolved.requiredPermissions || [],
        missingPermissions: resolved.missing || [],
        degradedReason: resolved.degradedReason || 'No live subsystem probe was executed by this endpoint.',
        dataSources: [],
      });
    });
    const rollup = aggregateReports(reports);
    const contractErrors = reports.map((r) => ({ subsystem: r.subsystem, ...validateContract(r) })).filter((v) => !v.valid);
    res.json({ ...rollup, runtime: { online: runtime.online, offlineFirst: true, message: runtime.message }, contractSelfCheck: { allValid: contractErrors.length === 0, violations: contractErrors } });
  } catch (err) {
    res.status(500).json(createErrorResponse({ code: 'HEALTH_ROLLUP_FAILED', error: err.message, remediation: 'Individual subsystem endpoints remain available.' }));
  }
});

router.get('/permissions/matrix', (req, res) => {
  const granted = {};
  for (const key of Object.values(PERMISSION)) if (req.query[key] !== undefined) granted[key] = req.query[key] === 'true';
  const state = createPermissionState(granted);
  res.json({ version: '10.0', permissionState: state, matrix: buildPermissionMatrix(state), featureCount: Object.keys(FEATURE_PERMISSION_MATRIX).length });
});

router.get('/permissions/scenarios', (_req, res) => {
  const entries = Object.entries(PERMISSION_SCENARIOS);
  res.json({ version: '10.0', scenarioCount: entries.length, scenarios: entries.map(([id, state]) => {
    const matrix = buildPermissionMatrix(state, 'macos', { mdmBlocked: id === 'corporate-managed' ? [PERMISSION.FULL_DISK_ACCESS, PERMISSION.ADMIN] : [] });
    return { id, permissionState: state, counts: matrix.counts, coveragePct: matrix.coveragePct, blockedByPolicy: matrix.features.filter((f) => f.blockedByPolicy.length).map((f) => f.featureId) };
  }) });
});

router.get('/runtime/status', async (_req, res) => res.json(await getDegradedModeStatus()));

router.get('/operations', (req, res) => {
  const { actionId, state, limit } = req.query;
  res.json({ version: '10.0', stats: operationRegistry.stats(), policies: Object.keys(ACTION_POLICIES), operations: operationRegistry.list({ actionId: actionId || undefined, state: state || undefined, limit: limit ? parseInt(limit, 10) : 50 }) });
});

router.get('/operations/:operationId', (req, res) => {
  const op = operationRegistry.get(req.params.operationId);
  if (!op) return res.status(404).json(createErrorResponse({ code: 'OPERATION_NOT_FOUND', error: `No operation with ID ${req.params.operationId}.`, recoverable: false }));
  res.json(op);
});

router.get('/calibration', (_req, res) => res.json(calibrationEngine.report()));
router.get('/calibration/predictions', (req, res) => res.json({ predictions: calibrationEngine.listPredictions({ category: req.query.category || null, outcome: req.query.outcome || null, limit: req.query.limit ? parseInt(req.query.limit, 10) : 100 }) }));
router.post('/calibration/resolve', validateRequest('POST /api/calibration/resolve'), (req, res) => {
  const { predictionId, outcome, source, note } = req.body;
  const result = calibrationEngine.resolvePrediction(predictionId, { outcome, source, note });
  if (!result.ok) return res.status(400).json(createErrorResponse({ code: 'PREDICTION_RESOLVE_FAILED', error: result.error, recoverable: false }));
  res.json({ ok: true, prediction: result.prediction, categoryAccuracy: calibrationEngine.accuracyFor(result.prediction.category) });
});

router.get('/chaos/status', (_req, res) => res.json(faultInjector.status()));
router.post('/chaos/arm', validateRequest('POST /api/chaos/arm'), (req, res) => {
  const { scenario, target = null, triggers = 1 } = req.body;
  if (!FAULT_SCENARIOS[scenario]) return res.status(400).json(createErrorResponse({ code: 'UNKNOWN_FAULT_SCENARIO', error: `"${scenario}" is not a known fault scenario.`, recoverable: false }));
  res.json(faultInjector.arm({ scenario, target, triggers }));
});
router.post('/chaos/disarm', (_req, res) => res.json(faultInjector.disarm()));

router.post('/privacy/preview', (req, res) => res.json({ version: '10.0', ...redactReport(req.body?.payload !== undefined ? req.body.payload : req.body) }));
router.post('/privacy/redact-text', (req, res) => {
  const text = String(req.body?.text ?? '');
  const ctx = { hits: [] };
  res.json({ redacted: redactText(text, ctx), replacements: ctx.hits?.length ?? 0 });
});

router.get('/contracts/schemas', (_req, res) => {
  const describe = (spec) => Object.fromEntries(Object.entries(spec).map(([k, v]) => [k, { required: !!v.required, expects: v.describe }]));
  res.json({ version: '10.0', responseSchemas: Object.fromEntries(Object.entries(SCHEMA_REGISTRY).map(([k, v]) => [k, describe(v)])), requestSchemas: Object.fromEntries(Object.entries(REQUEST_SCHEMAS).map(([k, v]) => [k, describe(v)])) });
});

router.get('/contracts/enforcement-demo', (_req, res) => {
  const malformed = { contractVersion: '10.0', subsystem: 'storage', status: 'HEALTHY', availability: 'FAILED', severity: 'none', summary: 'invalid test input', findings: 'not-an-array', evidence: [], recommendations: [], requiredPermissions: [], errors: [], degraded: false, lastUpdated: 'invalid' };
  const enforced = enforceResponse(malformed, SCHEMA_REGISTRY.subsystemReport, 'storage subsystem report');
  res.json({ inputWasMalformed: true, contractCheck: validateContract(malformed), schemaViolations: enforced.violations, whatTheClientReceives: enforced.payload });
});

/**
 * Capability inventory. This endpoint intentionally reports only what has been
 * checked during this request. Static feature definitions are not observations.
 */
router.get('/capabilities-matrix', (_req, res) => {
  const features = [
    ['Battery Doctor & Sleep Drain', 'battery-provider (pmset/ioreg)', '/api/battery/intelligence'],
    ['Storage Doctor & APFS Snapshots', 'storage-provider (diskutil/du)', '/api/storage'],
    ['Memory & Performance Doctor', 'systeminformation / vm_stat', '/api/performance/diagnosis'],
    ['macOS Software Update Health', 'softwareupdate CLI probe', '/api/diagnostics/update-doctor'],
    ['Crash & Hang Intelligence', 'DiagnosticReports parser', '/api/diagnostics/crashes-hangs'],
    ['Network Doctor & Sockets', 'lsof & scutil network probe', '/api/network/listening-ports'],
    ['Developer Doctor', 'Developer toolchain probes', '/api/developer/health'],
    ['Apple Services & Continuity', 'macOS daemon status probe', '/api/diagnostics/apple-services'],
    ['Full Disk Access Sensitive Tree', 'TCC reader', '/api/permissions'],
  ];
  const matrix = features.map(([feature, provider, api]) => ({
    feature,
    provider,
    api,
    permission: 'NOT_CHECKED',
    dataAvailable: 'NOT_CHECKED',
    actionAvailable: 'NOT_CHECKED',
    verification: 'NOT_CHECKED',
    status: 'NOT_CHECKED',
    evidence: [],
  }));
  res.json({ platform: process.platform, matrix, totalFeatures: matrix.length, checkedFeatures: 0, timestamp: new Date().toISOString(), note: 'No capability probe was executed by this endpoint; no capability is claimed available.' });
});

router.get('/evidence/quality-demo', (_req, res) => res.json({ evidence: [], renderingRule: 'Only runtime evidence may be rendered as an observation. Missing evidence is displayed as unavailable or not checked.' }));
router.get('/safe-mode/status', (_req, res) => res.json(getSafeModeStatus()));
router.get('/safe-mode', (_req, res) => res.json(getSafeModeStatus()));
router.post('/safe-mode/activate', (req, res) => res.json(activateSafeMode(req.body?.source || 'client')));
router.post('/safe-mode/deactivate', (req, res) => res.json(deactivateSafeMode(req.body?.source || 'client')));

export default router;
