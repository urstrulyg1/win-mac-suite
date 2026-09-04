/**
 * WinSuite & MacSuite v10.0 - Audit Logger
 * Records structured, sanitized audit records directly into the SQLite database
 * in MacSuite/WinSuite folder.
 */

import os from 'os';
import { saveAuditEntry, getAuditEntries } from '../db/database.js';

/**
 * Logs a new operation record into the persistent audit ledger database.
 * @param {Object} entry
 * @returns {Object} The complete audit record
 */
export function logAuditEntry(entry) {
  const isMac = process.platform === 'darwin';
  const record = {
    id: entry.id || `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: entry.timestamp || new Date().toISOString(),
    operation: entry.operation || 'System Operation',
    commandId: entry.commandId || 'unknown',
    platform: entry.platform || (isMac ? 'macos' : 'windows'),
    user: entry.user || os.userInfo()?.username || 'System User',
    risk: entry.risk || 'safe',
    permissionLevel: entry.permissionLevel || (process.platform === 'win32' ? 'Administrator' : 'Root'),
    result: entry.result || 'unknown',
    durationSeconds: entry.durationSeconds || 0,
    changesMade: Array.isArray(entry.changesMade) ? entry.changesMade : [entry.operation || 'Operation executed'],
    reclaimedBytes: typeof entry.reclaimedBytes === 'number' ? entry.reclaimedBytes : 0,
    errorCode: entry.errorCode || undefined,
    outputLogSnippet: entry.outputLogSnippet ? String(entry.outputLogSnippet).slice(0, 500) : undefined,
  };

  return saveAuditEntry(record);
}

/**
 * Retrieves the full audit history from SQLite database.
 * @returns {Array<Object>}
 */
export function getAuditHistory() {
  return getAuditEntries(500);
}
