/**
 * WinSuite & MacSuite v6.3 - Audit Store
 * Persistent JSON file-backed ledger for system maintenance operation history.
 */

import fs from 'fs';
import path from 'path';

const AUDIT_FILE = path.join(process.cwd(), 'audit-history.json');

/**
 * Reads all audit records from disk.
 * @returns {Array<Object>}
 */
export function loadAuditRecords() {
  try {
    if (fs.existsSync(AUDIT_FILE)) {
      const raw = fs.readFileSync(AUDIT_FILE, 'utf8');
      const data = JSON.parse(raw);
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.records)) return data.records;
    }
  } catch (err) {
    console.error('⚠️ Failed to load audit history from disk:', err.message);
  }
  return [];
}

/**
 * Saves audit records to disk atomically.
 * @param {Array<Object>} records
 */
export function saveAuditRecords(records) {
  try {
    const tempFile = `${AUDIT_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(records, null, 2), 'utf8');
    fs.renameSync(tempFile, AUDIT_FILE);
  } catch (err) {
    console.error('⚠️ Failed to save audit record to disk:', err.message);
  }
}
