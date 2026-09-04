/**
 * Global health contract. Health claims require runtime evidence.
 */
export const HEALTH_STATUS = { HEALTHY: 'HEALTHY', WARNING: 'WARNING', CRITICAL: 'CRITICAL', UNAVAILABLE: 'UNAVAILABLE', INFORMATIONAL: 'INFORMATIONAL' };
export const AVAILABILITY = { AVAILABLE: 'AVAILABLE', LIMITED: 'LIMITED', REQUIRES_PERMISSION: 'REQUIRES_PERMISSION', UNSUPPORTED: 'UNSUPPORTED', FAILED: 'FAILED' };
export const SEVERITY = { NONE: 'none', INFO: 'info', LOW: 'low', MEDIUM: 'medium', HIGH: 'high', CRITICAL: 'critical' };
const SEVERITY_RANK = { none: 0, info: 1, low: 2, medium: 3, high: 4, critical: 5 };
export const STATUS_GLYPH = { HEALTHY: '🟢', WARNING: '🟡', CRITICAL: '🔴', UNAVAILABLE: '⚪', INFORMATIONAL: '🔵' };

export function statusForAvailability(availability, proposedStatus) {
  switch (availability) {
    case AVAILABILITY.AVAILABLE: return proposedStatus || HEALTH_STATUS.INFORMATIONAL;
    case AVAILABILITY.LIMITED:
      if (proposedStatus === HEALTH_STATUS.CRITICAL || proposedStatus === HEALTH_STATUS.WARNING) return proposedStatus;
      return HEALTH_STATUS.INFORMATIONAL;
    case AVAILABILITY.REQUIRES_PERMISSION:
    case AVAILABILITY.UNSUPPORTED:
    case AVAILABILITY.FAILED:
      return HEALTH_STATUS.UNAVAILABLE;
    default: return HEALTH_STATUS.UNAVAILABLE;
  }
}

export function createSubsystemReport({
  subsystem, displayName, platform = process.platform === 'darwin' ? 'macos' : process.platform === 'win32' ? 'windows' : 'unsupported',
  availability = AVAILABILITY.LIMITED, status, severity, summary = '', findings = [], evidence = [], metrics = {}, recommendations = [],
  requiredPermissions = [], missingPermissions = [], degraded = false, degradedReason = null, dataSources = [], errors = [],
  contractVersion = '10.0', lastUpdated = new Date().toISOString(),
} = {}) {
  let resolvedStatus = statusForAvailability(availability, status);
  // A HEALTHY result without evidence is never allowed to leave the contract layer.
  if (resolvedStatus === HEALTH_STATUS.HEALTHY && (!Array.isArray(evidence) || evidence.length === 0)) resolvedStatus = HEALTH_STATUS.INFORMATIONAL;
  const derivedSeverity = severity || findings.reduce((worst, f) => {
    const rank = SEVERITY_RANK[f.severity] ?? 0;
    return rank > (SEVERITY_RANK[worst] ?? 0) ? f.severity : worst;
  }, SEVERITY.NONE);
  const unavailable = resolvedStatus === HEALTH_STATUS.UNAVAILABLE;
  return {
    contractVersion, subsystem, displayName: displayName || subsystem, platform, status: resolvedStatus,
    statusGlyph: STATUS_GLYPH[resolvedStatus], availability, severity: unavailable ? SEVERITY.NONE : derivedSeverity,
    summary: summary || defaultSummary(resolvedStatus, availability, subsystem), findings, evidence, metrics, recommendations,
    requiredPermissions, missingPermissions, degraded: degraded || availability === AVAILABILITY.LIMITED, degradedReason, dataSources,
    errors: errors.map(normalizeError), lastUpdated,
  };
}

function defaultSummary(status, availability, subsystem) {
  if (availability === AVAILABILITY.REQUIRES_PERMISSION) return `${subsystem} could not be evaluated because required permission is missing. No health claim is being made.`;
  if (availability === AVAILABILITY.UNSUPPORTED) return `${subsystem} is not supported on this platform or hardware.`;
  if (availability === AVAILABILITY.FAILED) return `${subsystem} probe failed. Results are unavailable. An unavailable result is NOT the same as healthy.`;
  if (availability === AVAILABILITY.LIMITED) return `${subsystem} has not been fully evaluated. No health claim is being made.`;
  if (status === HEALTH_STATUS.HEALTHY) return `${subsystem} is operating within measured thresholds.`;
  return `${subsystem} has not produced a health observation.`;
}

function normalizeError(err) {
  if (typeof err === 'string') return { code: 'PROBE_ERROR', message: err, recoverable: true };
  return { code: err.code || 'PROBE_ERROR', message: err.message || String(err), recoverable: err.recoverable ?? true, remediation: err.remediation || null };
}

export function aggregateReports(reports = []) {
  const counts = { HEALTHY: 0, WARNING: 0, CRITICAL: 0, UNAVAILABLE: 0, INFORMATIONAL: 0 };
  for (const r of reports) counts[r.status] = (counts[r.status] || 0) + 1;
  const healthEvaluated = counts.HEALTHY + counts.WARNING + counts.CRITICAL;
  const observable = reports.length - counts.UNAVAILABLE;
  const scoreBase = healthEvaluated > 0 ? Math.round((counts.HEALTHY / healthEvaluated) * 100) : null;
  let overall = HEALTH_STATUS.INFORMATIONAL;
  if (counts.CRITICAL > 0) overall = HEALTH_STATUS.CRITICAL;
  else if (counts.WARNING > 0) overall = HEALTH_STATUS.WARNING;
  else if (counts.HEALTHY > 0) overall = HEALTH_STATUS.HEALTHY;
  else if (observable === 0) overall = HEALTH_STATUS.UNAVAILABLE;
  return {
    contractVersion: '10.0', overallStatus: overall, overallGlyph: STATUS_GLYPH[overall],
    coverage: { subsystemsTotal: reports.length, subsystemsEvaluated: observable, subsystemsUnavailable: counts.UNAVAILABLE, coveragePct: reports.length ? Math.round((observable / reports.length) * 100) : 0 },
    healthScore: scoreBase,
    scoreQualified: healthEvaluated > 0,
    scoreQualifier: healthEvaluated === 0 ? 'No subsystem produced a health observation; no health score is claimed.' : counts.UNAVAILABLE > 0 ? `${counts.UNAVAILABLE} subsystem(s) could not be evaluated; this score describes only the observed health statuses.` : 'Score is derived only from subsystem health observations supplied by probes.',
    counts, subsystems: reports, generatedAt: new Date().toISOString(),
  };
}

export function validateContract(report) {
  const violations = [];
  const req = ['contractVersion', 'subsystem', 'status', 'availability', 'severity', 'findings', 'evidence', 'recommendations', 'requiredPermissions', 'lastUpdated', 'errors'];
  for (const key of req) if (report?.[key] === undefined || report?.[key] === null) violations.push(`missing required key: ${key}`);
  if (report && !Object.values(HEALTH_STATUS).includes(report.status)) violations.push(`invalid status: ${report.status}`);
  if (report && !Object.values(AVAILABILITY).includes(report.availability)) violations.push(`invalid availability: ${report.availability}`);
  for (const k of ['findings', 'evidence', 'recommendations', 'requiredPermissions', 'errors']) if (report && report[k] !== undefined && !Array.isArray(report[k])) violations.push(`${k} must be an array`);
  if (report && report.availability !== AVAILABILITY.AVAILABLE && report.status === HEALTH_STATUS.HEALTHY) violations.push('CONTRACT VIOLATION: subsystem claims HEALTHY without full availability');
  if (report && report.status === HEALTH_STATUS.HEALTHY && (!Array.isArray(report.evidence) || report.evidence.length === 0)) violations.push('CONTRACT VIOLATION: HEALTHY requires evidence');
  if (report && report.lastUpdated && Number.isNaN(Date.parse(report.lastUpdated))) violations.push('lastUpdated must be an ISO-8601 timestamp');
  return { valid: violations.length === 0, violations };
}
