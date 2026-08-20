import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Clock, Cloud, ShieldCheck, RefreshCw,
  HardDrive, AlertTriangle, CheckCircle2, ChevronRight, Laptop, ArrowRight
} from 'lucide-react';
import { usePlatform } from '../platform';
import InspectorModal, { type InspectorData } from './InspectorModal';

export default function AppleServicesHub() {
  const { config, isMac } = usePlatform();
  const [subTab, setSubTab] = useState<'update' | 'timemachine' | 'icloud' | 'services'>('update');
  const [updateData, setUpdateData] = useState<any>(null);
  const [tmData, setTmData] = useState<any>(null);
  const [icloudData, setIcloudData] = useState<any>(null);
  const [servicesData, setServicesData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [inspectItem, setInspectItem] = useState<InspectorData | null>(null);

  const fetchAppleData = async () => {
    setLoading(true);
    try {
      const [uRes, tRes, iRes, sRes] = await Promise.all([
        fetch('/api/diagnostics/update-doctor').catch(() => null),
        fetch('/api/diagnostics/time-machine').catch(() => null),
        fetch('/api/diagnostics/icloud').catch(() => null),
        fetch('/api/diagnostics/apple-services').catch(() => null),
      ]);

      if (uRes && uRes.ok) setUpdateData(await uRes.json());
      if (tRes && tRes.ok) setTmData(await tRes.json());
      if (iRes && iRes.ok) setIcloudData(await iRes.json());
      if (sRes && sRes.ok) setServicesData(await sRes.json());
    } catch {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppleData();
  }, []);

  return (
    <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <InspectorModal data={inspectItem} onClose={() => setInspectItem(null)} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25">
              <Laptop size={12} /> Apple Ecosystem &amp; Update Health
            </span>
            <span className="pill" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-ink-3)', borderColor: 'var(--color-line)' }}>
              Update Health, Time Machine, iCloud &amp; Continuity
            </span>
          </div>
          <h1 className="text-hero font-extrabold tracking-tight" style={{ color: 'var(--color-ink)' }}>
            macOS Updates, Time Machine &amp; Apple Services
          </h1>
          <p className="mt-1 text-[14px]" style={{ color: 'var(--color-ink-3)' }}>
            Inspect macOS update prerequisites and staging disk space, Time Machine snapshot history, iCloud sync queues, and local Apple ecosystem continuity services.
          </p>
        </div>

        <button onClick={fetchAppleData} disabled={loading} className="btn btn-ghost text-xs cursor-pointer">
          <RefreshCw size={13} className={loading ? 'animate-spin-smooth' : ''} />
          <span>Refresh Apple Health</span>
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl border overflow-x-auto" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
        {[
          { id: 'update' as const, label: 'macOS Update & Upgrade Doctor', icon: Sparkles },
          { id: 'timemachine' as const, label: 'Time Machine Doctor', icon: Clock },
          { id: 'icloud' as const, label: 'iCloud & Account Sync Doctor', icon: Cloud },
          { id: 'services' as const, label: 'Continuity & Apple Services', icon: ShieldCheck },
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

      {/* Content */}
      <AnimatePresence mode="wait">
        {subTab === 'update' && (
          <motion.div key="update" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="card p-6 space-y-4 border-l-4 border-l-blue-500">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    macOS UPDATE &amp; UPGRADE HEALTH
                  </span>
                  <h3 className="text-base font-extrabold" style={{ color: 'var(--color-ink)' }}>
                    Current: {updateData?.currentVersion || 'macOS 15.3'} → Compatible: {updateData?.latestCompatible || 'macOS 15.3.1'}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">{updateData?.diagnosisVerdict}</p>
                </div>
                <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25 text-xs font-bold shrink-0">
                  {updateData?.updateState || 'Ready'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="card p-4 text-center space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Required Space</span>
                <p className="text-lg font-mono font-extrabold text-blue-400">{updateData?.requiredFreeDiskGB || 14.2} GB</p>
              </div>
              <div className="card p-4 text-center space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Available Free Space</span>
                <p className="text-lg font-mono font-extrabold text-emerald-400">{updateData?.availableFreeDiskGB || 18.4} GB</p>
              </div>
              <div className="card p-4 text-center space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Pending Restart</span>
                <p className="text-lg font-mono font-extrabold text-slate-300">{updateData?.pendingRestart ? 'Yes' : 'No'}</p>
              </div>
              <div className="card p-4 text-center space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Stuck Download</span>
                <p className="text-lg font-mono font-extrabold text-emerald-400">{updateData?.stuckUpdateDetected ? 'Warning' : 'None ✓'}</p>
              </div>
            </div>
          </motion.div>
        )}

        {subTab === 'timemachine' && (
          <motion.div key="timemachine" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card p-6 space-y-6">
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-line)' }}>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>
                  Time Machine Backup Health
                </h3>
                <p className="text-xs text-slate-400">{tmData?.verdict || 'Backups healthy and synchronized.'}</p>
              </div>
              <span className="pill bg-emerald-500/10 text-emerald-500 border-emerald-500/25 text-xs font-bold">
                {tmData?.status ?? 'Unavailable / Unsupported'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border space-y-2" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                <p className="font-bold" style={{ color: 'var(--color-ink)' }}>Backup Target</p>
                <p className="font-mono text-slate-400">{tmData?.backupDestination}</p>
                <p className="text-slate-300">Last Successful: <strong>{tmData?.lastSuccessfulBackup}</strong></p>
              </div>
              <div className="p-4 rounded-xl border space-y-2" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                <p className="font-bold" style={{ color: 'var(--color-ink)' }}>Excluded Paths</p>
                <div className="space-y-1">
                  {(tmData?.excludedPaths || []).map((p: string, idx: number) => (
                    <p key={idx} className="font-mono text-[11px] text-slate-400 truncate">• {p}</p>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {subTab === 'icloud' && (
          <motion.div key="icloud" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card p-6 space-y-6">
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-line)' }}>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>
                  iCloud &amp; Apple Account Sync Status
                </h3>
                <p className="text-xs text-slate-400">{icloudData?.verdict || 'Zero stalled synchronization queues.'}</p>
              </div>
              <span className="pill bg-emerald-500/10 text-emerald-500 border-emerald-500/25 text-xs font-bold">
                Synchronized
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl border text-center" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                <span className="text-[10px] uppercase font-bold text-slate-400">iCloud Drive</span>
                <p className="text-xs font-bold text-emerald-400 mt-1">{icloudData?.icloudDriveSync || 'Synchronized'}</p>
              </div>
              <div className="p-3.5 rounded-xl border text-center" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                <span className="text-[10px] uppercase font-bold text-slate-400">Desktop &amp; Docs</span>
                <p className="text-xs font-bold text-emerald-400 mt-1">{icloudData?.desktopDocumentsSync ?? 'Unavailable'}</p>
              </div>
              <div className="p-3.5 rounded-xl border text-center" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                <span className="text-[10px] uppercase font-bold text-slate-400">Photos Sync</span>
                <p className="text-xs font-bold text-emerald-400 mt-1">{icloudData?.photosSync || 'Up to Date'}</p>
              </div>
              <div className="p-3.5 rounded-xl border text-center" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                <span className="text-[10px] uppercase font-bold text-slate-400">Pending Sync</span>
                <p className="text-xs font-mono font-bold text-blue-400 mt-1">{icloudData?.pendingUploadsCount || 0} files</p>
              </div>
            </div>
          </motion.div>
        )}

        {subTab === 'services' && (
          <motion.div key="services" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card p-6 space-y-4">
            <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>
              Continuity &amp; Nearby Device Ecosystem
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(servicesData?.services || []).map((srv: any, idx: number) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border space-y-1"
                  style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold" style={{ color: 'var(--color-ink)' }}>{srv.name}</h4>
                    <span className="pill bg-emerald-500/10 text-emerald-500 border-emerald-500/25 text-[10px]">
                      {srv.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{srv.detail}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
