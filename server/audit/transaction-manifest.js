/**
 * WinSuite & MacSuite v10.0 - Safe Cleanup Transaction Manifest Ledger
 * Connected to persistent SQLite database in MacSuite/WinSuite folder.
 */

import {
  saveCleanupManifest,
  getCleanupManifests as getManifestsFromDb,
  updateCleanupManifestStatus,
} from '../db/database.js';

export function recordCleanupTransaction({
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
  return saveCleanupManifest({
    id,
    timestamp,
    operationId,
    itemsCount,
    reclaimedBytes,
    reclaimedFormatted,
    reversible,
    items,
    status,
  });
}

export function getCleanupTransactions() {
  return getManifestsFromDb();
}

export function undoCleanupTransaction(transactionId) {
  const manifests = getManifestsFromDb();
  const tx = manifests.find((t) => t.id === transactionId);

  if (!tx) {
    return { success: false, error: `Transaction '${transactionId}' not found in manifest ledger.` };
  }

  if (!tx.reversible) {
    return { success: false, error: `Transaction '${transactionId}' contains irreversible purge items.` };
  }

  const restoredAt = new Date().toISOString();
  updateCleanupManifestStatus(transactionId, 'restored', restoredAt);

  return {
    success: true,
    transactionId,
    restoredItemsCount: tx.itemsCount,
    message: `Successfully processed undo for transaction ${transactionId}.`,
  };
}
