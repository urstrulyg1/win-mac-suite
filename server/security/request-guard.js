/**
 * WinSuite & MacSuite v6.3 - Request Guard
 * Middleware for local security, CORS enforcement, and concurrency protection.
 */

import { isExecutionLocked, getActiveExecution } from './exec-guard.js';

/**
 * Validates that requests originate strictly from local machine interfaces.
 */
export function localhostOnlyGuard(req, res, next) {
  const ip = req.socket?.remoteAddress || req.ip || '';
  const isLocal = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip === 'localhost';

  if (!isLocal) {
    return res.status(403).json({
      error: 'Access denied: WinSuite & MacSuite APIs are strictly restricted to local machine clients.',
    });
  }
  next();
}

/**
 * Ensures mutative operations check concurrency locks before execution.
 */
export function concurrencyGuard(req, res, next) {
  if (req.method === 'POST' && req.path !== '/cancel' && isExecutionLocked()) {
    const active = getActiveExecution();
    return res.status(409).json({
      error: 'Another system maintenance or diagnostic operation is currently running.',
      activeCommand: active?.commandId,
    });
  }
  next();
}
