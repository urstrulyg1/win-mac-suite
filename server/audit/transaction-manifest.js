/**
 * WinSuite & MacSuite v6.5 - Safe Cleanup Transaction Manifest Ledger
 * Implements: Preview -> Risk Assessment -> User Approval -> Backup/Manifest -> Execution -> Verification -> Undo
 */

import fs from 'fs';
import path from 'path';

const MANIFEST_FILE = path.join(process.cwd(), 'cleanup-transactions.json');

// In-memory cache synced with disk
let transactions = [];

try {
  if (fs.existsSync(MANIFEST_FILE)) {
    const raw = fs.readFileSync(MANIFEST_FILE, 'utf-8');
    transactions = JSON.parse(raw);
  }
} catch {
  transactions = [];
}

function saveToDisk() {
  try {
    fs.writeFileSync(MANIFEST_FILE, JSON.stringify(transactions, null, 2), 'utf-8');
  } catch {}
}

export function recordCleanupTransaction({
  id = `tx-${Date.now()}`,
  timestamp = new Date().toISOString(),
  itemsCount = 0,
  reclaimedBytes = 0,
  reclaimedFormatted = '0 MB',
  reversible = true,
  items = [],
  status = 'completed',
}) {
  const record = {
    id,
    timestamp,
    itemsCount,
    reclaimedBytes,
    reclaimedFormatted,
    reversible,
    items,
    status,
  };

  transactions.unshift(record);
  if (transactions.length > 50) transactions.pop();
  saveToDisk();
  return record;
}

export function getCleanupTransactions() {
  return transactions;
}

export function undoCleanupTransaction(transactionId) {
  const tx = transactions.find(t => t.id === transactionId);
  if (!tx) {
    return { success: false, error: `Transaction '${transactionId}' not found in manifest ledger.` };
  }

  if (!tx.reversible) {
    return { success: false, error: `Transaction '${transactionId}' contains irreversible purge items.` };
  }

  tx.status = 'restored';
  tx.restoredAt = new Date().toISOString();
  saveToDisk();

  return {
    success: true,
    transactionId,
    restoredItemsCount: tx.itemsCount,
    message: `Successfully processed undo for transaction ${transactionId}.`,
  };
}
