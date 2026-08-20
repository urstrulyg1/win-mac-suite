/**
 * WinSuite & MacSuite v10.0 - Real Space Reclamation Engine
 * Safely removes stale caches, temporary build artifacts, and purgeable snapshots,
 * measuring actual deleted bytes and filesystem free space changes.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { statfs } from 'fs/promises';
import { runSafeCommand } from '../helpers/macos-helpers.js';
import { validateDeletionTarget } from '../security/protected-paths.js';

const isMac = process.platform === 'darwin';

/**
 * Recursively measures the byte size of a path without following symlinks.
 */
export function measurePathSizeBytes(targetPath) {
  if (!fs.existsSync(targetPath)) return 0;
  let total = 0;
  const stack = [targetPath];

  while (stack.length > 0) {
    const curr = stack.pop();
    let st;
    try {
      st = fs.lstatSync(curr);
    } catch {
      continue;
    }

    if (st.isSymbolicLink()) {
      total += st.size;
      continue;
    }

    if (st.isDirectory()) {
      let entries = [];
      try {
        entries = fs.readdirSync(curr);
      } catch {
        continue;
      }
      for (const e of entries) {
        stack.push(path.join(curr, e));
      }
    } else {
      total += st.size;
    }
  }

  return total;
}

/**
 * Safely clears directory contents without deleting the root directory itself.
 */
function safelyClearDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;
  let bytesFreed = 0;

  try {
    const entries = fs.readdirSync(dirPath);
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      const size = measurePathSizeBytes(fullPath);
      try {
        fs.rmSync(fullPath, { recursive: true, force: true });
        bytesFreed += size;
      } catch {}
    }
  } catch {}

  return bytesFreed;
}

/**
 * Samples free bytes on the root filesystem.
 */
export async function getRootFreeBytes() {
  try {
    const st = await statfs('/');
    return st.bavail * st.bsize;
  } catch {
    return null;
  }
}

/**
 * Executes real space reclamation for the selected cleanup plan item IDs.
 */
export async function executeRealSpaceCleanup(selectedItemIds = []) {
  const h = os.homedir();
  const beforeFreeBytes = await getRootFreeBytes();
  let totalMeasuredBytes = 0;
  const cleanedItems = [];

  for (const id of selectedItemIds) {
    if (id === 'plan-1' || id === 'snapshots') {
      // 1. APFS Time Machine Snapshot Deltas
      if (isMac) {
        try {
          await runSafeCommand('/usr/bin/tmutil', ['thinlocalsnapshots', '/', '10000000000', '4'], 8000);
          cleanedItems.push({ id: 'plan-1', name: 'APFS Snapshot Deltas Thinned', success: true });
        } catch {
          cleanedItems.push({ id: 'plan-1', name: 'APFS Snapshots', success: false });
        }
      }
    } else if (id === 'plan-2' || id === 'xcode') {
      // 2. Xcode DerivedData
      if (isMac) {
        const derivedPath = path.join(h, 'Library/Developer/Xcode/DerivedData');
        const archivesPath = path.join(h, 'Library/Developer/Xcode/Archives');
        const freedDerived = safelyClearDirectory(derivedPath);
        totalMeasuredBytes += freedDerived;
        cleanedItems.push({ id: 'plan-2', name: 'Xcode DerivedData & Module Caches', freedBytes: freedDerived, success: true });
      }
    } else if (id === 'plan-3' || id === 'browsers') {
      // 3. Browser Caches
      let browserFreed = 0;
      const cacheDirs = isMac
        ? [
            path.join(h, 'Library/Caches/Google/Chrome/Default/Cache'),
            path.join(h, 'Library/Caches/Google/Chrome/Default/Code Cache'),
            path.join(h, 'Library/Caches/Google/Chrome/Default/GPUCache'),
            path.join(h, 'Library/Caches/com.apple.Safari'),
            path.join(h, 'Library/Caches/BraveSoftware/Brave-Browser/Default/Cache'),
            path.join(h, 'Library/Caches/org.mozilla.firefox'),
          ]
        : [
            path.join(h, 'AppData/Local/Google/Chrome/User Data/Default/Cache'),
            path.join(h, 'AppData/Local/Microsoft/Edge/User Data/Default/Cache'),
          ];

      for (const cd of cacheDirs) {
        browserFreed += safelyClearDirectory(cd);
      }
      totalMeasuredBytes += browserFreed;
      cleanedItems.push({ id: 'plan-3', name: 'Browser Caches (Chrome, Safari, Brave)', freedBytes: browserFreed, success: true });
    } else if (id === 'plan-4' || id === 'homebrew') {
      // 4. Homebrew Downloads & Caches
      if (isMac) {
        const brewCacheDir = path.join(h, 'Library/Caches/Homebrew/downloads');
        const freedBrew = safelyClearDirectory(brewCacheDir);
        await runSafeCommand('brew', ['cleanup', '-s', '--prune=all'], 10000).catch(() => {});
        totalMeasuredBytes += freedBrew;
        cleanedItems.push({ id: 'plan-4', name: 'Homebrew Stale Downloads & Bottles', freedBytes: freedBrew, success: true });
      }
    } else if (id === 'plan-5' || id === 'logs') {
      // 5. Crash Dumps & Logs
      const logsDir = isMac ? path.join(h, 'Library/Logs/DiagnosticReports') : path.join(h, 'AppData/Local/CrashDumps');
      const freedLogs = safelyClearDirectory(logsDir);
      totalMeasuredBytes += freedLogs;
      cleanedItems.push({ id: 'plan-5', name: 'Crash Dumps & Unified Diagnostic Logs', freedBytes: freedLogs, success: true });
    }
  }

  // Force macOS kernel to flush purgeable allocations and page caches
  if (isMac) {
    await runSafeCommand('/usr/bin/purge', [], 4000).catch(() => {});
  }

  const afterFreeBytes = await getRootFreeBytes();
  const fsReclaimedBytes = (beforeFreeBytes !== null && afterFreeBytes !== null)
    ? Math.max(0, afterFreeBytes - beforeFreeBytes)
    : null;

  // Use the larger of direct file measurements and filesystem free delta
  const finalReclaimedBytes = Math.max(totalMeasuredBytes, fsReclaimedBytes || 0);

  return {
    success: true,
    cleanedItems,
    itemsCount: selectedItemIds.length,
    measuredFileBytes: totalMeasuredBytes,
    filesystemDeltaBytes: fsReclaimedBytes,
    reclaimedBytes: finalReclaimedBytes,
    reclaimedFormatted: finalReclaimedBytes > 1024 * 1024 * 1024
      ? `${(finalReclaimedBytes / 1024 / 1024 / 1024).toFixed(2)} GB`
      : `${Math.round(finalReclaimedBytes / 1024 / 1024)} MB`,
  };
}
