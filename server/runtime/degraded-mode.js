/**
 * WinSuite & MacSuite v10.0 — Offline-First & Degraded Mode (P0 #9)
 *
 * Rules enforced here:
 *   1. Every LOCAL capability (hardware, storage, battery, processes, network
 *      diagnostics, security, crashes, dev tools) works with NO internet.
 *   2. Anything needing the internet is explicitly marked optional; its absence
 *      degrades a card, never the dashboard.
 *   3. One failing probe must not fail the page. `runProbe` converts every failure
 *      into a contract-compliant UNAVAILABLE result with an explanation.
 */

import dns from 'dns';
import { AVAILABILITY, HEALTH_STATUS, createSubsystemReport } from '../core/contract.js';
import { classifyFailure } from './operation-executor.js';

/** Local-only capabilities: these must never be blocked by connectivity. */
export const LOCAL_CAPABILITIES = [
  'hardware.inventory',
  'storage.analysis',
  'storage.growthAttribution',
  'battery.health',
  'battery.attribution',
  'process.inventory',
  'network.localDiagnostics',
  'security.posture',
  'crashes.reports',
  'developer.environment',
  'thermal.state',
  'cleanup.planning',
];

/** Online-only capabilities: always optional, always degrade gracefully. */
export const ONLINE_ONLY_CAPABILITIES = [
  { id: 'network.internetReachability', label: 'Internet reachability test', fallback: 'Local link, DNS resolver and gateway checks still run offline.' },
  { id: 'network.speedTest', label: 'Throughput measurement', fallback: 'Skipped. Interface link rate is still reported from local telemetry.' },
  { id: 'network.captivePortalDetection', label: 'Captive portal detection', fallback: 'Cannot distinguish captive portal from offline while disconnected.' },
  { id: 'security.threatIntel', label: 'Threat intelligence lookup', fallback: 'Local security posture (FileVault, SIP, Gatekeeper, firewall) is unaffected.' },
  { id: 'apps.updateAvailability', label: 'Application update check', fallback: 'Installed app inventory and versions are still read locally.' },
  { id: 'os.updateAvailability', label: 'macOS update availability', fallback: 'Installed OS build is still reported from local telemetry.' },
];

const CONNECTIVITY_TTL_MS = 30_000;
let connectivityCache = { online: null, checkedAt: 0, method: null };

/**
 * Non-blocking, short-timeout connectivity probe. Never throws.
 * We resolve a hostname rather than fetch, so no request leaves the machine body-wise.
 */
export async function checkConnectivity({ force = false, timeoutMs = 1500 } = {}) {
  const now = Date.now();
  if (!force && connectivityCache.online !== null && now - connectivityCache.checkedAt < CONNECTIVITY_TTL_MS) {
    return { ...connectivityCache, cached: true };
  }

  const online = await new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => { if (!settled) { settled = true; resolve(false); } }, timeoutMs);
    try {
      dns.resolve('apple.com', (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(!err);
      });
    } catch {
      if (!settled) { settled = true; clearTimeout(timer); resolve(false); }
    }
  });

  connectivityCache = { online, checkedAt: now, method: 'dns.resolve(apple.com)' };
  return { ...connectivityCache, cached: false };
}

/**
 * The core resilience primitive. Wrap EVERY probe in this.
 *
 * A thrown probe becomes a structured UNAVAILABLE result carrying a user-facing
 * explanation and remediation, so the dashboard renders a ⚪ card instead of dying.
 */
export async function runProbe(name, fn, {
  timeoutMs = 8000,
  requiresNetwork = false,
  optional = false,
  fallbackValue = null,
} = {}) {
  const startedAt = Date.now();

  if (requiresNetwork) {
    const { online } = await checkConnectivity();
    if (!online) {
      const meta = ONLINE_ONLY_CAPABILITIES.find((c) => c.id === name);
      return {
        probe: name,
        ok: false,
        skipped: true,
        availability: AVAILABILITY.LIMITED,
        value: fallbackValue,
        durationMs: Date.now() - startedAt,
        reason: 'No internet connection. This check is optional and was skipped.',
        remediation: meta?.fallback || 'All local diagnostics continue to run normally.',
        optional: true,
      };
    }
  }

  try {
    const value = await withTimeout(fn(), timeoutMs, name);
    return {
      probe: name,
      ok: true,
      skipped: false,
      availability: AVAILABILITY.AVAILABLE,
      value,
      durationMs: Date.now() - startedAt,
      reason: null,
      remediation: null,
      optional,
    };
  } catch (err) {
    const failure = classifyFailure(err);
    return {
      probe: name,
      ok: false,
      skipped: false,
      availability: failure.code === 'PERMISSION_DENIED'
        ? AVAILABILITY.REQUIRES_PERMISSION
        : failure.code === 'MISSING_BINARY_OR_PATH'
          ? AVAILABILITY.UNSUPPORTED
          : AVAILABILITY.FAILED,
      value: fallbackValue,
      durationMs: Date.now() - startedAt,
      code: failure.code,
      reason: failure.userMessage,
      remediation: failure.remediation,
      recoverable: failure.recoverable,
      optional,
    };
  }
}

/**
 * Runs many probes concurrently and NEVER rejects.
 * Returns partial data plus a per-probe availability map.
 */
export async function runProbeSet(probes = []) {
  const results = await Promise.all(
    probes.map((p) => runProbe(p.name, p.fn, p))
  );

  const byName = {};
  for (const r of results) byName[r.name || r.probe] = r;

  const failed = results.filter((r) => !r.ok && !r.optional && !r.skipped);
  const skipped = results.filter((r) => r.skipped);
  const succeeded = results.filter((r) => r.ok);

  return {
    results,
    byName,
    counts: { total: results.length, succeeded: succeeded.length, failed: failed.length, skipped: skipped.length },
    // Partial results are still results. The dashboard renders.
    degraded: failed.length > 0 || skipped.length > 0,
    degradedReason: buildDegradedReason(failed, skipped),
  };
}

function buildDegradedReason(failed, skipped) {
  const parts = [];
  if (failed.length) parts.push(`${failed.length} probe(s) could not be read: ${failed.map((f) => f.probe).join(', ')}`);
  if (skipped.length) parts.push(`${skipped.length} optional online check(s) skipped while offline`);
  return parts.length ? parts.join('. ') + '.' : null;
}

/**
 * Turns a probe set into a contract-compliant subsystem report.
 * Guarantees: a subsystem whose probes all failed reports UNAVAILABLE, never HEALTHY.
 */
export function reportFromProbeSet({ subsystem, displayName, probeSet, findings = [], evidence = [], recommendations = [] }) {
  const { counts, degraded, degradedReason, results } = probeSet;

  let availability = AVAILABILITY.AVAILABLE;
  if (counts.succeeded === 0) {
    const anyPermission = results.some((r) => r.availability === AVAILABILITY.REQUIRES_PERMISSION);
    availability = anyPermission ? AVAILABILITY.REQUIRES_PERMISSION : AVAILABILITY.FAILED;
  } else if (degraded) {
    availability = AVAILABILITY.LIMITED;
  }

  return createSubsystemReport({
    subsystem,
    displayName,
    availability,
    status: findings.some((f) => f.severity === 'critical')
      ? HEALTH_STATUS.CRITICAL
      : findings.some((f) => f.severity === 'warning')
        ? HEALTH_STATUS.WARNING
        : undefined,
    findings,
    evidence,
    recommendations,
    degraded,
    degradedReason,
    dataSources: results.map((r) => ({ probe: r.probe, ok: r.ok, durationMs: r.durationMs, skipped: r.skipped })),
    errors: results.filter((r) => !r.ok && !r.skipped).map((r) => ({
      code: r.code || 'PROBE_FAILED',
      message: r.reason,
      recoverable: r.recoverable ?? true,
      remediation: r.remediation,
    })),
  });
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    Promise.resolve(promise),
    new Promise((_, reject) =>
      setTimeout(() => {
        const e = new Error(`Probe "${label}" timed out after ${ms}ms`);
        e.code = 'ETIMEDOUT';
        reject(e);
      }, ms)
    ),
  ]);
}

/** Snapshot of what the app can and cannot do right now. */
export async function getDegradedModeStatus() {
  const connectivity = await checkConnectivity();
  return {
    version: '10.0',
    online: connectivity.online,
    connectivityMethod: connectivity.method,
    checkedAt: new Date(connectivity.checkedAt).toISOString(),
    offlineFirst: true,
    localCapabilities: LOCAL_CAPABILITIES.map((id) => ({ id, available: true, requiresNetwork: false })),
    onlineOnlyCapabilities: ONLINE_ONLY_CAPABILITIES.map((c) => ({
      ...c,
      available: connectivity.online,
      optional: true,
      status: connectivity.online ? 'AVAILABLE' : 'SKIPPED_OFFLINE',
    })),
    message: connectivity.online
      ? 'Online. All local diagnostics plus optional online checks are available.'
      : 'Offline. Every local diagnostic still runs; only optional online checks are skipped and clearly marked.',
  };
}
