/**
 * Permission model.
 * Permission configuration describes requirements; current permission state must
 * come from a real probe. Unprobed permissions remain null/unknown.
 */
import { AVAILABILITY } from './contract.js';

export const PERMISSION = {
  NONE: 'none', USER_APPROVED: 'user_approved', ADMIN: 'admin', FULL_DISK_ACCESS: 'full_disk_access',
  ACCESSIBILITY: 'accessibility', SCREEN_RECORDING: 'screen_recording', CAMERA: 'camera', MICROPHONE: 'microphone',
  DEVELOPER_TOOLS: 'developer_tools', NETWORK: 'network',
};

export const PERMISSION_META = {
  none: { label: 'No permissions', grantPath: null },
  user_approved: { label: 'User approved', grantPath: 'System Settings → Privacy & Security' },
  admin: { label: 'Admin approved', grantPath: 'Authenticate as an administrator when prompted' },
  full_disk_access: { label: 'Full Disk Access', grantPath: 'System Settings → Privacy & Security → Full Disk Access' },
  accessibility: { label: 'Accessibility', grantPath: 'System Settings → Privacy & Security → Accessibility' },
  screen_recording: { label: 'Screen Recording', grantPath: 'System Settings → Privacy & Security → Screen Recording' },
  camera: { label: 'Camera', grantPath: 'System Settings → Privacy & Security → Camera' },
  microphone: { label: 'Microphone', grantPath: 'System Settings → Privacy & Security → Microphone' },
  developer_tools: { label: 'Developer Tools', grantPath: 'Install Xcode Command Line Tools (xcode-select --install)' },
  network: { label: 'Network access', grantPath: 'Connect to a network' },
};

export const FEATURE_PERMISSION_MATRIX = {
  'system.hardware': { required: [], enhanced: [], platforms: ['macos', 'windows'] },
  'system.inventory': { required: [], enhanced: [PERMISSION.FULL_DISK_ACCESS], platforms: ['macos', 'windows'] },
  'storage.overview': { required: [], enhanced: [PERMISSION.FULL_DISK_ACCESS], platforms: ['macos', 'windows'] },
  'storage.userLibraryScan': { required: [PERMISSION.FULL_DISK_ACCESS], enhanced: [], platforms: ['macos'] },
  'storage.growth': { required: [], enhanced: [PERMISSION.FULL_DISK_ACCESS], platforms: ['macos', 'windows'] },
  'storage.cleanup': { required: [PERMISSION.USER_APPROVED], enhanced: [PERMISSION.FULL_DISK_ACCESS], platforms: ['macos', 'windows'] },
  'battery.health': { required: [], enhanced: [PERMISSION.ADMIN], platforms: ['macos', 'windows'] },
  'battery.attribution': { required: [], enhanced: [PERMISSION.ADMIN], platforms: ['macos'] },
  'processes.list': { required: [], enhanced: [PERMISSION.ADMIN], platforms: ['macos', 'windows'] },
  'processes.killPort': { required: [PERMISSION.USER_APPROVED], enhanced: [PERMISSION.ADMIN], platforms: ['macos', 'windows'] },
  'network.diagnostics': { required: [], enhanced: [PERMISSION.NETWORK], platforms: ['macos', 'windows'] },
  'network.publicIp': { required: [PERMISSION.NETWORK], enhanced: [], platforms: ['macos', 'windows'] },
  'security.posture': { required: [], enhanced: [PERMISSION.ADMIN, PERMISSION.FULL_DISK_ACCESS], platforms: ['macos', 'windows'] },
  'security.tccAudit': { required: [PERMISSION.FULL_DISK_ACCESS], enhanced: [], platforms: ['macos'] },
  'crashes.reports': { required: [PERMISSION.FULL_DISK_ACCESS], enhanced: [], platforms: ['macos'] },
  'displays.topology': { required: [], enhanced: [PERMISSION.SCREEN_RECORDING], platforms: ['macos', 'windows'] },
  'displays.captureTest': { required: [PERMISSION.SCREEN_RECORDING], enhanced: [], platforms: ['macos'] },
  'camera.diagnostics': { required: [PERMISSION.CAMERA], enhanced: [], platforms: ['macos'] },
  'microphone.diagnostics': { required: [PERMISSION.MICROPHONE], enhanced: [], platforms: ['macos'] },
  'automation.uiControl': { required: [PERMISSION.ACCESSIBILITY], enhanced: [], platforms: ['macos'] },
  'developer.toolchains': { required: [], enhanced: [PERMISSION.DEVELOPER_TOOLS], platforms: ['macos', 'windows'] },
  'thermal.history': { required: [], enhanced: [PERMISSION.ADMIN], platforms: ['macos'] },
  'timemachine.status': { required: [], enhanced: [PERMISSION.FULL_DISK_ACCESS], platforms: ['macos'] },
};

export function createPermissionState(overrides = {}) {
  return { ...overrides };
}

export function resolveFeatureAvailability(featureId, permissionState = createPermissionState(), platform = 'macos', opts = {}) {
  const spec = FEATURE_PERMISSION_MATRIX[featureId];
  if (!spec) return { availability: AVAILABILITY.UNSUPPORTED, missing: [], degradedReason: `Unknown feature "${featureId}".`, requiredPermissions: [], grantInstructions: [] };
  if (!spec.platforms.includes(platform)) return { availability: AVAILABILITY.UNSUPPORTED, missing: [], degradedReason: `"${featureId}" is not supported on ${platform}.`, requiredPermissions: spec.required, grantInstructions: [] };

  const mdmBlocked = opts.mdmBlocked || [];
  const missingRequired = spec.required.filter((p) => permissionState[p] !== true);
  const missingEnhanced = spec.enhanced.filter((p) => permissionState[p] !== true);

  if (missingRequired.length > 0) {
    const blockedByPolicy = missingRequired.filter((p) => mdmBlocked.includes(p));
    return {
      availability: AVAILABILITY.REQUIRES_PERMISSION,
      missing: missingRequired,
      blockedByPolicy,
      degradedReason: blockedByPolicy.length
        ? `Blocked by device management policy: ${blockedByPolicy.map(labelOf).join(', ')}.`
        : `Requires ${missingRequired.map(labelOf).join(', ')}. No health claim can be made until access is granted.`,
      requiredPermissions: spec.required,
      grantInstructions: missingRequired.map(grantInstruction),
    };
  }
  if (missingEnhanced.length > 0) {
    return {
      availability: AVAILABILITY.LIMITED,
      missing: missingEnhanced,
      blockedByPolicy: missingEnhanced.filter((p) => mdmBlocked.includes(p)),
      degradedReason: `Running with reduced coverage — ${missingEnhanced.map(labelOf).join(', ')} not confirmed. Some values may be unavailable.`,
      requiredPermissions: spec.required,
      grantInstructions: missingEnhanced.map(grantInstruction),
    };
  }
  return { availability: AVAILABILITY.AVAILABLE, missing: [], blockedByPolicy: [], degradedReason: null, requiredPermissions: spec.required, grantInstructions: [] };
}

const labelOf = (p) => PERMISSION_META[p]?.label || p;
const grantInstruction = (p) => ({ permission: p, label: labelOf(p), howToGrant: PERMISSION_META[p]?.grantPath || 'Grant this permission in System Settings.' });

export function buildPermissionMatrix(permissionState = createPermissionState(), platform = 'macos', opts = {}) {
  const features = Object.keys(FEATURE_PERMISSION_MATRIX).map((featureId) => {
    const r = resolveFeatureAvailability(featureId, permissionState, platform, opts);
    return {
      featureId, availability: r.availability, missing: r.missing, blockedByPolicy: r.blockedByPolicy || [],
      reason: r.degradedReason, requiredPermissions: FEATURE_PERMISSION_MATRIX[featureId].required,
      enhancedBy: FEATURE_PERMISSION_MATRIX[featureId].enhanced, grantInstructions: r.grantInstructions,
    };
  });
  const counts = features.reduce((acc, f) => { acc[f.availability] = (acc[f.availability] || 0) + 1; return acc; }, {});
  return {
    platform, permissionState,
    grantedCount: Object.values(permissionState).filter((v) => v === true).length,
    features, counts,
    coveragePct: features.length ? Math.round(((counts[AVAILABILITY.AVAILABLE] || 0) / features.length) * 100) : 0,
    honestyStatement: 'A feature is available only when its required permission state has been confirmed by a runtime probe.',
    generatedAt: new Date().toISOString(),
  };
}

// Hypothetical what-if previews for the permissions-matrix simulator. These are
// explicitly NOT the host's permission state: the live state starts as {}
// (unprobed/unknown) and is only ever filled by runtime probes. Each scenario
// declares granted permission names; the builder below materializes the state.
const SCENARIO_GRANTS = {
  'no-permissions': [],
  'user-approved': [PERMISSION.USER_APPROVED, PERMISSION.NETWORK],
  'admin-approved': [PERMISSION.USER_APPROVED, PERMISSION.NETWORK, PERMISSION.ADMIN],
  'full-disk-access': [PERMISSION.USER_APPROVED, PERMISSION.NETWORK, PERMISSION.ADMIN, PERMISSION.FULL_DISK_ACCESS],
  accessibility: [PERMISSION.USER_APPROVED, PERMISSION.NETWORK, PERMISSION.ACCESSIBILITY],
  'screen-recording': [PERMISSION.USER_APPROVED, PERMISSION.NETWORK, PERMISSION.SCREEN_RECORDING],
  camera: [PERMISSION.USER_APPROVED, PERMISSION.NETWORK, PERMISSION.CAMERA],
  microphone: [PERMISSION.USER_APPROVED, PERMISSION.NETWORK, PERMISSION.MICROPHONE],
  'fully-granted': [
    PERMISSION.USER_APPROVED, PERMISSION.NETWORK, PERMISSION.ADMIN, PERMISSION.FULL_DISK_ACCESS,
    PERMISSION.ACCESSIBILITY, PERMISSION.SCREEN_RECORDING, PERMISSION.CAMERA, PERMISSION.MICROPHONE,
    PERMISSION.DEVELOPER_TOOLS,
  ],
  'corporate-managed': [PERMISSION.USER_APPROVED, PERMISSION.NETWORK],
};

function scenarioState(grantedNames) {
  const state = createPermissionState();
  for (const name of grantedNames) state[name] = true;
  return state;
}

export const PERMISSION_SCENARIOS = Object.fromEntries(
  Object.entries(SCENARIO_GRANTS).map(([id, grants]) => [id, scenarioState(grants)]),
);
