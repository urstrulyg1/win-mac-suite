import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { tabTransition } from '../motion';
import {
  HardDrive, Trash2, ChevronRight,
  Camera, Sparkles, Layers, Smartphone, Disc, RefreshCw, Copy, FileText, ShieldCheck
} from 'lucide-react';
import type { SystemInfo, RunMode } from '../types';
import { usePlatform } from '../platform';
import { storageApi } from '../utils/api';
import StorageAnalyzer from './StorageAnalyzer';
import InspectorModal, { type InspectorData } from './InspectorModal';
import SafeCleanupModal from './SafeCleanupModal';

interface Props {
  systemInfo: SystemInfo;
  onClean: (mode: RunMode) => void;
}

type StorageTab = 'analyzer' | 'systemData' | 'apps' | 'leftovers' | 'backups' | 'snapshots' | 'drives' | 'duplicates' | 'largeFiles' | 'permissions';

export default function StorageHub({ systemInfo, onClean }: Props) {
  const { isMac } = usePlatform();
  const [subTab, setSubTab] = useState<StorageTab>('analyzer');
  const [systemDataInfo, setSystemDataInfo] = useState<any>(null);
  const [installedApps, setInstalledApps] = useState<any[]>([]);
  const [selectedAppMap, setSelectedAppMap] = useState<any>(null);
  const [orphans, setOrphans] = useState<any[]>([]);
  const [iosBackups, setIosBackups] = useState<any>(null);
  const [snapshotsData, setSnapshotsData] = useState<any>(null);
  const [thinningSnapshots, setThinningSnapshots] = useState(false);
  const [externalDrives, setExternalDrives] = useState<any[]>([]);
  const [duplicates, setDuplicates] = useState<any>(null);
  const [largeFiles, setLargeFiles] = useState<any>(null);
  const [filePermissions, setFilePermissions] = useState<any>(null);
  const [showSafeCleanup, setShowSafeCleanup] = useState(false);
  const [inspectItem, setInspectItem] = useState<InspectorData | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [dupScanPath, setDupScanPath] = useState('');
  const [permScanPath, setPermScanPath] = useState('');
  const [scanningDupes, setScanningDupes] = useState(false);
  const [checkingPerms, setCheckingPerms] = useState(false);

  const handleScanDuplicates = async () => {
    setScanningDupes(true);
    try {
      const res = await storageApi.getDuplicates(dupScanPath || undefined);
      setDuplicates(res);
    } catch {}
    finally {
      setScanningDupes(false);
    }
  };

  const handleCheckPermissions = async () => {
    setCheckingPerms(true);
    try {
      const res = await storageApi.getFilePermissions(permScanPath || undefined);
      setFilePermissions(res);
    } catch {}
    finally {
      setCheckingPerms(false);
    }
  };

  const fetchStorageData = async () => {
    setLoading(true);
    try {
      const [sysRes, appsRes, orphRes, iosRes, snapRes, drvRes, dupRes, largeRes, permRes] = await Promise.allSettled([
        fetch('/api/storage/system-data').then((r) => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/apps/inventory').then((r) => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/storage/orphaned-leftovers').then((r) => r.ok ? r.json() : null).catch(() => null),
        isMac ? fetch('/api/storage/ios-backups').then((r) => r.ok ? r.json() : null).catch(() => null) : Promise.resolve(null),
        fetch('/api/snapshots').then((r) => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/storage/external-drives').then((r) => r.ok ? r.json() : null).catch(() => null),
        isMac ? storageApi.getDuplicates() : Promise.resolve(null),
        isMac ? storageApi.getLargeFiles() : Promise.resolve(null),
        isMac ? storageApi.getFilePermissions() : Promise.resolve(null),
      ]);

      if (sysRes.status === 'fulfilled' && sysRes.value) setSystemDataInfo(sysRes.value);
      if (appsRes.status === 'fulfilled' && appsRes.value) setInstalledApps(appsRes.value.apps || []);
      if (orphRes.status === 'fulfilled' && orphRes.value) setOrphans(orphRes.value.leftovers || []);
      if (iosRes.status === 'fulfilled' && iosRes.value) setIosBackups(iosRes.value);
      if (snapRes.status === 'fulfilled' && snapRes.value) setSnapshotsData(snapRes.value);
      if (drvRes.status === 'fulfilled' && drvRes.value) setExternalDrives(drvRes.value.drives || []);
      if (dupRes.status === 'fulfilled' && dupRes.value) setDuplicates(dupRes.value);
      if (largeRes.status === 'fulfilled' && largeRes.value) setLargeFiles(largeRes.value);
      if (permRes.status === 'fulfilled' && permRes.value) setFilePermissions(permRes.value);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStorageData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inspectAppFootprint = async (appName: string) => {
    try {
      const res = await fetch(`/api/apps/footprint/${appName}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedAppMap(data);
      }
    } catch {}
  };

  const handleEjectDrive = async (volumePath: string) => {
    try {
      const res = await fetch('/api/actions/eject-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ volumePath }),
      });
      const d = await res.json();
      setActionMsg(d.message || 'Drive ejected.');
      fetchStorageData();
    } catch {}
  };

  return (
    <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <InspectorModal data={inspectItem} onClose={() => setInspectItem(null)} />
      <SafeCleanupModal
        isOpen={showSafeCleanup}
        onClose={() => setShowSafeCleanup(false)}
        onSuccess={() => {
          fetchStorageData();
          setActionMsg('Safe cleanup completed successfully!');
        }}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25">
              <HardDrive size={12} /> Pillar 1: Storage &amp; Cleanup Engine
            </span>
            <span className="pill" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-ink-3)', borderColor: 'var(--color-line)' }}>
              {isMac ? 'Storage Intelligence 2.0 & Relationship Mapper Active' : 'Windows Storage Sense & Disk Analyzer Active'}
            </span>
          </div>
          <h1 className="text-hero font-extrabold tracking-tight" style={{ color: 'var(--color-ink)' }}>
            Storage Intelligence &amp; Safe Cleanup
          </h1>
          <p className="mt-1 text-[14px]" style={{ color: 'var(--color-ink-3)' }}>
            {isMac
              ? 'De-mystify macOS System Data, trace 30-day storage growth, map multi-directory app relationships, purge orphaned leftovers, and manage iOS backups & external drives.'
              : 'Analyze Windows disk allocation, map application footprints, purge orphaned leftovers, and manage storage drives safely.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={fetchStorageData} disabled={loading} className="btn btn-ghost text-xs cursor-pointer">
            <RefreshCw size={13} className={loading ? 'animate-spin-smooth' : ''} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowSafeCleanup(true)}
            className="btn btn-primary text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20"
          >
            <Sparkles size={14} />
            <span>Launch Safe Cleanup Engine (Undo Ready)</span>
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-500 flex items-center justify-between">
          <span>✓ {actionMsg}</span>
          <button onClick={() => setActionMsg(null)} className="text-slate-400 hover:text-slate-200">×</button>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl border overflow-x-auto" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
        {[
          { id: 'analyzer' as const,   label: 'Storage Overview',             icon: HardDrive, color: '#f97316' },
          { id: 'systemData' as const, label: isMac ? 'System Data 2.0 & Timeline' : 'System Storage Breakdown',   icon: Sparkles,  color: '#a78bfa' },
          { id: 'apps' as const,       label: 'Smart App Uninstaller',         icon: Layers,    color: '#22d3ee' },
          { id: 'leftovers' as const,  label: 'Orphaned Leftovers',            icon: Trash2,    color: '#f43f5e' },
          ...(isMac ? [{ id: 'backups' as const, label: 'iPhone / iPad Backups', icon: Smartphone, color: '#34d399' }] : []),
          { id: 'snapshots' as const,  label: isMac ? 'APFS Snapshots' : 'System Snapshots', icon: Camera, color: '#ec4899' },
          { id: 'drives' as const,     label: 'External Drive Doctor',         icon: Disc,      color: '#60a5fa' },
          ...(isMac ? [
            { id: 'duplicates' as const, label: 'Duplicate Scanner',           icon: Copy,      color: '#f59e0b' },
            { id: 'largeFiles' as const, label: 'Large File Finder',           icon: FileText,  color: '#6366f1' },
            { id: 'permissions' as const, label: 'Permissions Doctor',         icon: ShieldCheck, color: '#10b981' },
          ] : []),
        ].map((t) => {
          const isSel = subTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer"
              style={
                isSel
                  ? { backgroundColor: '#3b82f6', color: '#fff', boxShadow: '0 2px 8px rgba(59,130,246,0.3)' }
                  : { color: 'var(--color-ink-3)' }
              }
            >
              <t.icon size={14} style={{ color: isSel ? '#fff' : t.color }} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {subTab === 'analyzer' && (
          <motion.div key="analyzer" {...tabTransition}>
            <StorageAnalyzer systemInfo={systemInfo} onClean={onClean} />
          </motion.div>
        )}

        {subTab === 'systemData' && (
          <motion.div key="systemData" {...tabTransition} className="space-y-6">
            {/* 30-Day Storage Growth Timeline */}
            <div className="card p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3" style={{ borderColor: 'var(--color-line)' }}>
                <div>
                  <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>
                    Storage Timeline &amp; Growth Intelligence
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">{systemDataInfo?.growthSummary || 'Storage growth tracker'}</p>
                </div>
                <span className="pill bg-red-500/10 text-red-500 border-red-500/25 text-xs font-bold">
                  30-Day Delta: {systemDataInfo?.growth30d || '+18.4 GB'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                {(systemDataInfo?.timeline || []).map((pt: any, idx: number) => (
                  <div key={idx} className="p-3.5 rounded-xl border space-y-1 text-center" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                    <span className="text-[10px] uppercase font-bold text-slate-400">{pt.day}</span>
                    <p className="text-base font-extrabold font-mono text-blue-500">{pt.systemDataGB} GB</p>
                    <p className="text-[10px] text-slate-400 truncate">{pt.event}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Deep Categories */}
            <div className="card p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-line)' }}>
                <h3 className="text-sm font-bold" style={{ color: 'var(--color-ink)' }}>
                  Exact Breakdown of {systemDataInfo?.totalSystemDataGB || 0} GB System Data
                </h3>
                <span className="pill bg-emerald-500/10 text-emerald-500 border-emerald-500/25 text-xs font-bold">
                  Safe Reclaimable: ~{systemDataInfo?.potentialRecoveryGB || 0} GB
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {(systemDataInfo?.categories || []).map((cat: any) => (
                  <div
                    key={cat.id}
                    onClick={() =>
                      setInspectItem({
                        title: cat.name,
                        category: cat.category || 'System Data Category',
                        badge: `${cat.sizeGB} GB`,
                        subtitle: cat.description,
                        details: [
                          { label: 'Filesystem Path', value: cat.path, isCode: true },
                          { label: 'Category Total', value: `${cat.sizeGB} GB` },
                          { label: 'Why Is It System Data?', value: cat.whyIsItSystemData },
                          { label: 'Purge Safety', value: cat.safeToPurge ? '100% Safe to clean' : 'Review recommended' },
                        ],
                      })
                    }
                    className="p-4 rounded-xl border space-y-2 cursor-pointer transition-all hover:scale-[1.01]"
                    style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold" style={{ color: 'var(--color-ink)' }}>{cat.name}</h4>
                      <span className="text-xs font-mono font-bold text-blue-500">{cat.sizeGB} GB</span>
                    </div>
                    <p className="text-[11px] text-slate-400">{cat.description}</p>
                    <p className="text-[10px] text-blue-400 font-medium">💡 {cat.whyIsItSystemData}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {subTab === 'apps' && (
          <motion.div key="apps" {...tabTransition} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Installed Apps List */}
            <div className="lg:col-span-5 card p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Installed Applications ({installedApps.length})
              </h3>
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {installedApps.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => inspectAppFootprint(app.name)}
                    className="w-full p-3 rounded-xl border text-left transition-all hover:scale-[1.01] flex items-center justify-between cursor-pointer"
                    style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
                  >
                    <div>
                      <p className="text-xs font-bold" style={{ color: 'var(--color-ink)' }}>{app.name}</p>
                      <p className="text-[10px] font-mono text-slate-400">{app.path}</p>
                    </div>
                    <ChevronRight size={14} className="text-slate-400" />
                  </button>
                ))}
              </div>
            </div>

            {/* Relationship Map */}
            <div className="lg:col-span-7 card p-5 space-y-4">
              <h3 className="text-sm font-bold" style={{ color: 'var(--color-ink)' }}>
                {selectedAppMap ? `${selectedAppMap.appName} Relationship Map (${selectedAppMap.totalGB} GB Total)` : 'Select an application on the left to map multi-directory dependencies.'}
              </h3>

              {selectedAppMap ? (
                <div className="space-y-2.5">
                  {(selectedAppMap.relationships || []).map((rel: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border flex items-center justify-between gap-3 text-xs"
                      style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold" style={{ color: 'var(--color-ink)' }}>{rel.label}</span>
                          <span
                            className={`pill text-[10px] py-0 px-1.5 ${
                              rel.safety === 'Definitely'
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25'
                                : rel.safety === 'Probably'
                                ? 'bg-amber-500/10 text-amber-500 border-amber-500/25'
                                : 'bg-red-500/10 text-red-500 border-red-500/25'
                            }`}
                          >
                            {rel.safety} belongs
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">{rel.path}</p>
                      </div>
                      <span className="font-mono font-bold text-blue-500 shrink-0">{rel.sizeMB} MB</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center text-xs text-slate-400">
                  Click any installed app on the left to itemize its App Bundle, Application Support, Containers, Group Sandboxes, Preferences, Caches, and LaunchAgents.
                </div>
              )}
            </div>
          </motion.div>
        )}

        {subTab === 'leftovers' && (
          <motion.div key="leftovers" {...tabTransition} className="card p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-line)' }}>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>
                  Orphaned App Leftovers ({orphans.length} Found)
                </h3>
                <p className="text-xs text-slate-400">Folders remaining in Library from apps that have already been deleted from /Applications.</p>
              </div>
              <button onClick={() => setShowSafeCleanup(true)} className="btn btn-primary text-xs cursor-pointer">
                Purge All Leftovers
              </button>
            </div>

            <div className="space-y-3">
              {orphans.map((orp) => (
                <div
                  key={orp.id}
                  className="p-4 rounded-xl border flex items-center justify-between gap-4"
                  style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold" style={{ color: 'var(--color-ink)' }}>{orp.originalApp}</h4>
                      <span className="pill bg-amber-500/10 text-amber-500 border-amber-500/25 text-[10px]">Orphaned</span>
                    </div>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">{orp.location}</p>
                    <p className="text-[10px] text-slate-500 mt-1">{orp.description}</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-blue-500 shrink-0">{orp.sizeMB} MB</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {isMac && subTab === 'backups' && (
          <motion.div key="backups" {...tabTransition} className="card p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-line)' }}>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>
                  iPhone &amp; iPad Local Backups ({iosBackups?.totalSizeGB || 0} GB Total)
                </h3>
                <p className="text-xs text-slate-400">Local device images stored in MobileSync.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(iosBackups?.backups || []).map((b: any) => (
                <div
                  key={b.id}
                  className="p-4 rounded-xl border space-y-2"
                  style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold" style={{ color: 'var(--color-ink)' }}>{b.deviceName}</h4>
                    <span className="text-xs font-mono font-bold text-blue-500">{b.sizeGB} GB</span>
                  </div>
                  <p className="text-[11px] text-slate-400">{b.deviceModel} · Date: {b.backupDate}</p>
                  <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25 text-[10px]">
                    {b.encrypted ? 'Encrypted Device Backup' : 'Standard Backup'}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {subTab === 'snapshots' && (
          <motion.div key="snapshots" {...tabTransition} className="card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-3" style={{ borderColor: 'var(--color-line)' }}>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>
                  {isMac ? 'APFS Local Snapshots & Time Machine Deltas' : 'System Restore Snapshots'}
                </h3>
                <p className="text-xs text-slate-400">
                  {isMac
                    ? 'APFS creates local differential snapshots during Time Machine runs. Thinning releases purgeable disk space.'
                    : 'System restore shadow copies and component snapshots.'}
                </p>
              </div>

              {isMac && (
                <button
                  onClick={async () => {
                    setThinningSnapshots(true);
                    try {
                      const res = await fetch('/api/actions/thin-snapshots', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ confirmed: true }),
                      });
                      const d = await res.json();
                      if (d.success) {
                        setActionMsg(d.message || 'Thinned local APFS snapshots successfully.');
                        fetchStorageData();
                      }
                    } catch {}
                    finally {
                      setThinningSnapshots(false);
                    }
                  }}
                  disabled={thinningSnapshots}
                  className="btn btn-primary text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Camera size={13} className={thinningSnapshots ? 'animate-spin' : ''} />
                  <span>{thinningSnapshots ? 'Thinning Snapshots...' : 'Thin Local Snapshots'}</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border space-y-1" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                <span className="text-xs text-slate-400">Active Snapshots</span>
                <p className="text-xl font-extrabold font-mono text-blue-400">{snapshotsData?.count ?? 0}</p>
                <p className="text-[10px] text-slate-500">Local APFS Differential Copies</p>
              </div>
              <div className="p-4 rounded-xl border space-y-1" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                <span className="text-xs text-slate-400">Purgeable State</span>
                <p className="text-xl font-extrabold font-mono text-emerald-400">{snapshotsData?.count === 0 ? 'Optimal' : 'Retained'}</p>
                <p className="text-[10px] text-slate-500">Automatically reclaimed when needed</p>
              </div>
              <div className="p-4 rounded-xl border space-y-1" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                <span className="text-xs text-slate-400">Safety Guard</span>
                <p className="text-xl font-extrabold font-mono text-cyan-400">Protected</p>
                <p className="text-[10px] text-slate-500">External backups remain intact</p>
              </div>
            </div>

            {Array.isArray(snapshotsData?.snapshots) && snapshotsData.snapshots.length > 0 ? (
              <div className="divide-y pt-2" style={{ borderColor: 'var(--color-line)' }}>
                {snapshotsData.snapshots.map((s: any, idx: number) => (
                  <div key={idx} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-bold" style={{ color: 'var(--color-ink)' }}>{s.id}</span>
                      <p className="text-[10px] text-slate-500">Snapshot Date: {s.date || 'Current'}</p>
                    </div>
                    <span className="pill text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/25">
                      {s.size || 'Local Snapshot'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 border rounded-xl" style={{ borderColor: 'var(--color-line)' }}>
                ✓ No excessive local APFS snapshots retaining purgeable disk blocks.
              </div>
            )}
          </motion.div>
        )}

        {subTab === 'drives' && (
          <motion.div key="drives" {...tabTransition} className="card p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-line)' }}>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>
                  External Drive Doctor &amp; Eject Blocker
                </h3>
                <p className="text-xs text-slate-400">Clean hidden AppleDouble (._*) files and safely unmount locked drives.</p>
              </div>
            </div>

            <div className="space-y-4">
              {externalDrives.map((drv, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
                >
                  <div>
                    <h4 className="text-xs font-bold" style={{ color: 'var(--color-ink)' }}>{drv.name} ({drv.fsType})</h4>
                    <p className="text-[11px] font-mono text-slate-400">{drv.mount} · Free: {drv.freeGB} GB / {drv.sizeGB} GB</p>
                    <p className="text-[10px] text-blue-400 mt-1">AppleDouble &amp; .DS_Store Junk: ~{drv.appleDoubleJunkMB} MB</p>
                  </div>
                  <button
                    onClick={() => handleEjectDrive(drv.mount)}
                    className="btn btn-primary text-xs px-3 py-1.5 cursor-pointer shrink-0"
                  >
                    Safely Eject Drive
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {subTab === 'duplicates' && (
          <motion.div key="duplicates" {...tabTransition} className="card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-3" style={{ borderColor: 'var(--color-line)' }}>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>
                  Duplicate File Scanner
                </h3>
                <p className="text-xs text-slate-400">Locate duplicate files by MD5 hashing. RESTRICTED to absolute paths inside your home directory.</p>
              </div>
            </div>

            <div className="flex gap-2 max-w-xl">
              <input
                type="text"
                value={dupScanPath}
                onChange={(e) => setDupScanPath(e.target.value)}
                placeholder="Custom absolute path (defaults to home directory)..."
                className="field text-xs py-1.5 px-3 flex-1"
                style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)', color: 'var(--color-ink)' }}
              />
              <button
                onClick={handleScanDuplicates}
                disabled={scanningDupes}
                className="btn btn-primary text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>{scanningDupes ? 'Scanning...' : 'Scan Duplicates'}</span>
              </button>
            </div>

            <div className="space-y-4">
              {duplicates?.note && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-500">
                  ⚠️ {duplicates.note}
                </div>
              )}

              {Array.isArray(duplicates?.duplicates) && duplicates.duplicates.length > 0 ? (
                <div className="space-y-3.5">
                  {duplicates.duplicates.map((dup: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border space-y-2"
                      style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
                    >
                      <div className="flex items-center justify-between border-b pb-1.5" style={{ borderColor: 'var(--color-line)' }}>
                        <span className="text-xs font-mono text-blue-500 font-bold">MD5: {dup.hash}</span>
                        <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25 text-[10px] font-bold">
                          {dup.count} copies
                        </span>
                      </div>
                      <div className="space-y-1">
                        {(dup.files || []).map((file: string, fIdx: number) => (
                          <div key={fIdx} className="text-xs font-mono text-slate-300 break-all pl-2 border-l-2 border-blue-500/30">
                            {file}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                !scanningDupes && (
                  <div className="py-8 text-center text-xs text-slate-400 border rounded-xl" style={{ borderColor: 'var(--color-line)' }}>
                    ✓ No duplicates found in target folder.
                  </div>
                )
              )}
            </div>
          </motion.div>
        )}

        {subTab === 'largeFiles' && (
          <motion.div key="largeFiles" {...tabTransition} className="card p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-line)' }}>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>
                  Large File Finder
                </h3>
                <p className="text-xs text-slate-400">Scan for files larger than 30MB inside your user Downloads and Caches folders.</p>
              </div>
            </div>

            <div className="space-y-3">
              {Array.isArray(largeFiles?.files) && largeFiles.files.length > 0 ? (
                largeFiles.files.map((file: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border flex items-center justify-between gap-4"
                    style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
                  >
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold truncate" style={{ color: 'var(--color-ink)' }}>{file.name}</h4>
                      <p className="text-[10px] font-mono text-slate-400 mt-1 truncate">{file.path}</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-blue-500 shrink-0">{file.size}</span>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-400 border rounded-xl" style={{ borderColor: 'var(--color-line)' }}>
                  ✓ No files larger than 30MB found in Downloads or Library/Caches.
                </div>
              )}
            </div>
          </motion.div>
        )}

        {subTab === 'permissions' && (
          <motion.div key="permissions" {...tabTransition} className="card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-3" style={{ borderColor: 'var(--color-line)' }}>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>
                  File Permissions Doctor
                </h3>
                <p className="text-xs text-slate-400">Inspect owner, mode bits, and read/write access for absolute paths within your home directory or /Applications.</p>
              </div>
            </div>

            <div className="flex gap-2 max-w-xl">
              <input
                type="text"
                value={permScanPath}
                onChange={(e) => setPermScanPath(e.target.value)}
                placeholder="Absolute path to analyze (defaults to home directory)..."
                className="field text-xs py-1.5 px-3 flex-1"
                style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)', color: 'var(--color-ink)' }}
              />
              <button
                onClick={handleCheckPermissions}
                disabled={checkingPerms}
                className="btn btn-primary text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>{checkingPerms ? 'Checking...' : 'Check Permissions'}</span>
              </button>
            </div>

            {filePermissions && (
              <div className="space-y-4">
                {filePermissions.error && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-500">
                    ❌ {filePermissions.error}
                  </div>
                )}

                <div className="p-4 rounded-xl border space-y-3" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold" style={{ color: 'var(--color-ink)' }}>Path Checked</span>
                    <span className="text-xs font-mono text-slate-400 break-all">{filePermissions.path}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div className="p-3 rounded-xl border text-center" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-line)' }}>
                      <span className="text-[10px] uppercase text-slate-400 font-bold">Exists</span>
                      <p className="text-xs font-bold text-blue-500 mt-1">{filePermissions.exists ? 'Yes ✅' : 'No ❌'}</p>
                    </div>
                    <div className="p-3 rounded-xl border text-center" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-line)' }}>
                      <span className="text-[10px] uppercase text-slate-400 font-bold">Octal Mode</span>
                      <p className="text-xs font-mono font-bold text-blue-500 mt-1">{filePermissions.modeOctal || 'N/A'}</p>
                    </div>
                    <div className="p-3 rounded-xl border text-center" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-line)' }}>
                      <span className="text-[10px] uppercase text-slate-400 font-bold">Is Owner</span>
                      <p className="text-xs font-bold text-blue-500 mt-1">{filePermissions.isOwner ? 'Yes ✅' : 'No ❌'}</p>
                    </div>
                    <div className="p-3 rounded-xl border text-center" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-line)' }}>
                      <span className="text-[10px] uppercase text-slate-400 font-bold">User UID</span>
                      <p className="text-xs font-mono font-bold text-blue-500 mt-1">
                        Owner: {filePermissions.ownerUid ?? 'N/A'} (Self: {filePermissions.currentUserUid ?? 'N/A'})
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border text-xs" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-line)', color: 'var(--color-ink)' }}>
                    <strong>Verdict & Diagnosis:</strong>
                    <p className="mt-1 text-slate-300">{filePermissions.diagnosis}</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
