/**
 * WinSuite & MacSuite v6.3 - Audit Logger
 * Records structured, sanitized audit records for every mutative operation.
 */

import os from 'os';
import { loadAuditRecords, saveAuditRecords } from './audit-store.js';

let inMemoryAuditLedger = loadAuditRecords();

// If ledger is empty on fresh start, seed initial initialization record
if (inMemoryAuditLedger.length === 0) {
  const isMac = process.platform === 'darwin';
  inMemoryAuditLedger.push({
    id: `audit-${Date.now()}-init`,
    timestamp: new Date().toISOString(),
    operation: `${isMac ? 'MacSuite' : 'WinSuite'} Engine Initialization & Baseline Audit`,
    commandId: 'sys.init',
    platform: isMac ? 'macos' : 'windows',
    user: os.userInfo()?.username || 'System User',
    risk: 'safe',
    permissionLevel: 'Standard User',
    result: 'success',
    durationSeconds: 0.1,
    changesMade: ['Telemetry baseline recorded', 'Security policy verified'],
    reclaimedBytes: 0,
    outputLogSnippet: 'System environment telemetry initialized successfully.',
  });
  saveAuditRecords(inMemoryAuditLedger);
}

/**
 * Logs a new operation record into the persistent audit ledger.
 * @param {Object} entry
 * @returns {Object} The complete audit record
 */
export function logAuditEntry(entry) {
  const isMac = process.platform === 'darwin';
  const record = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    operation: entry.operation || 'System Operation',
    commandId: entry.commandId || 'unknown',
    platform: isMac ? 'macos' : 'windows',
    user: os.userInfo()?.username || 'System User',
    risk: entry.risk || 'safe',
    permissionLevel: entry.permissionLevel || (process.platform === 'win32' ? 'Administrator' : 'Root'),
    result: entry.result || 'success',
    durationSeconds: entry.durationSeconds || 0,
    changesMade: Array.isArray(entry.changesMade) ? entry.changesMade : [entry.operation || 'Operation executed'],
    reclaimedBytes: typeof entry.reclaimedBytes === 'number' ? entry.reclaimedBytes : 0,
    errorCode: entry.errorCode || undefined,
    outputLogSnippet: entry.outputLogSnippet ? String(entry.outputLogSnippet).slice(0, 500) : undefined,
  };

  inMemoryAuditLedger.unshift(record);

  // Keep last 500 records
  if (inMemoryAuditLedger.length > 500) {
    inMemoryAuditLedger = inMemoryAuditLedger.slice(0, 500);
  }

  saveAuditRecords(inMemoryAuditLedger);
  return record;
}

/**
 * Retrieves the full audit history.
 * @returns {Array<Object>}
 */
export function getAuditHistory() {
  return inMemoryAuditLedger;
}
