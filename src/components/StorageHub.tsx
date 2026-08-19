import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HardDrive, Trash2, Folder, FileCode, CheckCircle2, ChevronRight, Camera, Sparkles, HelpCircle, Layers } from 'lucide-react';
import type { SystemInfo, RunMode } from '../types';
import { usePlatform } from '../platform';
import StorageAnalyzer from './StorageAnalyzer';
import InspectorModal, { type InspectorData } from './InspectorModal';

interface Props {
  systemInfo: SystemInfo;
  onClean: (mode: RunMode) => void;
}

type StorageTab = 'analyzer' | 'systemData' | 'developer' | 'snapshots' | 'largeFiles';

export default function StorageHub({ systemInfo, onClean }: Props) {
  const { config, isMac } = usePlatform();
  const [subTab, setSubTab] = useState<StorageTab>('analyzer');
  const [devArtifacts, setDevArtifacts] = useState<any[]>([]);
  const [storageData, setStorageData] = useState<any>(null);
  const [systemDataInfo, setSystemDataInfo] = useState<any>(null);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [inspectItem, setInspectItem] = useState<InspectorData | null>(null);

  useEffect(() => {
    fetch('http://127.0.0.1:3131/api/developer-cleanup')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setDevArtifacts(d.artifacts || []))
      .catch(() => {});

    fetch('http://127.0.0.1:3131/api/storage')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setStorageData(d))
      .catch(() => {});

    fetch('http://127.0.0.1:3131/api/storage/system-data')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setSystemDataInfo(d))
      .catch(() => {});

    fetch('http://127.0.0.1:3131/api/snapshots')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setSnapshots(d.snapshots || []))
      .catch(() => {});
  }, []);

  return (
    <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <InspectorModal data={inspectItem} onClose={() => setInspectItem(null)} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25">
              <HardDrive size={12} /> Storage &amp; Cleanup Center
            </span>
            <span className="pill" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-ink-3)', borderColor: 'var(--color-line)' }}>
              System Data De-Mystifier &amp; APFS Probes Active
            </span>
          </div>
          <h1 className="text-hero font-extrabold tracking-tight" style={{ color: 'var(--color-ink)' }}>
            Storage &amp; Developer Cleanup
          </h1>
          <p className="mt-1 text-[14px]" style={{ color: 'var(--color-ink-3)' }}>
            {isMac
              ? 'Itemize mysterious System Data, APFS snapshots, Xcode DerivedData, and large downloads.'
              : 'NTFS volume breakdown, Component Store (WinSxS), Visual Studio artifacts, and temporary cache analyzer.'}
          </p>
        </div>

        <button onClick={() => onClean('CleanupOnly')} className="btn btn-primary text-xs cursor-pointer">
          <Trash2 size={13} />
          <span>Launch Cleanup Profile</span>
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl border overflow-x-auto" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
        {[
          { id: 'analyzer' as const, label: 'Storage Intelligence', icon: HardDrive },
          { id: 'systemData' as const, label: isMac ? 'System Data De-Mystifier' : 'WinSxS & System Store', icon: Sparkles },
          { id: 'developer' as const, label: isMac ? 'Developer Caches (Xcode/npm)' : 'Developer Caches (VS/NPM)', icon: FileCode },
          { id: 'snapshots' as const, label: isMac ? 'APFS Local Snapshots' : 'System Restore Points', icon: Camera },
          { id: 'largeFiles' as const, label: 'Largest Files & Downloads', icon: Folder },
        ].map((t) => {
          const isSel = subTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer"
              style={
                isSel
                  ? { backgroundColor: '#3b82f6', color: '#fff', boxShadow: '0 2px 8px rgba(59,130,246,0.3)' }
                  : { color: 'var(--color-ink-3)' }
              }
            >
              <t.icon size={14} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {subTab === 'analyzer' && (
          <motion.div key="analyzer" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <StorageAnalyzer systemInfo={systemInfo} onClean={onClean} />
          </motion.div>
        )}

        {subTab === 'systemData' && (
          <motion.div key="systemData" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--color-line)' }}>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>
                  System Data De-Mystifier &amp; Storage Intelligence
                </h3>
                <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--color-ink-4)' }}>
                  Exact breakdown of the {systemDataInfo?.totalSystemDataGB || 0} GB hidden inside macOS System Data / Other.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="pill bg-emerald-500/10 text-emerald-500 border-emerald-500/25 text-xs font-bold">
                  Potential Recovery: ~{systemDataInfo?.potentialRecoveryGB || 0} GB
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(systemDataInfo?.categories || []).map((cat: any) => (
                <div
                  key={cat.id}
                  onClick={() =>
                    setInspectItem({
                      title: cat.name,
                      category: 'System Data Category',
                      badge: `${cat.sizeGB} GB`,
                      subtitle: cat.description,
                      details: [
                        { label: 'Filesystem Location', value: cat.path, isCode: true },
                        { label: 'Storage Occupied', value: `${cat.sizeGB} GB` },
                        { label: 'Reclaimable Status', value: cat.reclaimable ? 'Reclaimable' : 'System Locked' },
                        { label: 'Why Is This System Data?', value: cat.whyIsItSystemData || 'Allocated outside user Documents/Media.' },
                      ],
                      actionButton: cat.safeToPurge ? {
                        label: 'Purge via Safe Cleanup',
                        onClick: () => onClean('CleanupOnly'),
                        icon: Trash2,
                      } : undefined,
                    })
                  }
                  className="p-5 rounded-2xl border flex flex-col justify-between space-y-3 cursor-pointer transition-all hover:scale-[1.01]"
                  style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold" style={{ color: 'var(--color-ink)' }}>{cat.name}</h4>
                      <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--color-ink-3)' }}>{cat.description}</p>
                    </div>
                    <span className="font-mono text-base font-extrabold text-blue-500 shrink-0">{cat.sizeGB} GB</span>
                  </div>

                  <div className="pt-2 border-t flex items-center justify-between text-[11px]" style={{ borderColor: 'var(--color-line)' }}>
                    <span className="text-blue-500 font-bold flex items-center gap-1">
                      <HelpCircle size={11} /> Why is this System Data?
                    </span>
                    <span className={`pill text-[10px] ${cat.safeToPurge ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25' : 'bg-slate-500/10 text-slate-400'}`}>
                      {cat.safeToPurge ? 'Safe to Clean' : 'Protected'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {subTab === 'developer' && (
          <motion.div key="developer" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>Developer Cache Footprint</h3>
                <p className="text-xs font-medium" style={{ color: 'var(--color-ink-4)' }}>Discovered compilation artifacts and package cache stores</p>
              </div>
              <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25 text-[10px]">
                {devArtifacts.length} Active Cache Stores
              </span>
            </div>
            <div className="space-y-3">
              {devArtifacts.map((art) => (
                <button
                  key={art.id}
                  onClick={() =>
                    setInspectItem({
                      title: art.name,
                      category: 'Developer Build Cache',
                      badge: `${art.sizeMB >= 1024 ? (art.sizeMB / 1024).toFixed(1) + ' GB' : art.sizeMB + ' MB'} Reclaimable`,
                      subtitle: 'Cached intermediate compilation assets and package downloads.',
                      details: [
                        { label: 'Directory Path', value: art.path, isCode: true },
                        { label: 'Storage Footprint', value: `${(art.sizeMB / 1024).toFixed(2)} GB (${art.sizeMB} MB)` },
                        { label: 'Safe Cleanup Impact', value: 'Reclaims disk space without breaking project source code' },
                      ],
                      actionButton: {
                        label: 'Clean Via Storage Profile',
                        onClick: () => onClean('CleanupOnly'),
                        icon: Trash2,
                      },
                    })
                  }
                  className="w-full p-4 rounded-2xl border flex items-center justify-between gap-3 text-left transition-all hover:scale-[1.01] cursor-pointer"
                  style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileCode size={18} className="text-blue-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate" style={{ color: 'var(--color-ink)' }}>{art.name}</p>
                      <p className="text-[11px] font-mono opacity-70 truncate" style={{ color: 'var(--color-ink-4)' }}>{art.path}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-2">
                    <span className="font-mono text-xs font-extrabold text-blue-500">{(art.sizeMB / 1024).toFixed(1)} GB</span>
                    <ChevronRight size={14} className="text-slate-400" />
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {subTab === 'snapshots' && (
          <motion.div key="snapshots" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>
                  {isMac ? 'APFS Local Snapshots (Time Machine)' : 'System Restore Points'}
                </h3>
                <p className="text-xs font-medium" style={{ color: 'var(--color-ink-4)' }}>
                  {isMac
                    ? 'Discovered read-only APFS volume snapshots created by macOS Time Machine.'
                    : 'Discovered Volume Shadow Copy (VSS) checkpoints.'}
                </p>
              </div>
              <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25 text-[10px]">
                {snapshots.length} Snapshots
              </span>
            </div>

            <div className="space-y-3">
              {snapshots.map((snap) => (
                <button
                  key={snap.id}
                  onClick={() =>
                    setInspectItem({
                      title: snap.id,
                      category: isMac ? 'APFS Snapshot' : 'Restore Point',
                      badge: snap.size || '1.2 GB',
                      subtitle: `Creation Date: ${snap.date}`,
                      details: [
                        { label: 'Identifier', value: snap.id, isCode: true },
                        { label: 'Snapshot Date', value: snap.date },
                        { label: 'Estimated Space', value: snap.size || '1.2 GB' },
                        { label: 'Storage Class', value: 'Purgeable APFS Container Extents' },
                      ],
                      command: isMac ? 'tmutil listlocalsnapshots /' : 'Get-ComputerRestorePoint',
                    })
                  }
                  className="w-full p-4 rounded-2xl border flex items-center justify-between gap-3 text-left transition-all hover:scale-[1.01] cursor-pointer"
                  style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Camera size={18} className="text-blue-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate" style={{ color: 'var(--color-ink)' }}>{snap.id}</p>
                      <p className="text-[11px] font-mono opacity-70 truncate" style={{ color: 'var(--color-ink-4)' }}>Created: {snap.date}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-500">{snap.size || '1.2 GB'}</span>
                    <ChevronRight size={14} className="text-slate-400" />
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {subTab === 'largeFiles' && (
          <motion.div key="large" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>Large Downloads &amp; Media Files</h3>
                <p className="text-xs font-medium" style={{ color: 'var(--color-ink-4)' }}>Files consuming significant space on primary disk</p>
              </div>
              <span className="pill bg-emerald-500/10 text-emerald-500 border-emerald-500/25 text-[10px]">
                {(storageData?.largeFiles || []).length} Files Discovered
              </span>
            </div>

            <div className="space-y-3">
              {(storageData?.largeFiles || []).map((file: any, i: number) => (
                <button
                  key={i}
                  onClick={() =>
                    setInspectItem({
                      title: file.name,
                      category: 'Large File',
                      badge: file.size,
                      subtitle: file.path,
                      details: [
                        { label: 'File Name', value: file.name },
                        { label: 'Full Path', value: file.path, isCode: true },
                        { label: 'File Size', value: file.size },
                      ],
                    })
                  }
                  className="w-full p-4 rounded-2xl border flex items-center justify-between gap-3 text-left transition-all hover:scale-[1.01] cursor-pointer"
                  style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Folder size={18} className="text-emerald-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate" style={{ color: 'var(--color-ink)' }}>{file.name}</p>
                      <p className="text-[11px] font-mono opacity-70 truncate" style={{ color: 'var(--color-ink-4)' }}>{file.path}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-emerald-500">{file.size}</span>
                    <ChevronRight size={14} className="text-slate-400" />
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
