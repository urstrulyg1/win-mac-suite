/**
 * WinSuite & MacSuite v11.0 — Safe Mode Enforcement Middleware
 *
 * Safe Mode is a BACKEND-ENFORCED security boundary. When active, no mutating
 * operation may execute — even if the UI is bypassed, the API is called directly,
 * or malicious input is sent.
 *
 * The safe mode state is stored in-memory (volatile) and set by the client at
 * session start. If the server restarts, safe mode defaults to OFF but the
 * client re-establishes it on first API call.
 *
 * Mutation endpoints MUST call `assertMutatingAllowed()` before executing.
 */

// In-memory safe mode state
let safeModeActive = false;
let safeModeSince = null;
let safeModeSource = null;

/**
 * Activates Safe Mode, blocking all mutating operations.
 */
export function activateSafeMode(source = 'client') {
  safeModeActive = true;
  safeModeSince = new Date().toISOString();
  safeModeSource = source;
  return { active: true, since: safeModeSince, source };
}

/**
 * Deactivates Safe Mode, allowing mutations again.
 * This is itself a sensitive action that should require confirmation.
 */
export function deactivateSafeMode(source = 'client') {
  safeModeActive = false;
  const wasActive = safeModeSince;
  safeModeSince = null;
  safeModeSource = null;
  return { active: false, wasActiveSince: wasActive, source };
}

/**
 * Returns current Safe Mode status.
 */
export function getSafeModeStatus() {
  return {
    active: safeModeActive,
    since: safeModeSince,
    source: safeModeSource,
  };
}

/**
 * Asserts that a mutating operation is allowed.
 * Throws with SAFE_MODE_BLOCKED if Safe Mode is active.
 *
 * @param {string} operationId - The operation being attempted
 * @throws {Error} if Safe Mode is active
 */
export function assertMutatingAllowed(operationId) {
  if (safeModeActive) {
    const err = new Error(
      `SAFE_MODE_BLOCKED: Operation '${operationId}' is blocked because Safe Mode is active. ` +
      `No mutating operations may execute in Safe Mode. ` +
      `Deactivate Safe Mode first (requires explicit user confirmation).`
    );
    err.code = 'SAFE_MODE_BLOCKED';
    err.operationId = operationId;
    throw err;
  }
}

/**
 * Express middleware that adds Safe Mode headers to all responses
 * and exposes the status via res.locals.
 */
export function safeModeMiddleware(req, res, next) {
  res.setHeader('X-Safe-Mode', safeModeActive ? 'active' : 'inactive');
  res.locals.safeMode = safeModeActive;
  next();
}


/**
 * List of HTTP method + path patterns that are considered mutating.
 * Read-only GET requests are always allowed.
 */
const MUTATION_PATTERNS = [
  { method: 'POST', path: /^\/api\/actions\/(?!ask-assistant|cleanup-plan|stream|operations)/ },
  { method: 'POST', path: /^\/api\/windows\// },
  { method: 'DELETE', path: /^\/api\// },
  { method: 'PUT', path: /^\/api\// },
  { method: 'PATCH', path: /^\/api\// },
];

// Safe Mode management endpoints that should NOT be blocked even when Safe Mode is active.
const SAFE_MODE_EXCEPTIONS = [
  { method: 'POST', path: /^\/api\/v10\/safe-mode\// },
];

/**
 * Returns true if the request is a mutating operation.
 */
export function isMutatingRequest(req) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return false;
  }
  const url = req.originalUrl || req.url;
  // Allow Safe Mode management endpoints even when Safe Mode is active
  if (SAFE_MODE_EXCEPTIONS.some((p) => req.method === p.method && p.path.test(url))) {
    return false;
  }
  return MUTATION_PATTERNS.some(
    (p) => req.method === p.method && p.path.test(url)
  );
}

/**
 * Middleware that blocks mutating requests when Safe Mode is active.
 * Mount early in the middleware chain, after CORS but before route handlers.
 */
export function safeModeGuardMiddleware(req, res, next) {
  if (safeModeActive && isMutatingRequest(req)) {
    return res.status(403).json({
      code: 'SAFE_MODE_BLOCKED',
      error: `Safe Mode is active. Mutating operation '${req.method} ${req.originalUrl}' is blocked.`,
      recoverable: true,
      remediation: 'Deactivate Safe Mode to allow maintenance operations, or use read-only diagnostic endpoints.',
      safeMode: getSafeModeStatus(),
    });
  }
  next();
}
