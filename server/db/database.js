/**
 * WinSuite & MacSuite v10.0 - SQLite Persistent Database Engine
 * Stores diagnostic reports, cleanup manifests, audit ledger, and system snapshots.
 * Automatically saves all DB files in ./MacSuite (on macOS) or ./WinSuite (on Windows).
 *
 * Enforces:
 * 1. 30-Day Auto-Retention Policy (reports, manifests, snapshots older than 30 days are automatically purged).
 * 2. 25 MB Max Database Size Cap (auto-prunes oldest records & runs VACUUM to ensure DB stays strictly <= 25 MB).
 */

import path from 'path';
import fs from 'fs';
import os from 'os';
import { DatabaseSync } from 'node:sqlite';

const isMac = process.platform === 'darwin';
export const DB_FOLDER = isMac ? 'MacSuite' : 'WinSuite';
export const DB_DIR = path.join(process.cwd(), DB_FOLDER);

// Ensure the platform-specific directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

export const DB_PATH = path.join(DB_DIR, 'reports.db');

export const RETENTION_DAYS = 30;
export const MAX_DB_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB limit
export const TARGET_DB_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB target when vacuuming

let dbInstance = null;

export function getDatabase() {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH);
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    dbInstance.exec('PRAGMA synchronous = NORMAL;');
    initSchema(dbInstance);
    enforceRetentionAndSizeLimits(dbInstance);
  }
  return dbInstance;
}

function initSchema(db) {
  // 1. Reports Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      title TEXT NOT NULL,
      report_type TEXT NOT NULL,
      platform TEXT NOT NULL,
      hostname TEXT,
      health_score INTEGER DEFAULT 100,
      summary TEXT,
      data_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // 2. Cleanup Transaction Manifests Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS cleanup_manifests (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      operation_id TEXT,
      items_count INTEGER DEFAULT 0,
      reclaimed_bytes INTEGER DEFAULT 0,
      reclaimed_formatted TEXT,
      reversible INTEGER DEFAULT 1,
      items_json TEXT,
      status TEXT DEFAULT 'completed',
      restored_at TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // 3. Audit History & Ledger Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_ledger (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      operation TEXT NOT NULL,
      command_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      user TEXT,
      risk TEXT DEFAULT 'safe',
      permission_level TEXT,
      result TEXT DEFAULT 'success',
      duration_seconds REAL DEFAULT 0,
      changes_json TEXT,
      reclaimed_bytes INTEGER DEFAULT 0,
      output_log_snippet TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // 4. System Telemetry Snapshots Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_snapshots (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      free_bytes INTEGER,
      total_bytes INTEGER,
      used_bytes INTEGER,
      cpu_usage REAL,
      mem_usage REAL,
      details_json TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Create indexes for fast querying and retention pruning
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_manifests_created ON cleanup_manifests(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_ledger(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_snapshots_created ON system_snapshots(created_at DESC);
  `);

  // Seed / migrate existing JSON data if tables are empty
  migrateLegacyJson(db);
}

function migrateLegacyJson(db) {
  try {
    const auditCount = db.prepare('SELECT COUNT(*) as c FROM audit_ledger').get()?.c || 0;
    if (auditCount === 0) {
      const legacyAuditPath = path.join(process.cwd(), 'audit-history.json');
      if (fs.existsSync(legacyAuditPath)) {
        const raw = fs.readFileSync(legacyAuditPath, 'utf-8');
        const items = JSON.parse(raw);
        if (Array.isArray(items)) {
          const insert = db.prepare(`
            INSERT OR IGNORE INTO audit_ledger (
              id, timestamp, operation, command_id, platform, user, risk,
              permission_level, result, duration_seconds, changes_json,
              reclaimed_bytes, output_log_snippet, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const a of items.slice(0, 500)) {
            insert.run(
              a.id || `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              a.timestamp || new Date().toISOString(),
              a.operation || 'System Operation',
              a.commandId || 'sys.op',
              a.platform || (isMac ? 'macos' : 'windows'),
              a.user || os.userInfo()?.username || 'User',
              a.risk || 'safe',
              a.permissionLevel || 'Standard User',
              a.result || 'success',
              a.durationSeconds || 0,
              JSON.stringify(a.changesMade || []),
              a.reclaimedBytes || 0,
              a.outputLogSnippet || null,
              a.timestamp || new Date().toISOString()
            );
          }
        }
      }
    }

    const manifestCount = db.prepare('SELECT COUNT(*) as c FROM cleanup_manifests').get()?.c || 0;
    if (manifestCount === 0) {
      const legacyTxPath = path.join(process.cwd(), 'cleanup-transactions.json');
      if (fs.existsSync(legacyTxPath)) {
        const raw = fs.readFileSync(legacyTxPath, 'utf-8');
        const items = JSON.parse(raw);
        if (Array.isArray(items)) {
          const insert = db.prepare(`
            INSERT OR IGNORE INTO cleanup_manifests (
              id, timestamp, operation_id, items_count, reclaimed_bytes,
              reclaimed_formatted, reversible, items_json, status, restored_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const t of items.slice(0, 100)) {
            insert.run(
              t.id || `tx-${Date.now()}`,
              t.timestamp || new Date().toISOString(),
              t.operationId || null,
              t.itemsCount || (Array.isArray(t.items) ? t.items.length : 0),
              t.reclaimedBytes || 0,
              t.reclaimedFormatted || '0 MB',
              t.reversible !== false ? 1 : 0,
              JSON.stringify(t.items || []),
              t.status || 'completed',
              t.restoredAt || null,
              t.timestamp || new Date().toISOString()
            );
          }
        }
      }
    }
  } catch (err) {
    console.error('[DB] Legacy migration notice:', err.message);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// RETENTION (30 DAYS) & SIZE CAP (25 MB) ENFORCEMENT ENGINE
// ══════════════════════════════════════════════════════════════════════════════

export function enforceRetentionAndSizeLimits(db = getDatabase()) {
  try {
    // 1. 30-Day Auto-Retention: Purge records older than 30 days
    const cutoffDate = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const delReports = db.prepare('DELETE FROM reports WHERE created_at < ?').run(cutoffDate);
    const delManifests = db.prepare('DELETE FROM cleanup_manifests WHERE created_at < ?').run(cutoffDate);
    const delSnapshots = db.prepare('DELETE FROM system_snapshots WHERE created_at < ?').run(cutoffDate);
    const delAudit = db.prepare('DELETE FROM audit_ledger WHERE created_at < ? AND id NOT IN (SELECT id FROM audit_ledger ORDER BY created_at DESC LIMIT 50)').run(cutoffDate);

    // 2. 25 MB Max Database Size Cap
    let currentSizeBytes = getDbFileSizeBytes();

    if (currentSizeBytes > MAX_DB_SIZE_BYTES) {
      console.warn(`[DB] Database size (${(currentSizeBytes / 1024 / 1024).toFixed(2)} MB) exceeds 25 MB cap. Evicting oldest records...`);

      // Delete oldest reports in batches until under target
      while (currentSizeBytes > TARGET_DB_SIZE_BYTES) {
        const oldestReports = db.prepare('DELETE FROM reports WHERE id IN (SELECT id FROM reports ORDER BY created_at ASC LIMIT 10)').run();
        const oldestSnapshots = db.prepare('DELETE FROM system_snapshots WHERE id IN (SELECT id FROM system_snapshots ORDER BY created_at ASC LIMIT 50)').run();
        const oldestAudit = db.prepare('DELETE FROM audit_ledger WHERE id NOT IN (SELECT id FROM audit_ledger ORDER BY created_at DESC LIMIT 200)').run();

        // If no more records to delete, break
        if (oldestReports.changes === 0 && oldestSnapshots.changes === 0 && oldestAudit.changes === 0) {
          break;
        }

        // Reclaim physical file space
        db.exec('VACUUM;');
        currentSizeBytes = getDbFileSizeBytes();
      }
    }

    return {
      success: true,
      purgedReports: delReports.changes,
      purgedManifests: delManifests.changes,
      purgedSnapshots: delSnapshots.changes,
      purgedAudit: delAudit.changes,
      currentSizeBytes,
      currentSizeFormatted: `${(currentSizeBytes / 1024).toFixed(1)} KB`,
      maxSizeBytes: MAX_DB_SIZE_BYTES,
      retentionDays: RETENTION_DAYS,
    };
  } catch (err) {
    console.error('[DB] Retention enforcement error:', err.message);
    return { success: false, error: err.message };
  }
}

function getDbFileSizeBytes() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return fs.statSync(DB_PATH).size;
    }
  } catch {}
  return 0;
}

// ══════════════════════════════════════════════════════════════════════════════
// REPORTS OPERATIONS
// ══════════════════════════════════════════════════════════════════════════════

export function saveReport({
  id = `rep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  title = `${isMac ? 'MacSuite' : 'WinSuite'} Diagnostic Report`,
  reportType = 'full-system',
  platform = isMac ? 'macos' : 'windows',
  hostname = os.hostname(),
  healthScore = 100,
  summary = 'Comprehensive system diagnostic and telemetry snapshot.',
  data = {},
}) {
  const db = getDatabase();

  // Enforce 30-day retention and 25 MB ceiling before saving new report
  enforceRetentionAndSizeLimits(db);

  const now = new Date().toISOString();
  const insert = db.prepare(`
    INSERT INTO reports (
      id, timestamp, title, report_type, platform, hostname,
      health_score, summary, data_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insert.run(
    id,
    now,
    title,
    reportType,
    platform,
    hostname,
    healthScore,
    summary,
    JSON.stringify(data),
    now
  );

  return {
    id,
    timestamp: now,
    title,
    reportType,
    platform,
    hostname,
    healthScore,
    summary,
    createdAt: now,
  };
}

export function getReports({ limit = 50, offset = 0, reportType = null } = {}) {
  const db = getDatabase();
  let query = 'SELECT id, timestamp, title, report_type, platform, hostname, health_score, summary, created_at FROM reports';
  const params = [];

  if (reportType) {
    query += ' WHERE report_type = ?';
    params.push(reportType);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const rows = db.prepare(query).all(...params);
  return rows.map((r) => ({
    id: r.id,
    timestamp: r.timestamp,
    title: r.title,
    reportType: r.report_type,
    platform: r.platform,
    hostname: r.hostname,
    healthScore: r.health_score,
    summary: r.summary,
    createdAt: r.created_at,
  }));
}

export function getReportById(id) {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
  if (!row) return null;
  return {
    id: row.id,
    timestamp: row.timestamp,
    title: row.title,
    reportType: row.report_type,
    platform: row.platform,
    hostname: row.hostname,
    healthScore: row.health_score,
    summary: row.summary,
    data: JSON.parse(row.data_json || '{}'),
    createdAt: row.created_at,
  };
}

export function deleteReport(id) {
  const db = getDatabase();
  const info = db.prepare('DELETE FROM reports WHERE id = ?').run(id);
  return info.changes > 0;
}

// ══════════════════════════════════════════════════════════════════════════════
// CLEANUP MANIFESTS OPERATIONS
// ══════════════════════════════════════════════════════════════════════════════

export function saveCleanupManifest({
  id = `tx-${Date.now()}`,
  timestamp = new Date().toISOString(),
  operationId = null,
  itemsCount = 0,
  reclaimedBytes = 0,
  reclaimedFormatted = '0 MB',
  reversible = true,
  items = [],
  status = 'completed',
}) {
  const db = getDatabase();
  const now = new Date().toISOString();
  const insert = db.prepare(`
    INSERT INTO cleanup_manifests (
      id, timestamp, operation_id, items_count, reclaimed_bytes,
      reclaimed_formatted, reversible, items_json, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insert.run(
    id,
    timestamp,
    operationId,
    itemsCount,
    reclaimedBytes,
    reclaimedFormatted,
    reversible ? 1 : 0,
    JSON.stringify(items),
    status,
    now
  );

  return {
    id,
    timestamp,
    operationId,
    itemsCount,
    reclaimedBytes,
    reclaimedFormatted,
    reversible,
    items,
    status,
  };
}

export function getCleanupManifests(limit = 100) {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM cleanup_manifests ORDER BY created_at DESC LIMIT ?').all(limit);
  return rows.map((r) => ({
    id: r.id,
    timestamp: r.timestamp,
    operationId: r.operation_id,
    itemsCount: r.items_count,
    reclaimedBytes: r.reclaimed_bytes,
    reclaimedFormatted: r.reclaimed_formatted,
    reversible: r.reversible === 1,
    items: JSON.parse(r.items_json || '[]'),
    status: r.status,
    restoredAt: r.restored_at,
    createdAt: r.created_at,
  }));
}

export function updateCleanupManifestStatus(id, status = 'restored', restoredAt = new Date().toISOString()) {
  const db = getDatabase();
  const update = db.prepare(`
    UPDATE cleanup_manifests
    SET status = ?, restored_at = ?
    WHERE id = ?
  `);
  const res = update.run(status, restoredAt, id);
  return res.changes > 0;
}

// ══════════════════════════════════════════════════════════════════════════════
// AUDIT LEDGER OPERATIONS
// ══════════════════════════════════════════════════════════════════════════════

export function saveAuditEntry(entry) {
  const db = getDatabase();
  const id = entry.id || `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const now = entry.timestamp || new Date().toISOString();

  const insert = db.prepare(`
    INSERT INTO audit_ledger (
      id, timestamp, operation, command_id, platform, user, risk,
      permission_level, result, duration_seconds, changes_json,
      reclaimed_bytes, output_log_snippet, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insert.run(
    id,
    now,
    entry.operation || 'System Operation',
    entry.commandId || 'sys.op',
    entry.platform || (isMac ? 'macos' : 'windows'),
    entry.user || os.userInfo()?.username || 'User',
    entry.risk || 'safe',
    entry.permissionLevel || 'Standard User',
    entry.result || 'success',
    entry.durationSeconds || 0,
    JSON.stringify(Array.isArray(entry.changesMade) ? entry.changesMade : [entry.operation || 'Executed']),
    entry.reclaimedBytes || 0,
    entry.outputLogSnippet || null,
    now
  );

  return {
    id,
    timestamp: now,
    operation: entry.operation,
    commandId: entry.commandId,
    platform: entry.platform,
    user: entry.user,
    risk: entry.risk,
    permissionLevel: entry.permissionLevel,
    result: entry.result,
    durationSeconds: entry.durationSeconds,
    changesMade: entry.changesMade,
    reclaimedBytes: entry.reclaimedBytes,
    outputLogSnippet: entry.outputLogSnippet,
  };
}

export function getAuditEntries(limit = 500) {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM audit_ledger ORDER BY created_at DESC LIMIT ?').all(limit);
  return rows.map((r) => ({
    id: r.id,
    timestamp: r.timestamp,
    operation: r.operation,
    commandId: r.command_id,
    platform: r.platform,
    user: r.user,
    risk: r.risk,
    permissionLevel: r.permission_level,
    result: r.result,
    durationSeconds: r.duration_seconds,
    changesMade: JSON.parse(r.changes_json || '[]'),
    reclaimedBytes: r.reclaimed_bytes,
    outputLogSnippet: r.output_log_snippet,
  }));
}

// ══════════════════════════════════════════════════════════════════════════════
// DATABASE STATUS & METRICS
// ══════════════════════════════════════════════════════════════════════════════

export function getDbStats() {
  const db = getDatabase();
  const reportsCount = db.prepare('SELECT COUNT(*) as c FROM reports').get()?.c || 0;
  const manifestsCount = db.prepare('SELECT COUNT(*) as c FROM cleanup_manifests').get()?.c || 0;
  const auditCount = db.prepare('SELECT COUNT(*) as c FROM audit_ledger').get()?.c || 0;

  const sizeBytes = getDbFileSizeBytes();
  const sizePercentage = +((sizeBytes / MAX_DB_SIZE_BYTES) * 100).toFixed(2);

  return {
    dbFolder: DB_FOLDER,
    dbDir: DB_DIR,
    dbPath: DB_PATH,
    sizeBytes,
    sizeFormatted: sizeBytes > 1024 * 1024
      ? `${(sizeBytes / 1024 / 1024).toFixed(2)} MB`
      : `${(sizeBytes / 1024).toFixed(1)} KB`,
    maxSizeBytes: MAX_DB_SIZE_BYTES,
    maxSizeFormatted: '25.0 MB',
    sizePercentage,
    retentionDays: RETENTION_DAYS,
    reportsCount,
    manifestsCount,
    auditCount,
  };
}
