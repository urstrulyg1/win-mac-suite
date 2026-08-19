import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HardDrive, Trash2, Folder, FileCode, CheckCircle2, ChevronRight, Camera, Sparkles } from 'lucide-react';
import type { SystemInfo, RunMode } from '../types';
import { usePlatform } from '../platform';
import StorageAnalyzer from './StorageAnalyzer';
import InspectorModal, { type InspectorData } from './InspectorModal';

interface Props {
  systemInfo: SystemInfo;
  onClean: (mode: RunMode) => void;
}

type StorageTab = 'analyzer' | 'developer' | 'largeFiles' | 'snapshots';

export default function StorageHub({ systemInfo, onClean }: Props) {
  const { config, isMac } = usePlatform();
  const [subTab, setSubTab] = useState<StorageTab>('analyzer');
  const [devArtifacts, setDevArtifacts] = useState<any[]>([]);
  const [storageData, setStorageData] = useState<any>(null);
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
              Native APFS / Storage Probes Active · Click Any Tile To Inspect
            </span>
          </div>
          <h1 className="text-hero font-extrabold tracking-tight" style={{ color: 'var(--color-ink)' }}>
            Storage &amp; Developer Cleanup
          </h1>
          <p className="mt-1 text-[14px]" style={{ color: 'var(--color-ink-3)' }}>
            {isMac
              ? 'APFS container partition analysis, Xcode DerivedData, CocoaPods, and Time Machine snapshot storage.'
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
          { id: 'developer' as const, label: isMac ? 'Developer Caches (Xcode/Brew/npm)' : 'Developer Caches (VS/NPM)', icon: FileCode },
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
                  {isMac ? 'APFS Local Snapshots (Time Machine)' : 'System Restore Points (VSS Shadow Copies)'}
                </h3>
                <p className="text-xs font-medium" style={{ color: 'var(--color-ink-4)' }}>
                  {isMac
                    ? 'Local read-only snapshot images created on the root APFS container volume'
                    : 'Windows Volume Shadow Copy restore checkpoints'}
                </p>
              </div>
              <span className="pill bg-purple-500/10 text-purple-500 border-purple-500/25 text-[10px]">
                {snapshots.length} Snapshot(s) Discovered
              </span>
            </div>

            <div className="space-y-3">
              {snapshots.map((snap, idx) => (
                <button
                  key={idx}
                  onClick={() =>
                    setInspectItem({
                      title: isMac ? `APFS Local Snapshot (${snap.date})` : snap.description || 'System Restore Point',
                      category: isMac ? 'Time Machine APFS' : 'VSS Shadow Copy',
                      badge: snap.size || '1.2 GB',
                      subtitle: 'Local incremental filesystem snapshot image.',
                      details: [
                        { label: 'Snapshot ID', value: snap.id },
                        { label: 'Creation Timestamp', value: snap.date },
                        { label: 'Estimated Space', value: snap.size || '1.2 GB' },
                      ],
                      command: isMac ? `tmutil listlocalsnapshots /` : 'Get-ComputerRestorePoint',
                    })
                  }
                  className="w-full p-4 rounded-2xl border flex items-center justify-between gap-3 text-left transition-all hover:scale-[1.01] cursor-pointer"
                  style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Camera size={18} className="text-purple-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate" style={{ color: 'var(--color-ink)' }}>{snap.id}</p>
                      <p className="text-[11px] font-mono opacity-70 truncate" style={{ color: 'var(--color-ink-4)' }}>
                        Created: {snap.date}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-2">
                    <span className="font-mono text-xs font-extrabold text-purple-500">{snap.size}</span>
                    <ChevronRight size={14} className="text-slate-400" />
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {subTab === 'largeFiles' && (
          <motion.div key="largeFiles" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>Top Storage Candidates</h3>
                <p className="text-xs font-medium" style={{ color: 'var(--color-ink-4)' }}>Large files discovered in Downloads and Caches folders</p>
              </div>
              <span className="pill bg-amber-500/10 text-amber-500 border-amber-500/25 text-[10px]">
                {(storageData?.largeFiles || []).length} Candidates Found
              </span>
            </div>
            <div className="space-y-3">
              {(storageData?.largeFiles || []).map((lf: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() =>
                    setInspectItem({
                      title: lf.name,
                      category: 'Large File Candidate',
                      badge: lf.size,
                      subtitle: 'Large file discovered in local user directories.',
                      details: [
                        { label: 'File Name', value: lf.name },
                        { label: 'File Path', value: lf.path, isCode: true },
                        { label: 'File Size', value: lf.size },
                      ],
                    })
                  }
                  className="w-full p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-left transition-all hover:scale-[1.01] cursor-pointer"
                  style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Folder size={18} className="text-amber-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate" style={{ color: 'var(--color-ink)' }}>{lf.name}</p>
                      <p className="text-[11px] font-mono opacity-70 truncate" style={{ color: 'var(--color-ink-4)' }}>{lf.path}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-2">
                    <span className="font-mono text-xs font-extrabold text-amber-500">{lf.size}</span>
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
