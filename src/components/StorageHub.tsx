import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HardDrive, Trash2, Sparkles, Folder, FileCode, CheckCircle2, ArrowRight } from 'lucide-react';
import type { SystemInfo, RunMode } from '../types';
import { usePlatform } from '../platform';
import StorageAnalyzer from './StorageAnalyzer';

interface Props {
  systemInfo: SystemInfo;
  onClean: (mode: RunMode) => void;
}

type StorageTab = 'analyzer' | 'developer' | 'largeFiles';

export default function StorageHub({ systemInfo, onClean }: Props) {
  const { config, isMac } = usePlatform();
  const [subTab, setSubTab] = useState<StorageTab>('analyzer');
  const [devArtifacts, setDevArtifacts] = useState<any[]>([]);
  const [storageData, setStorageData] = useState<any>(null);

  useEffect(() => {
    fetch('http://127.0.0.1:3131/api/developer-cleanup')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setDevArtifacts(d.artifacts || []))
      .catch(() => {});

    fetch('http://127.0.0.1:3131/api/storage')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setStorageData(d))
      .catch(() => {});
  }, []);

  return (
    <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25">
              <HardDrive size={12} /> Storage &amp; Cleanup Center
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

        <button onClick={() => onClean('CleanupOnly')} className="btn btn-primary text-xs">
          <Trash2 size={13} />
          <span>Launch Cleanup Profile</span>
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl border overflow-x-auto" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
        {[
          { id: 'analyzer' as const, label: 'Storage Intelligence', icon: HardDrive },
          { id: 'developer' as const, label: isMac ? 'Developer Cleanup (Xcode/Pods)' : 'Developer Caches (VS/NPM)', icon: FileCode },
          { id: 'largeFiles' as const, label: 'Largest Files & Candidates', icon: Folder },
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
            <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>Developer Cache Footprint</h3>
            <div className="space-y-3">
              {devArtifacts.map((art) => (
                <div key={art.id} className="p-4 rounded-2xl border flex items-center justify-between gap-3" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                  <div className="flex items-center gap-3">
                    <FileCode size={18} className="text-blue-500 shrink-0" />
                    <div>
                      <p className="text-xs font-bold" style={{ color: 'var(--color-ink)' }}>{art.name}</p>
                      <p className="text-[11px] font-mono opacity-70" style={{ color: 'var(--color-ink-4)' }}>{art.path}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-xs font-extrabold text-blue-500">{(art.sizeMB / 1024).toFixed(1)} GB</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {subTab === 'largeFiles' && (
          <motion.div key="largeFiles" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card p-6 space-y-4">
            <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>Top Storage Candidates</h3>
            <div className="space-y-3">
              {(storageData?.largeFiles || []).map((lf: any, idx: number) => (
                <div key={idx} className="p-3.5 rounded-2xl border flex items-center justify-between gap-3" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                  <div>
                    <p className="text-xs font-bold" style={{ color: 'var(--color-ink)' }}>{lf.name}</p>
                    <p className="text-[11px] font-mono opacity-70" style={{ color: 'var(--color-ink-4)' }}>{lf.path}</p>
                  </div>
                  <span className="font-mono text-xs font-extrabold text-amber-500">{lf.size}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
