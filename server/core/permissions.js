/**
 * WinSuite & MacSuite v10.0 — macOS Permission Matrix
 *
 * Real Macs have radically different permission states (TCC, MDM profiles, SIP,
 * admin vs standard). Every feature declares which permissions it needs, and the
 * matrix resolves that into AVAILABLE / LIMITED / REQUIRES_PERMISSION / UNSUPPORTED.
 *
 * The point: we must never say "Everything is healthy" when we simply could not look.
 */

import { AVAILABILITY } from './contract.js';

export const PERMISSION = {
  NONE: 'none',
  USER_APPROVED: 'user_approved',
  ADMIN: 'admin',
  FULL_DISK_ACCESS: 'full_disk_access',
  ACCESSIBILITY: 'accessibility',
  SCREEN_RECORDING: 'screen_recording',
  CAMERA: 'camera',
  MICROPHONE: 'microphone',
  DEVELOPER_TOOLS: 'developer_tools',
  NETWORK: 'network',
};

export const PERMISSION_META = {
  none:              { label: 'No permissions',    grantPath: null },
  user_approved:     { label: 'User approved',     grantPath: 'System Settings → Privacy & Security' },
  admin:             { label: 'Admin approved',    grantPath: 'Authenticate as an administrator when prompted' },
  full_disk_access:  { label: 'Full Disk Access',  grantPath: 'System Settings → Privacy & Security → Full Disk Access' },
  accessibility:     { label: 'Accessibility',     grantPath: 'System Settings → Privacy & Security → Accessibility' },
  screen_recording:  { label: 'Screen Recording',  grantPath: 'System Settings → Privacy & Security → Screen Recording' },
  camera:            { label: 'Camera',            grantPath: 'System Settings → Privacy & Security → Camera' },
  microphone:        { label: 'Microphone',        grantPath: 'System Settings → Privacy & Security → Microphone' },
  developer_tools:   { label: 'Developer Tools',   grantPath: 'Install Xcode Command Line Tools (xcode-select --install)' },
  network:           { label: 'Network access',    grantPath: 'Connect to a network' },
};

/**
 * Feature → permission requirements.
 *  required : without these the feature CANNOT run   → REQUIRES_PERMISSION
 *  enhanced : without these the feature runs partial → LIMITED
 */
export const FEATURE_PERMISSION_MATRIX = {
  'system.hardware':        { required: [], enhanced: [], platforms: ['macos', 'windows'] },
  'system.inventory':       { required: [], enhanced: [PERMISSION.FULL_DISK_ACCESS], platforms: ['macos', 'windows'] },
  'storage.overview':       { required: [], enhanced: [PERMISSION.FULL_DISK_ACCESS], platforms: ['macos', 'windows'] },
  'storage.userLibraryScan':{ required: [PERMISSION.FULL_DISK_ACCESS], enhanced: [], platforms: ['macos'] },
  'storage.growth':         { required: [], enhanced: [PERMISSION.FULL_DISK_ACCESS], platforms: ['macos', 'windows'] },
  'storage.cleanup':        { required: [PERMISSION.USER_APPROVED], enhanced: [PERMISSION.FULL_DISK_ACCESS], platforms: ['macos', 'windows'] },
  'battery.health':         { required: [], enhanced: [PERMISSION.ADMIN], platforms: ['macos', 'windows'] },
  'battery.attribution':    { required: [], enhanced: [PERMISSION.ADMIN], platforms: ['macos'] },
  'processes.list':         { required: [], enhanced: [PERMISSION.ADMIN], platforms: ['macos', 'windows'] },
  'processes.killPort':     { required: [PERMISSION.USER_APPROVED], enhanced: [PERMISSION.ADMIN], platforms: ['macos', 'windows'] },
  'network.diagnostics':    { required: [], enhanced: [PERMISSION.NETWORK], platforms: ['macos', 'windows'] },
  'network.publicIp':       { required: [PERMISSION.NETWORK], enhanced: [], platforms: ['macos', 'windows'] },
  'security.posture':       { required: [], enhanced: [PERMISSION.ADMIN, PERMISSION.FULL_DISK_ACCESS], platforms: ['macos', 'windows'] },
  'security.tccAudit':      { required: [PERMISSION.FULL_DISK_ACCESS], enhanced: [], platforms: ['macos'] },
  'crashes.reports':        { required: [PERMISSION.FULL_DISK_ACCESS], enhanced: [], platforms: ['macos'] },
  'displays.topology':      { required: [], enhanced: [PERMISSION.SCREEN_RECORDING], platforms: ['macos', 'windows'] },
  'displays.captureTest':   { required: [PERMISSION.SCREEN_RECORDING], enhanced: [], platforms: ['macos'] },
  'camera.diagnostics':     { required: [PERMISSION.CAMERA], enhanced: [], platforms: ['macos'] },
  'microphone.diagnostics': { required: [PERMISSION.MICROPHONE], enhanced: [], platforms: ['macos'] },
  'automation.uiControl':   { required: [PERMISSION.ACCESSIBILITY], enhanced: [], platforms: ['macos'] },
  'developer.toolchains':   { required: [], enhanced: [PERMISSION.DEVELOPER_TOOLS], platforms: ['macos', 'windows'] },
  'thermal.history':        { required: [], enhanced: [PERMISSION.ADMIN], platforms: ['macos'] },
  'timemachine.status':     { required: [], enhanced: [PERMISSION.FULL_DISK_ACCESS], platforms: ['macos'] },
};

/**
 * Resolves the current permission state.
 * On a real Mac these come from TCC probes; managed Macs may deny irrevocably.
 */
export function createPermissionState(overrides = {}) {
  return {
    [PERMISSION.USER_APPROVED]: true,
    [PERMISSION.ADMIN]: false,
    [PERMISSION.FULL_DISK_ACCESS]: false,
    [PERMISSION.ACCESSIBILITY]: false,
    [PERMISSION.SCREEN_RECORDING]: false,
    [PERMISSION.CAMERA]: false,
    [PERMISSION.MICROPHONE]: false,
    [PERMISSION.DEVELOPER_TOOLS]: false,
    [PERMISSION.NETWORK]: true,
    ...overrides,
  };
}

/**
 * Core resolver: what can this feature do given this permission state?
 * @returns {{availability, missing, degradedReason, requiredPermissions, grantInstructions}}
 */
export function resolveFeatureAvailability(featureId, permissionState = createPermissionState(), platform = 'macos', opts = {}) {
  const spec = FEATURE_PERMISSION_MATRIX[featureId];
  if (!spec) {
    return {
      availability: AVAILABILITY.UNSUPPORTED,
      missing: [],
      degradedReason: `Unknown feature "${featureId}".`,
      requiredPermissions: [],
      grantInstructions: [],
    };
  }
  if (!spec.platforms.includes(platform)) {
    return {
      availability: AVAILABILITY.UNSUPPORTED,
      missing: [],
      degradedReason: `"${featureId}" is not supported on ${platform}.`,
      requiredPermissions: spec.required,
      grantInstructions: [],
    };
  }
  // A corporate-managed Mac can have a permission permanently blocked by MDM.
  const mdmBlocked = opts.mdmBlocked || [];

  const missingRequired = spec.required.filter((p) => !permissionState[p]);
  const missingEnhanced = spec.enhanced.filter((p) => !permissionState[p]);

  if (missingRequired.length > 0) {
    const blockedByPolicy = missingRequired.filter((p) => mdmBlocked.includes(p));
    return {
      availability: AVAILABILITY.REQUIRES_PERMISSION,
      missing: missingRequired,
      blockedByPolicy,
      degradedReason: blockedByPolicy.length
        ? `Blocked by device management policy: ${blockedByPolicy.map(labelOf).join(', ')}. This cannot be granted locally.`
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
      degradedReason: `Running with reduced coverage — ${missingEnhanced.map(labelOf).join(', ')} not granted. Some values will be estimated or unavailable.`,
      requiredPermissions: spec.required,
      grantInstructions: missingEnhanced.map(grantInstruction),
    };
  }
  return {
    availability: AVAILABILITY.AVAILABLE,
    missing: [],
    blockedByPolicy: [],
    degradedReason: null,
    requiredPermissions: spec.required,
    grantInstructions: [],
  };
}

const labelOf = (p) => PERMISSION_META[p]?.label || p;
const grantInstruction = (p) => ({
  permission: p,
  label: labelOf(p),
  howToGrant: PERMISSION_META[p]?.grantPath || 'Grant this permission in System Settings.',
});

/**
 * Builds the full feature × permission matrix — this is what the Permissions page
 * renders, and what the validation matrix asserts against.
 */
export function buildPermissionMatrix(permissionState = createPermissionState(), platform = 'macos', opts = {}) {
  const features = Object.keys(FEATURE_PERMISSION_MATRIX).map((featureId) => {
    const r = resolveFeatureAvailability(featureId, permissionState, platform, opts);
    return {
      featureId,
      availability: r.availability,
      missing: r.missing,
      blockedByPolicy: r.blockedByPolicy || [],
      reason: r.degradedReason,
      requiredPermissions: FEATURE_PERMISSION_MATRIX[featureId].required,
      enhancedBy: FEATURE_PERMISSION_MATRIX[featureId].enhanced,
      grantInstructions: r.grantInstructions,
    };
  });

  const counts = features.reduce((acc, f) => {
    acc[f.availability] = (acc[f.availability] || 0) + 1;
    return acc;
  }, {});

  return {
    platform,
    permissionState,
    grantedCount: Object.values(permissionState).filter(Boolean).length,
    features,
    counts,
    coveragePct: Math.round(((counts[AVAILABILITY.AVAILABLE] || 0) / features.length) * 100),
    honestyStatement:
      'Features listed as REQUIRES_PERMISSION or UNSUPPORTED are excluded from every health score. '
      + 'Win/Mac Suite never reports a subsystem as healthy when it could not read the underlying data.',
    generatedAt: new Date().toISOString(),
  };
}

/** Named permission scenarios used by the validation matrix + chaos tests. */
export const PERMISSION_SCENARIOS = {
  'no-permissions':   createPermissionState({ [PERMISSION.USER_APPROVED]: false, [PERMISSION.NETWORK]: false }),
  'user-approved':    createPermissionState({ [PERMISSION.USER_APPROVED]: true }),
  'admin-approved':   createPermissionState({ [PERMISSION.ADMIN]: true }),
  'full-disk-access': createPermissionState({ [PERMISSION.ADMIN]: true, [PERMISSION.FULL_DISK_ACCESS]: true }),
  'accessibility':    createPermissionState({ [PERMISSION.ACCESSIBILITY]: true }),
  'screen-recording': createPermissionState({ [PERMISSION.SCREEN_RECORDING]: true }),
  'camera':           createPermissionState({ [PERMISSION.CAMERA]: true }),
  'microphone':       createPermissionState({ [PERMISSION.MICROPHONE]: true }),
  'fully-granted':    createPermissionState({
    [PERMISSION.ADMIN]: true, [PERMISSION.FULL_DISK_ACCESS]: true, [PERMISSION.ACCESSIBILITY]: true,
    [PERMISSION.SCREEN_RECORDING]: true, [PERMISSION.CAMERA]: true, [PERMISSION.MICROPHONE]: true,
    [PERMISSION.DEVELOPER_TOOLS]: true,
  }),
  'corporate-managed': createPermissionState({ [PERMISSION.ADMIN]: false, [PERMISSION.FULL_DISK_ACCESS]: false }),
};
