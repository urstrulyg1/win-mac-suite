/**
 * WinSuite & MacSuite v10.1 — Intelligence API (P1-A)
 *
 * Mounted at /api/intelligence. Exposes the causal reasoner, the incident
 * intelligence centre and the diagnostic experiment workflow.
 *
 * Every response here is derived from telemetry passed in or held in the incident
 * store. No endpoint fabricates a metric, and no endpoint upgrades a correlation into
 * a causal claim.
 */

import express from 'express';
import { analyzeCauses, renderAnalysisText, SLOWNESS_HYPOTHESES } from '../intelligence/causal-reasoner.js';
import { incidentIntelligence, INCIDENT_STATUS, computeCorrelation } from '../intelligence/incident-intelligence.js';
import { experimentCenter, evidenceLedger, EXPERIMENT_CATALOGUE } from '../intelligence/experiment-center.js';
import { collectTelemetry, DISCRIMINATOR_KEYS } from '../intelligence/telemetry-collector.js';
import { createErrorResponse } from '../contracts/api-schemas.js';

const router = express.Router();

// createErrorResponse's human-readable field is `error`, not `message`.
const fail = (res, status, code, error, remediation) =>
  res.status(status).json(createErrorResponse({ code, error, remediation }));

/* ─────────────────────────── Causal reasoning ─────────────────────────── */

/** The catalogue of causes the reasoner can evaluate, with their discriminators. */
router.get('/hypotheses', (_req, res) => {
  res.json({
    schemaVersion: '10.1',
    hypotheses: SLOWNESS_HYPOTHESES.map((h) => ({
      id: h.id,
      label: h.label,
      category: h.category,
      mechanism: h.mechanism,
      discriminators: h.discriminators.map((d) => ({
        key: d.key, label: d.label, weight: d.weight, decisive: d.decisive,
      })),
    })),
    note: 'Each discriminator is evaluated against real telemetry. A discriminator whose telemetry is missing is recorded as indeterminate and never counted as evidence against its hypothesis.',
  });
});

/** POST { telemetry, question } → ranked causes including "Why NOT?" rejections. */
router.post('/analyze', (req, res) => {
  const { telemetry, question } = req.body || {};
  if (!telemetry || typeof telemetry !== 'object' || Array.isArray(telemetry)) {
    return fail(res, 400, 'INVALID_REQUEST', 'A telemetry object is required.',
      'POST { "telemetry": { "memoryPressurePct": 87, ... } }. The reasoner never invents measurements, so it cannot run without them.');
  }
  const analysis = analyzeCauses(telemetry, question ? { question } : undefined);
  res.json({ ...analysis, rendered: renderAnalysisText(analysis) });
});

/**
 * Live telemetry collection. Returns only the discriminators that were genuinely
 * measured, plus an explicit account of the ones that were not and why.
 */
router.get('/telemetry', async (_req, res) => {
  try {
    res.json(await collectTelemetry());
  } catch (err) {
    return fail(res, 503, 'TELEMETRY_UNAVAILABLE', `Telemetry collection failed: ${err.message}`,
      'No diagnosis is offered without measurements. Retry, or check that the process can read system statistics.');
  }
});

/**
 * The end-to-end path: collect real telemetry, then reason over it. This is the
 * endpoint the UI uses, so the "Why is my Mac slow?" answer is always grounded in
 * probes rather than in a fixture supplied by the caller.
 */
router.get('/diagnose', async (req, res) => {
  try {
    const collection = await collectTelemetry();
    const question = typeof req.query.question === 'string' ? req.query.question : 'Why is my Mac slow?';
    const analysis = analyzeCauses(collection.telemetry, { question });
    res.json({
      ...analysis,
      rendered: renderAnalysisText(analysis),
      collection: {
        collectedAt: collection.collectedAt,
        platform: collection.platform,
        coverage: collection.coverage,
        evidence: collection.evidence,
        unavailable: collection.unavailable,
        evidenceQuality: collection.evidenceQuality,
        subjects: collection.subjects,
      },
      discriminatorKeys: DISCRIMINATOR_KEYS,
    });
  } catch (err) {
    return fail(res, 503, 'TELEMETRY_UNAVAILABLE', `Diagnosis could not run: ${err.message}`,
      'The reasoner will not produce a ranking without measurements.');
  }
});

/** Open an incident directly from live telemetry rather than caller-supplied numbers. */
router.post('/incidents/from-telemetry', async (req, res) => {
  const { title, category, severity, symptom, subsystems } = req.body || {};
  if (!title || typeof title !== 'string') {
    return fail(res, 400, 'INVALID_REQUEST', 'An incident title is required.', 'POST { "title": "Mac feels slow" }');
  }
  try {
    const collection = await collectTelemetry();
    const inc = incidentIntelligence.open({
      title, category, severity, symptom, subsystems, telemetry: collection.telemetry,
    });
    res.status(201).json({
      ...incidentIntelligence.detail(inc.id),
      collection: { coverage: collection.coverage, unavailable: collection.unavailable, collectedAt: collection.collectedAt },
    });
  } catch (err) {
    return fail(res, 503, 'TELEMETRY_UNAVAILABLE', `Could not collect telemetry: ${err.message}`,
      'An incident opened without measurements would be an empty claim.');
  }
});

/* ─────────────────────────── Incidents ─────────────────────────── */

router.get('/incidents', (_req, res) => {
  const all = incidentIntelligence.list();
  res.json({
    schemaVersion: '10.1',
    count: all.length,
    lifecycle: Object.values(INCIDENT_STATUS),
    incidents: all.map((i) => ({
      id: i.id,
      title: i.title,
      severity: i.severity,
      status: i.status,
      category: i.category,
      firstObserved: i.firstObserved,
      lastObserved: i.lastObserved,
      occurrenceCount: i.occurrenceCount,
      leadingCause: i.causeAnalysis?.leadingCause?.label || null,
      confidence: i.causeAnalysis?.leadingCause?.confidence ?? null,
      evidenceCount: i.evidence.length,
      operationIds: i.operationIds,
    })),
  });
});

router.get('/incidents/:id', (req, res) => {
  const detail = incidentIntelligence.detail(req.params.id);
  if (!detail) return fail(res, 404, 'INCIDENT_NOT_FOUND', `No incident "${req.params.id}".`, 'List incidents at GET /api/intelligence/incidents.');
  res.json(detail);
});

router.post('/incidents', (req, res) => {
  const { title, category, severity, symptom, subsystems, telemetry } = req.body || {};
  if (!title || typeof title !== 'string') {
    return fail(res, 400, 'INVALID_REQUEST', 'An incident title is required.', 'POST { "title": "...", "telemetry": {...} }');
  }
  const inc = incidentIntelligence.open({ title, category, severity, symptom, subsystems, telemetry });
  res.status(201).json(incidentIntelligence.detail(inc.id));
});

/** Append a causal-timeline event. */
router.post('/incidents/:id/events', (req, res) => {
  const inc = incidentIntelligence.get(req.params.id);
  if (!inc) return fail(res, 404, 'INCIDENT_NOT_FOUND', `No incident "${req.params.id}".`, 'Create it first.');
  const { at, label } = req.body || {};
  if (!at || !label) {
    return fail(res, 400, 'INVALID_REQUEST', 'Each timeline event needs "at" (ISO timestamp) and "label".', 'POST { "at": "2026-08-19T10:00:00Z", "label": "Docker started" }');
  }
  const evt = incidentIntelligence.addTimelineEvent(req.params.id, req.body);
  res.status(201).json(evt);
});

/** Validated lifecycle transition. Illegal transitions are refused with an explanation. */
router.post('/incidents/:id/transition', (req, res) => {
  const { status, note, operationId } = req.body || {};
  if (!Object.values(INCIDENT_STATUS).includes(status)) {
    return fail(res, 400, 'INVALID_REQUEST', `"${status}" is not a valid incident status.`,
      `Valid: ${Object.values(INCIDENT_STATUS).join(', ')}`);
  }
  try {
    const inc = incidentIntelligence.transition(req.params.id, status, note, { operationId });
    if (!inc) return fail(res, 404, 'INCIDENT_NOT_FOUND', `No incident "${req.params.id}".`, 'Create it first.');
    res.json(incidentIntelligence.detail(req.params.id));
  } catch (err) {
    // A refused transition is a policy decision, not a server error.
    return fail(res, 409, 'ILLEGAL_TRANSITION', err.message,
      'The incident lifecycle is enforced: a repair cannot be resolved before it is verified.');
  }
});

/** Correlation between two timestamps — explicitly not a causal claim. */
router.post('/correlate', (req, res) => {
  const { triggerAt, symptomAt, priorCooccurrences, priorTriggerOccurrences } = req.body || {};
  if (!triggerAt || !symptomAt) {
    return fail(res, 400, 'INVALID_REQUEST', '"triggerAt" and "symptomAt" are required.', 'Both must be ISO 8601 timestamps.');
  }
  res.json(computeCorrelation({ triggerAt, symptomAt, priorCooccurrences, priorTriggerOccurrences }));
});

/* ─────────────────────────── Experiments ─────────────────────────── */

router.get('/experiments/catalogue', (_req, res) => {
  res.json({
    schemaVersion: '10.1',
    experiments: Object.values(EXPERIMENT_CATALOGUE).map((e) => ({
      id: e.id, title: e.title, category: e.category,
      hypothesis: e.hypothesisTemplate,
      intervention: e.intervention, reversal: e.reversal,
      metrics: e.metrics, primaryMetric: e.primaryMetric,
      durationSec: e.durationSec, risk: e.risk, confounders: e.confounders,
    })),
    limitation: 'A single experiment never establishes permanent causal truth. Results are recorded as evidence strength and accumulated across runs.',
  });
});

router.get('/experiments', (_req, res) => {
  res.json({
    schemaVersion: '10.1',
    experiments: experimentCenter.list().map((e) => ({
      experimentId: e.experimentId, catalogueId: e.catalogueId, stage: e.stage,
      hypothesis: e.hypothesis, incidentId: e.incidentId,
      strength: e.result?.strength || null, createdAt: e.createdAt,
    })),
  });
});

router.get('/experiments/:id', (req, res) => {
  const exp = experimentCenter.get(req.params.id);
  if (!exp) return fail(res, 404, 'EXPERIMENT_NOT_FOUND', `No experiment "${req.params.id}".`, 'Propose one first.');
  res.json({ ...exp, rendered: exp.result ? experimentCenter.renderResultText(exp.experimentId) : null });
});

/** Stage 1–3: propose. Runs nothing. */
router.post('/experiments/propose', (req, res) => {
  const { catalogueId, incidentId, hypothesis, motivatingEvidence, subject } = req.body || {};
  if (!EXPERIMENT_CATALOGUE[catalogueId]) {
    return fail(res, 400, 'UNKNOWN_EXPERIMENT', `"${catalogueId}" is not a known experiment.`,
      `Choose one of: ${Object.keys(EXPERIMENT_CATALOGUE).join(', ')}`);
  }
  const exp = experimentCenter.propose({ catalogueId, incidentId, hypothesis, motivatingEvidence, subject });
  if (incidentId) incidentIntelligence.attachExperiment(incidentId, exp);
  res.status(201).json(exp);
});

/** Stage 4: explicit approval. Nothing runs without this. */
router.post('/experiments/:id/approve', (req, res) => {
  try {
    res.json(experimentCenter.approve(req.params.id, req.body || {}));
  } catch (err) {
    return fail(res, 409, 'APPROVAL_REFUSED', err.message, 'An experiment can only be approved while it is awaiting approval.');
  }
});

router.post('/experiments/:id/reject', (req, res) => {
  try {
    res.json(experimentCenter.reject(req.params.id, req.body || {}));
  } catch (err) {
    return fail(res, 404, 'EXPERIMENT_NOT_FOUND', err.message, 'Propose the experiment first.');
  }
});

/** Stage 5: baseline. */
router.post('/experiments/:id/before', (req, res) => {
  const { telemetry } = req.body || {};
  if (!telemetry) return fail(res, 400, 'INVALID_REQUEST', 'A telemetry snapshot is required.', 'POST { "telemetry": { ... } }');
  try {
    res.json(experimentCenter.captureBefore(req.params.id, telemetry));
  } catch (err) {
    return fail(res, 409, 'STAGE_VIOLATION', err.message, 'Approve the experiment before capturing a baseline.');
  }
});

/** Stage 6–7: after snapshot. */
router.post('/experiments/:id/after', (req, res) => {
  const { telemetry, operationId } = req.body || {};
  if (!telemetry) return fail(res, 400, 'INVALID_REQUEST', 'A telemetry snapshot is required.', 'POST { "telemetry": { ... } }');
  try {
    res.json(experimentCenter.captureAfter(req.params.id, telemetry, { operationId }));
  } catch (err) {
    return fail(res, 409, 'STAGE_VIOLATION', err.message, 'Capture a baseline before an after-state.');
  }
});

/** Stage 8–9: difference + evidence strength (never a verdict of fact). */
router.post('/experiments/:id/analyze', (req, res) => {
  try {
    const exp = experimentCenter.analyze(req.params.id);
    if (exp.incidentId) incidentIntelligence.attachExperiment(exp.incidentId, exp);
    res.json({ ...exp, rendered: experimentCenter.renderResultText(exp.experimentId) });
  } catch (err) {
    return fail(res, 409, 'STAGE_VIOLATION', err.message, 'Both before and after snapshots are required.');
  }
});

/** The accumulated cross-run evidence body for every hypothesis tested so far. */
router.get('/evidence-ledger', (_req, res) => {
  res.json({
    schemaVersion: '10.1',
    bodies: evidenceLedger.all(),
    note: 'Conclusions here are working conclusions from repeated observation. None is treated as established causal fact, and a contradicting run downgrades an existing conclusion.',
  });
});

export default router;
