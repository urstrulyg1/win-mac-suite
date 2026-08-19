/**
 * WinSuite & MacSuite v10.0 — API Contract Schemas (P0 #6)
 *
 * Request schema → Response schema → Error schema.
 *
 * The point of this file: a malformed macOS command output must NEVER produce a
 * malformed API response. Every response leaving the server is validated against the
 * declared schema; if it does not conform we emit a well-formed CONTRACT_VIOLATION
 * error envelope instead of leaking a half-parsed object to the UI.
 *
 * Deliberately dependency-free (no ajv/zod) — this ships inside a local agent.
 */

import { AVAILABILITY, HEALTH_STATUS } from '../core/contract.js';
import { EVIDENCE_QUALITY } from '../core/evidence.js';

/* ────────────────────────────── primitive validators ───────────────────────── */

export const T = {
  string: (v) => typeof v === 'string',
  nonEmptyString: (v) => typeof v === 'string' && v.trim().length > 0,
  number: (v) => typeof v === 'number' && Number.isFinite(v),
  int: (v) => Number.isInteger(v),
  boolean: (v) => typeof v === 'boolean',
  array: (v) => Array.isArray(v),
  object: (v) => v !== null && typeof v === 'object' && !Array.isArray(v),
  isoDate: (v) => typeof v === 'string' && !Number.isNaN(Date.parse(v)),
  nullable: (fn) => (v) => v === null || v === undefined || fn(v),
  enumOf: (values) => (v) => values.includes(v),
  port: (v) => Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 65535,
  arrayOf: (fn) => (v) => Array.isArray(v) && v.every(fn),
  operationId: (v) => typeof v === 'string' && /^op_[0-9a-f]{6}$/.test(v),
};

/**
 * Validate a value against a flat field spec.
 * spec = { fieldName: { type: fn, required: bool, describe: string } }
 */
export function validateShape(value, spec, path = '') {
  const violations = [];
  if (!T.object(value)) {
    return [{ path: path || '<root>', message: 'expected an object' }];
  }
  for (const [key, rule] of Object.entries(spec)) {
    const here = path ? `${path}.${key}` : key;
    const present = value[key] !== undefined && value[key] !== null;
    if (rule.required && !present) {
      violations.push({ path: here, message: `missing required field (${rule.describe || 'required'})` });
      continue;
    }
    if (!present) continue;
    if (rule.type && !rule.type(value[key])) {
      violations.push({ path: here, message: `invalid type — expected ${rule.describe || 'valid value'}, got ${JSON.stringify(value[key])?.slice(0, 60)}` });
    }
  }
  return violations;
}

/* ────────────────────────────── ERROR SCHEMA ───────────────────────────────── */

/**
 * The ONLY error shape the API is allowed to emit.
 * Every failure is: identifiable, explainable, recoverable-or-not, and actionable.
 */
export const ERROR_SCHEMA = {
  ok: { type: T.boolean, required: true, describe: 'boolean false' },
  code: { type: T.nonEmptyString, required: true, describe: 'machine-readable error code' },
  error: { type: T.nonEmptyString, required: true, describe: 'human-readable message' },
  recoverable: { type: T.boolean, required: true, describe: 'boolean' },
  remediation: { type: T.nullable(T.string), required: false, describe: 'string or null' },
  operationId: { type: T.nullable(T.string), required: false, describe: 'op_xxxxxx or null' },
  timestamp: { type: T.isoDate, required: true, describe: 'ISO-8601 timestamp' },
};

export function createErrorResponse({
  code = 'UNEXPECTED_ERROR',
  error = 'The operation failed.',
  recoverable = true,
  remediation = null,
  operationId = null,
  details = null,
}) {
  return {
    ok: false,
    code,
    error,
    recoverable,
    remediation,
    operationId,
    details,
    timestamp: new Date().toISOString(),
  };
}

/* ────────────────────────────── RESPONSE SCHEMAS ───────────────────────────── */

export const EVIDENCE_ITEM_SCHEMA = {
  key: { type: T.nonEmptyString, required: true, describe: 'string key' },
  label: { type: T.nonEmptyString, required: true, describe: 'display label' },
  quality: { type: T.enumOf(Object.values(EVIDENCE_QUALITY)), required: true, describe: `one of ${Object.values(EVIDENCE_QUALITY).join('|')}` },
  qualityLabel: { type: T.nonEmptyString, required: true, describe: 'string' },
  trustWeight: { type: T.number, required: true, describe: 'number 0..1' },
  displayValue: { type: T.nonEmptyString, required: true, describe: 'preformatted display string' },
  isFact: { type: T.boolean, required: true, describe: 'boolean' },
  source: { type: T.nonEmptyString, required: true, describe: 'probe name' },
  collectedAt: { type: T.isoDate, required: true, describe: 'ISO-8601 timestamp' },
};

export const FINDING_SCHEMA = {
  id: { type: T.nonEmptyString, required: true, describe: 'finding id' },
  schemaVersion: { type: T.nonEmptyString, required: true, describe: 'schema version string' },
  category: { type: T.nonEmptyString, required: true, describe: 'category string' },
  severity: { type: T.enumOf(['critical', 'warning', 'info', 'healthy', 'high', 'medium', 'low', 'none']), required: true, describe: 'severity enum' },
  title: { type: T.nonEmptyString, required: true, describe: 'title' },
  evidence: { type: T.array, required: true, describe: 'array of evidence items' },
  confidence: { type: T.number, required: true, describe: 'number 0..100' },
  confidenceLabel: { type: T.enumOf(['High', 'Medium', 'Low']), required: true, describe: 'High|Medium|Low' },
  evidenceQuality: { type: T.object, required: true, describe: 'evidence quality summary' },
  dataCompleteness: { type: T.nonEmptyString, required: true, describe: 'COMPLETE or PARTIAL explanation' },
  detectedAt: { type: T.isoDate, required: true, describe: 'ISO-8601 timestamp' },
};

/** The unified global system health contract (P2 #23). */
export const SUBSYSTEM_REPORT_SCHEMA = {
  contractVersion: { type: T.nonEmptyString, required: true, describe: 'contract version' },
  subsystem: { type: T.nonEmptyString, required: true, describe: 'subsystem id' },
  status: { type: T.enumOf(Object.values(HEALTH_STATUS)), required: true, describe: Object.values(HEALTH_STATUS).join('|') },
  statusGlyph: { type: T.nonEmptyString, required: true, describe: 'status glyph' },
  availability: { type: T.enumOf(Object.values(AVAILABILITY)), required: true, describe: Object.values(AVAILABILITY).join('|') },
  severity: { type: T.nonEmptyString, required: true, describe: 'severity' },
  summary: { type: T.nonEmptyString, required: true, describe: 'human summary' },
  findings: { type: T.array, required: true, describe: 'array' },
  evidence: { type: T.array, required: true, describe: 'array' },
  recommendations: { type: T.array, required: true, describe: 'array' },
  requiredPermissions: { type: T.array, required: true, describe: 'array' },
  errors: { type: T.array, required: true, describe: 'array' },
  degraded: { type: T.boolean, required: true, describe: 'boolean' },
  lastUpdated: { type: T.isoDate, required: true, describe: 'ISO-8601 timestamp' },
};

/** Every mutative action response. */
export const ACTION_RESPONSE_SCHEMA = {
  ok: { type: T.boolean, required: true, describe: 'boolean' },
  operationId: { type: T.operationId, required: true, describe: 'op_ + 6 hex chars' },
  actionId: { type: T.nonEmptyString, required: false, describe: 'action id' },
  timestamp: { type: T.isoDate, required: true, describe: 'ISO-8601 timestamp' },
};

/* ────────────────────────────── REQUEST SCHEMAS ────────────────────────────── */

/**
 * Request schemas keyed by route. Validated BEFORE anything touches the system.
 */
export const REQUEST_SCHEMAS = {
  'POST /api/actions/kill-port': {
    port: { type: T.port, required: true, describe: 'integer 1-65535' },
    idempotencyKey: { type: T.nullable(T.string), required: false, describe: 'string' },
    dryRun: { type: T.nullable(T.boolean), required: false, describe: 'boolean' },
  },
  'POST /api/actions/purge-ram': {
    idempotencyKey: { type: T.nullable(T.string), required: false, describe: 'string' },
    dryRun: { type: T.nullable(T.boolean), required: false, describe: 'boolean' },
  },
  'POST /api/actions/execute-cleanup': {
    confirmed: { type: T.boolean, required: true, describe: 'boolean true — explicit user confirmation' },
    selectedItemIds: { type: T.arrayOf(T.string), required: false, describe: 'array of string ids' },
    idempotencyKey: { type: T.nullable(T.string), required: false, describe: 'string' },
    dryRun: { type: T.nullable(T.boolean), required: false, describe: 'boolean' },
  },
  'POST /api/actions/undo-cleanup': {
    transactionId: { type: T.nonEmptyString, required: true, describe: 'transaction id' },
  },
  'POST /api/actions/remove-quarantine': {
    appName: { type: T.nonEmptyString, required: true, describe: 'application name' },
  },
  'POST /api/chaos/arm': {
    scenario: { type: T.nonEmptyString, required: true, describe: 'fault scenario id' },
    target: { type: T.nullable(T.string), required: false, describe: 'regex string or null for all' },
    triggers: { type: T.nullable(T.int), required: false, describe: 'integer' },
  },
  'POST /api/calibration/resolve': {
    predictionId: { type: T.nonEmptyString, required: true, describe: 'pred_xxxxxxxx' },
    outcome: { type: T.enumOf(['CONFIRMED', 'REFUTED', 'INCONCLUSIVE']), required: true, describe: 'CONFIRMED|REFUTED|INCONCLUSIVE' },
    source: { type: T.nonEmptyString, required: true, describe: 'evidence source for the outcome' },
    note: { type: T.nullable(T.string), required: false, describe: 'string' },
  },
};

/**
 * Express middleware factory: validates the request body against a declared schema.
 * Emits the canonical error envelope on failure — never a bare 500.
 */
export function validateRequest(routeKey) {
  const spec = REQUEST_SCHEMAS[routeKey];
  return (req, res, next) => {
    if (!spec) return next();
    const violations = validateShape(req.body || {}, spec);
    if (violations.length) {
      return res.status(400).json(createErrorResponse({
        code: 'INVALID_REQUEST',
        error: `Request does not satisfy the contract for ${routeKey}.`,
        recoverable: false,
        remediation: violations.map((v) => `${v.path}: ${v.message}`).join('; '),
        details: { routeKey, violations },
      }));
    }
    return next();
  };
}

/**
 * Validates an outbound payload. On violation returns a well-formed error envelope
 * rather than the malformed body — the core P0 #6 guarantee.
 */
export function enforceResponse(payload, schema, context = 'response') {
  const violations = validateShape(payload, schema);
  if (violations.length === 0) return { ok: true, payload, violations: [] };

  return {
    ok: false,
    violations,
    payload: createErrorResponse({
      code: 'CONTRACT_VIOLATION',
      error: `The ${context} produced by this server did not satisfy its own API contract, so it was withheld rather than returned malformed.`,
      recoverable: true,
      remediation: 'This subsystem is reported UNAVAILABLE rather than healthy. Other subsystems are unaffected.',
      details: { context, violations },
    }),
  };
}

export const SCHEMA_REGISTRY = {
  error: ERROR_SCHEMA,
  evidenceItem: EVIDENCE_ITEM_SCHEMA,
  finding: FINDING_SCHEMA,
  subsystemReport: SUBSYSTEM_REPORT_SCHEMA,
  actionResponse: ACTION_RESPONSE_SCHEMA,
};
