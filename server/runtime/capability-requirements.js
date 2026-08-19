/**
 * WinSuite & MacSuite v10.1 — Network Requirement Contract
 *
 * CORRECTION to v10.0.
 *
 * v10.0 shipped a binary claim: 12 capabilities in LOCAL_CAPABILITIES were asserted to
 * "work with no internet". That claim was never verified in a truly disconnected
 * environment — it was an architectural intention presented as a tested fact, which is
 * exactly the class of statement this product exists to eliminate.
 *
 * This module replaces the binary with a five-state declared requirement, and separates
 * two things v10.0 conflated:
 *
 *   1. What a capability DECLARES it needs        (`requirement`)
 *   2. Whether that declaration has been VERIFIED (`verification`)
 *
 * A capability that has never been exercised on a disconnected machine reports
 * verification: UNVERIFIED. The UI and the docs must render "declared, not yet verified"
 * rather than "works offline". Verification is only upgraded by a real disconnected test
 * run recording an outcome here — never by a developer's assumption.
 */

/** The five-state network requirement contract. */
export const NETWORK_REQUIREMENT = {
  /** Cannot function at all without internet. Absence is a hard failure of THIS capability. */
  ONLINE_REQUIRED: 'ONLINE_REQUIRED',
  /** Enhanced by internet, fully functional without it. Absence is invisible to correctness. */
  ONLINE_OPTIONAL: 'ONLINE_OPTIONAL',
  /** Designed to run entirely from local telemetry. Full fidelity offline. */
  OFFLINE_SUPPORTED: 'OFFLINE_SUPPORTED',
  /** Runs offline but with reduced fidelity/coverage that MUST be disclosed to the user. */
  OFFLINE_DEGRADED: 'OFFLINE_DEGRADED',
  /** Not available on this platform/hardware at all, regardless of connectivity. */
  UNSUPPORTED: 'UNSUPPORTED',
};

/** How much we actually know about the declaration above. */
export const VERIFICATION_STATE = {
  /** Exercised on a genuinely disconnected machine; behaved as declared. */
  VERIFIED_OFFLINE: 'VERIFIED_OFFLINE',
  /** Exercised while disconnected and did NOT behave as declared. Declaration is wrong. */
  CONTRADICTED: 'CONTRADICTED',
  /** Reasoned from the implementation (no network calls in the code path) but never run disconnected. */
  STATIC_ANALYSIS_ONLY: 'STATIC_ANALYSIS_ONLY',
  /** No evidence either way. */
  UNVERIFIED: 'UNVERIFIED',
};

const V = VERIFICATION_STATE;
const R = NETWORK_REQUIREMENT;

/**
 * The capability register.
 *
 * `verification` here is deliberately conservative. STATIC_ANALYSIS_ONLY means we have
 * read the code path and it makes no outbound request — that is real evidence, but it is
 * weaker than having run it on a plane. Nothing is marked VERIFIED_OFFLINE until a
 * disconnected test run records it (see recordOfflineVerification).
 */
export const CAPABILITY_REGISTER = [
  // ── Pure local telemetry: no socket in the code path ────────────────────────────
  {
    id: 'hardware.inventory',
    label: 'Hardware inventory',
    requirement: R.OFFLINE_SUPPORTED,
    verification: V.STATIC_ANALYSIS_ONLY,
    basis: 'Reads system_profiler / sysctl / os module only; no outbound socket in the code path.',
    offlineCaveat: null,
  },
  {
    id: 'storage.analysis',
    label: 'Storage analysis',
    requirement: R.OFFLINE_SUPPORTED,
    verification: V.STATIC_ANALYSIS_ONLY,
    basis: 'statfs and directory walks only.',
    offlineCaveat: null,
  },
  {
    id: 'storage.growthAttribution',
    label: 'Storage growth attribution',
    requirement: R.OFFLINE_DEGRADED,
    verification: V.STATIC_ANALYSIS_ONLY,
    basis: 'Local filesystem sampling.',
    offlineCaveat:
      'Growth attribution needs a stored history of prior samples. On a machine with no retained baselines the first offline run can only report current sizes, not growth. This is a data-history limitation, not a network one, but it presents identically to the user and must be disclosed.',
  },
  {
    id: 'battery.health',
    label: 'Battery health',
    requirement: R.OFFLINE_SUPPORTED,
    verification: V.STATIC_ANALYSIS_ONLY,
    basis: 'ioreg / pmset only.',
    offlineCaveat: null,
  },
  {
    id: 'battery.attribution',
    label: 'Battery drain attribution',
    requirement: R.OFFLINE_DEGRADED,
    verification: V.STATIC_ANALYSIS_ONLY,
    basis: 'powermetrics-class local sampling.',
    offlineCaveat:
      'Per-process attribution is apportioned from observed energy impact, never measured directly by macOS. Offline changes nothing about that, but the estimate label must remain.',
  },
  {
    id: 'process.inventory',
    label: 'Process inventory',
    requirement: R.OFFLINE_SUPPORTED,
    verification: V.STATIC_ANALYSIS_ONLY,
    basis: 'ps / sysctl only.',
    offlineCaveat: null,
  },
  {
    id: 'security.posture',
    label: 'Local security posture',
    requirement: R.OFFLINE_SUPPORTED,
    verification: V.STATIC_ANALYSIS_ONLY,
    basis: 'FileVault, SIP, Gatekeeper, firewall are all local state reads.',
    offlineCaveat: null,
  },
  {
    id: 'crashes.reports',
    label: 'Crash report analysis',
    requirement: R.OFFLINE_SUPPORTED,
    verification: V.STATIC_ANALYSIS_ONLY,
    basis: 'Reads ~/Library/Logs/DiagnosticReports from disk.',
    offlineCaveat: null,
  },
  {
    id: 'developer.environment',
    label: 'Developer environment audit',
    requirement: R.OFFLINE_DEGRADED,
    verification: V.STATIC_ANALYSIS_ONLY,
    basis: 'Local toolchain and cache inspection.',
    offlineCaveat:
      'Installed toolchain versions are read locally. Whether those versions are OUTDATED cannot be determined offline — that comparison needs a registry lookup and is suppressed rather than guessed.',
  },
  {
    id: 'thermal.state',
    label: 'Thermal state',
    requirement: R.OFFLINE_SUPPORTED,
    verification: V.STATIC_ANALYSIS_ONLY,
    basis: 'pmset -g therm / local sensors.',
    offlineCaveat: null,
  },
  {
    id: 'cleanup.planning',
    label: 'Cleanup planning',
    requirement: R.OFFLINE_SUPPORTED,
    verification: V.STATIC_ANALYSIS_ONLY,
    basis: 'Filesystem classification against local policy tables.',
    offlineCaveat: null,
  },

  // ── The one v10.0 got wrong ─────────────────────────────────────────────────────
  {
    id: 'network.localDiagnostics',
    label: 'Network diagnostics (local)',
    requirement: R.OFFLINE_DEGRADED,
    verification: V.STATIC_ANALYSIS_ONLY,
    basis: 'Interface state, link rate, assigned IP, configured resolvers and default gateway are local reads.',
    offlineCaveat:
      'v10.0 listed this as fully offline-capable. That was wrong. Interface and configuration state read fine offline, but reachability, DNS RESOLUTION (as opposed to resolver configuration), gateway reachability and captive-portal classification are all unobtainable while disconnected. Offline, this capability reports configuration only and must not imply the network is healthy.',
  },

  // ── Genuinely online ────────────────────────────────────────────────────────────
  {
    id: 'network.internetReachability',
    label: 'Internet reachability',
    requirement: R.ONLINE_REQUIRED,
    verification: V.STATIC_ANALYSIS_ONLY,
    basis: 'Definitionally requires the internet.',
    offlineCaveat: 'Reports UNAVAILABLE offline. Never reports "unreachable" as a fault — being offline is not a defect to repair.',
  },
  {
    id: 'network.speedTest',
    label: 'Throughput measurement',
    requirement: R.ONLINE_REQUIRED,
    verification: V.STATIC_ANALYSIS_ONLY,
    basis: 'Requires a remote endpoint.',
    offlineCaveat: 'Skipped offline. Interface link rate is still reported and is clearly distinguished from measured throughput.',
  },
  {
    id: 'network.captivePortalDetection',
    label: 'Captive portal detection',
    requirement: R.ONLINE_REQUIRED,
    verification: V.STATIC_ANALYSIS_ONLY,
    basis: 'Requires an HTTP probe to a known endpoint.',
    offlineCaveat: 'Offline, a captive portal is indistinguishable from no network. The app must say it cannot tell rather than picking one.',
  },
  {
    id: 'security.threatIntel',
    label: 'Threat intelligence lookup',
    requirement: R.ONLINE_OPTIONAL,
    verification: V.STATIC_ANALYSIS_ONLY,
    basis: 'Enrichment layer over local posture.',
    offlineCaveat: 'Local posture checks are unaffected; only reputation enrichment is suppressed.',
  },
  {
    id: 'apps.updateAvailability',
    label: 'Application update availability',
    requirement: R.ONLINE_REQUIRED,
    verification: V.STATIC_ANALYSIS_ONLY,
    basis: 'Requires vendor/registry lookup.',
    offlineCaveat: 'Installed inventory and versions still read locally; "up to date" is never asserted offline.',
  },
  {
    id: 'os.updateAvailability',
    label: 'macOS update availability',
    requirement: R.ONLINE_REQUIRED,
    verification: V.STATIC_ANALYSIS_ONLY,
    basis: 'softwareupdate contacts Apple.',
    offlineCaveat: 'Installed build is reported; pending-update state is UNKNOWN, not "none".',
  },
];

/** Runtime-recorded verification outcomes, keyed by capability id. */
const verificationLog = new Map();

/**
 * Records the outcome of exercising a capability on a genuinely disconnected machine.
 * This is the ONLY way a capability reaches VERIFIED_OFFLINE.
 *
 * @param {string} capabilityId
 * @param {{ behavedAsDeclared: boolean, observedBehaviour: string, testedBy?: string, environment?: string }} outcome
 */
export function recordOfflineVerification(capabilityId, outcome = {}) {
  const cap = CAPABILITY_REGISTER.find((c) => c.id === capabilityId);
  if (!cap) throw new Error(`Unknown capability: ${capabilityId}`);
  if (typeof outcome.behavedAsDeclared !== 'boolean') {
    throw new Error('recordOfflineVerification requires an explicit behavedAsDeclared boolean — no defaulting to success.');
  }
  if (!outcome.observedBehaviour) {
    throw new Error('recordOfflineVerification requires observedBehaviour describing what actually happened.');
  }
  const entry = {
    capabilityId,
    verification: outcome.behavedAsDeclared ? V.VERIFIED_OFFLINE : V.CONTRADICTED,
    observedBehaviour: outcome.observedBehaviour,
    testedBy: outcome.testedBy || 'unknown',
    environment: outcome.environment || 'unspecified disconnected environment',
    recordedAt: new Date().toISOString(),
  };
  verificationLog.set(capabilityId, entry);
  return entry;
}

/** Clears recorded verifications (test isolation). */
export function resetVerifications() {
  verificationLog.clear();
}

/** Resolves a capability's current requirement + verification state. */
export function getCapability(capabilityId) {
  const cap = CAPABILITY_REGISTER.find((c) => c.id === capabilityId);
  if (!cap) return null;
  const recorded = verificationLog.get(capabilityId);
  return {
    ...cap,
    verification: recorded?.verification || cap.verification,
    verificationEvidence: recorded || null,
    /** The single sentence the UI is allowed to print about offline behaviour. */
    offlineClaim: buildOfflineClaim(cap, recorded),
  };
}

/**
 * Builds an honestly-hedged sentence. Note that a declaration alone never yields
 * "works offline" — only a recorded disconnected run does.
 */
function buildOfflineClaim(cap, recorded) {
  const state = recorded?.verification || cap.verification;

  if (cap.requirement === R.UNSUPPORTED) return 'Not supported on this platform.';
  if (cap.requirement === R.ONLINE_REQUIRED) return 'Requires an internet connection. Unavailable — not failed — when offline.';
  if (cap.requirement === R.ONLINE_OPTIONAL) return 'Internet is optional; the capability is fully functional without it.';

  const degradedSuffix = cap.requirement === R.OFFLINE_DEGRADED
    ? ' with reduced coverage that is disclosed at the point of use'
    : '';

  switch (state) {
    case V.VERIFIED_OFFLINE:
      return `Verified to run offline${degradedSuffix} (tested on a disconnected machine).`;
    case V.CONTRADICTED:
      return 'Declared offline-capable but a disconnected test contradicted that. Treat as broken offline until re-verified.';
    case V.STATIC_ANALYSIS_ONLY:
      return `Designed to run offline${degradedSuffix}. Confirmed by code inspection only — not yet exercised on a disconnected machine.`;
    default:
      return 'Offline behaviour has not been established.';
  }
}

/**
 * The honest replacement for the v10.0 "12 capabilities work with no internet" line.
 * Produces a claim string that is true given what has actually been tested.
 */
export function buildOfflinePosture() {
  const all = CAPABILITY_REGISTER.map((c) => getCapability(c.id));

  const byRequirement = {};
  for (const req of Object.values(R)) byRequirement[req] = all.filter((c) => c.requirement === req).length;

  const offlineCapable = all.filter(
    (c) => c.requirement === R.OFFLINE_SUPPORTED || c.requirement === R.OFFLINE_DEGRADED || c.requirement === R.ONLINE_OPTIONAL
  );
  const verified = offlineCapable.filter((c) => c.verification === V.VERIFIED_OFFLINE);
  const contradicted = all.filter((c) => c.verification === V.CONTRADICTED);
  const staticOnly = offlineCapable.filter((c) => c.verification === V.STATIC_ANALYSIS_ONLY);

  return {
    contractVersion: '10.1',
    totals: {
      capabilities: all.length,
      byRequirement,
      offlineCapableDeclared: offlineCapable.length,
      offlineVerified: verified.length,
      offlineStaticAnalysisOnly: staticOnly.length,
      offlineContradicted: contradicted.length,
    },
    /**
     * This string is deliberately unflattering while verification is outstanding.
     * It is what release notes and the UI must quote.
     */
    claim: buildPostureClaim(offlineCapable.length, verified.length, staticOnly.length, contradicted.length),
    verificationOutstanding: staticOnly.map((c) => c.id),
    contradictions: contradicted.map((c) => ({ id: c.id, evidence: c.verificationEvidence })),
    capabilities: all,
    generatedAt: new Date().toISOString(),
  };
}

function buildPostureClaim(declared, verified, staticOnly, contradicted) {
  if (contradicted > 0) {
    return `${contradicted} capability(ies) declared offline-capable failed a disconnected test. The offline-first claim is currently FALSE and must not be published.`;
  }
  if (verified === 0) {
    return `${declared} capabilities are DESIGNED to operate without internet, established by code inspection only. None has yet been exercised on a genuinely disconnected machine, so no offline guarantee is being made.`;
  }
  if (verified < declared) {
    return `${verified} of ${declared} offline-capable capabilities have been verified on a disconnected machine; ${staticOnly} remain confirmed by code inspection only.`;
  }
  return `All ${declared} offline-capable capabilities have been verified on a disconnected machine.`;
}

/**
 * Guard used by probe code: given connectivity, decide whether a capability may run
 * and what it is permitted to claim.
 */
export function resolveRuntimePosture(capabilityId, { online }) {
  const cap = getCapability(capabilityId);
  if (!cap) return { runnable: false, reason: `Unknown capability: ${capabilityId}` };

  if (cap.requirement === R.UNSUPPORTED) {
    return { runnable: false, availability: 'UNSUPPORTED', reason: 'Not supported on this platform.' };
  }
  if (!online && cap.requirement === R.ONLINE_REQUIRED) {
    return {
      runnable: false,
      availability: 'LIMITED',
      optional: true,
      reason: 'Requires internet; skipped while offline.',
      remediation: cap.offlineCaveat,
      // Critical: being offline is not a fault of the Mac.
      isFault: false,
    };
  }
  if (!online && cap.requirement === R.OFFLINE_DEGRADED) {
    return {
      runnable: true,
      availability: 'LIMITED',
      reason: 'Running with reduced coverage while offline.',
      disclosure: cap.offlineCaveat,
      isFault: false,
    };
  }
  return { runnable: true, availability: 'AVAILABLE', reason: null, isFault: false };
}
