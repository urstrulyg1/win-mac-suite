import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { tabTransition } from '../motion';
import {
  Sparkles, Clock, Cloud, ShieldCheck, RefreshCw,
  Laptop
} from 'lucide-react';
import InspectorModal, { type InspectorData } from './InspectorModal';

export default function AppleServicesHub() {
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
          { id: 'update' as const, label: 'macOS Update & Upgrade Doctor', icon: Sparkles,  color: '#a78bfa' },
          { id: 'timemachine' as const, label: 'Time Machine Doctor',       icon: Clock,     color: '#60a5fa' },
          { id: 'icloud' as const, label: 'iCloud & Account Sync Doctor',   icon: Cloud,     color: '#22d3ee' },
          { id: 'services' as const, label: 'Continuity & Apple Services',  icon: ShieldCheck, color: '#34d399' },
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
        {subTab === 'update' && (
          <motion.div key="update" {...tabTransition} className="space-y-6">
            <div
              onClick={() =>
                setInspectItem({
                  title: 'macOS Software Update Health',
                  category: 'System Software Integrity',
                  badge: updateData?.updateState ?? 'UNAVAILABLE',
                  subtitle: updateData?.diagnosisVerdict ?? 'UNAVAILABLE: update probe has not returned data.',
                  dataSource: updateData?.dataSource ?? 'UNAVAILABLE',
                  freshness: 'Recently Updated',
                  evidenceQuality: updateData?.evidenceQuality ?? 'Unavailable',
                  explanation: 'Evaluates compatibility, pending security updates, and required APFS storage headroom for staging.',
                  statusReason: updateData?.diagnosisVerdict,
                  details: [
                    { label: 'Installed Version', value: updateData?.currentVersion ?? 'UNAVAILABLE' },
                    { label: 'Latest Compatible / Target', value: updateData?.latestCompatible ?? 'UNAVAILABLE' },
                    { label: 'Update Available', value: updateData?.hasUpdateAvailable ? 'Yes' : 'No' },
                    { label: 'Required Staging Disk', value: updateData?.requiredFreeDiskGB != null ? `${updateData.requiredFreeDiskGB} GB` : 'UNAVAILABLE' },
                    { label: 'Available Free Disk', value: updateData?.availableFreeDiskGB != null ? `${updateData.availableFreeDiskGB} GB` : 'UNAVAILABLE' },
                    { label: 'Staging Headroom', value: updateData?.hasSufficientSpace ? 'Sufficient ✓' : 'Constrained' },
                  ],
                  command: '/usr/sbin/softwareupdate -l',
                  output: updateData?.updateOutput,
                  rawTelemetry: updateData,
                })
              }
              className="card card-hover p-6 space-y-4 border-l-4 border-l-blue-500 cursor-pointer transition-all hover:scale-[1.005]"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    macOS UPDATE &amp; UPGRADE HEALTH (Click to inspect)
                  </span>
                  <h3 className="text-base font-extrabold" style={{ color: 'var(--color-ink)' }}>
                    Current: {updateData?.currentVersion ?? 'UNAVAILABLE'} →{' '}
                    {updateData?.hasUpdateAvailable
                      ? `Target: ${updateData.latestCompatible}`
                      : 'No updates available ✓'}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">{updateData?.diagnosisVerdict ?? 'UNAVAILABLE: update probe has not returned data.'}</p>
                </div>
                <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25 text-xs font-bold shrink-0">
                  {updateData?.updateState ?? 'UNAVAILABLE'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div
                onClick={() =>
                  setInspectItem({
                    title: 'Required Update Staging Space',
                    category: 'Storage Capacity',
                    badge: updateData?.requiredFreeDiskGB != null ? `${updateData.requiredFreeDiskGB} GB` : 'UNAVAILABLE',
                    subtitle: 'Minimum free storage required for macOS installer package expansion and APFS snapshot delta.',
                    dataSource: 'Apple Software Update Requirements Matrix',
                    evidenceQuality: 'Observed',
                    details: [
                      { label: 'Required Disk Space', value: updateData?.requiredFreeDiskGB != null ? `${updateData.requiredFreeDiskGB} GB` : 'UNAVAILABLE' },
                      { label: 'Available Free Space', value: updateData?.availableFreeDiskGB != null ? `${updateData.availableFreeDiskGB} GB` : 'UNAVAILABLE' },
                    ],
                  })
                }
                className="card card-hover p-4 text-center space-y-1 cursor-pointer"
              >
                <span className="text-[10px] uppercase font-bold text-slate-400">Required Space</span>
                <p className="text-lg font-mono font-extrabold text-blue-400">{updateData?.requiredFreeDiskGB != null ? `${updateData.requiredFreeDiskGB} GB` : 'UNAVAILABLE'}</p>
              </div>

              <div
                onClick={() =>
                  setInspectItem({
                    title: 'Available Free Disk Space',
                    category: 'Storage Capacity',
                    badge: updateData?.availableFreeDiskGB != null ? `${updateData.availableFreeDiskGB} GB` : 'UNAVAILABLE',
                    subtitle: 'Current unallocated APFS volume storage capacity on the system data container.',
                    dataSource: 'systeminformation.fsSize()',
                    evidenceQuality: 'Observed',
                    details: [
                      { label: 'Available Free Space', value: updateData?.availableFreeDiskGB != null ? `${updateData.availableFreeDiskGB} GB` : 'UNAVAILABLE' },
                      { label: 'Staging Status', value: updateData?.hasSufficientSpace ? 'Sufficient' : 'Low Disk Space' },
                    ],
                  })
                }
                className="card card-hover p-4 text-center space-y-1 cursor-pointer"
              >
                <span className="text-[10px] uppercase font-bold text-slate-400">Available Free Space</span>
                <p className="text-lg font-mono font-extrabold text-emerald-400">{updateData?.availableFreeDiskGB != null ? `${updateData.availableFreeDiskGB} GB` : 'UNAVAILABLE'}</p>
              </div>

              <div
                onClick={() =>
                  setInspectItem({
                    title: 'Pending System Restart',
                    category: 'Kernel Staging',
                    badge: updateData?.pendingRestart === true ? 'Restart Pending' : updateData?.pendingRestart === false ? 'None' : 'UNAVAILABLE',
                    subtitle: 'Detects if a previously staged update payload requires a system reboot to apply.',
                    dataSource: '/var/db/.AppleSetupDone + macOS update state',
                    evidenceQuality: 'Observed',
                    details: [
                      { label: 'Reboot Required', value: updateData?.pendingRestart === true ? 'Yes' : updateData?.pendingRestart === false ? 'No' : 'UNAVAILABLE' },
                    ],
                  })
                }
                className="card card-hover p-4 text-center space-y-1 cursor-pointer"
              >
                <span className="text-[10px] uppercase font-bold text-slate-400">Pending Restart</span>
                <p className="text-lg font-mono font-extrabold text-slate-300">{updateData?.pendingRestart === true ? 'Yes' : updateData?.pendingRestart === false ? 'No' : 'UNAVAILABLE'}</p>
              </div>

              <div
                onClick={() =>
                  setInspectItem({
                    title: 'Stuck Download Detector',
                    category: 'Daemon Health',
                    badge: updateData?.stuckUpdateDetected === true ? 'Warning' : updateData?.stuckUpdateDetected === false ? 'Healthy' : 'UNAVAILABLE',
                    subtitle: 'Verifies whether Software Update transfer daemons are stalled or hung.',
                    dataSource: 'softwareupdate daemon IPC',
                    evidenceQuality: 'Observed',
                    details: [
                      { label: 'Stuck Download State', value: updateData?.stuckUpdateDetected === true ? 'Warning Detected' : updateData?.stuckUpdateDetected === false ? 'Clean / None' : 'UNAVAILABLE' },
                    ],
                  })
                }
                className="card card-hover p-4 text-center space-y-1 cursor-pointer"
              >
                <span className="text-[10px] uppercase font-bold text-slate-400">Stuck Download</span>
                <p className="text-lg font-mono font-extrabold text-emerald-400">{updateData?.stuckUpdateDetected === true ? 'Warning' : updateData?.stuckUpdateDetected === false ? 'None' : 'UNAVAILABLE'}</p>
              </div>
            </div>
          </motion.div>
        )}

        {subTab === 'timemachine' && (
          <motion.div key="timemachine" {...tabTransition} className="card p-6 space-y-6">
            <div
              onClick={() =>
                setInspectItem({
                  title: 'Time Machine Backup Doctor',
                  category: 'Disaster Recovery',
                  badge: tmData?.status ?? 'UNAVAILABLE',
                  subtitle: tmData?.verdict ?? 'UNAVAILABLE: Time Machine probe has not returned data.',
                  dataSource: tmData?.dataSource ?? 'UNAVAILABLE',
                  evidenceQuality: tmData?.evidenceQuality ?? 'Unavailable',
                  details: [
                    { label: 'Configured Destination', value: tmData?.backupDestination ?? 'UNAVAILABLE' },
                    { label: 'Last Successful Snapshot', value: tmData?.lastSuccessfulBackup ?? 'UNAVAILABLE' },
                    { label: 'Operational Status', value: tmData?.status ?? 'UNAVAILABLE' },
                  ],
                  command: '/usr/bin/tmutil destinationinfo',
                  rawTelemetry: tmData,
                })
              }
              className="flex items-center justify-between border-b pb-3 cursor-pointer hover:opacity-90"
              style={{ borderColor: 'var(--color-line)' }}
            >
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>
                  Time Machine Backup Health
                </h3>
                <p className="text-xs text-slate-400">{tmData?.verdict ?? 'UNAVAILABLE: Time Machine probe has not returned data.'}</p>
              </div>
              <span className="pill bg-emerald-500/10 text-emerald-500 border-emerald-500/25 text-xs font-bold">
                {tmData?.status ?? 'UNAVAILABLE'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div
                onClick={() =>
                  setInspectItem({
                    title: 'Backup Destination Target',
                    category: 'Time Machine Destination',
                    badge: tmData?.configured ? 'Active' : 'Unconfigured',
                    subtitle: 'Local APFS volume or network SMB share assigned for automated backups.',
                    dataSource: '/usr/bin/tmutil destinationinfo',
                    evidenceQuality: 'Observed',
                    details: [
                      { label: 'Target Name', value: tmData?.backupDestination ?? 'UNAVAILABLE' },
                      { label: 'Latest Backup Path', value: tmData?.lastSuccessfulBackup ?? 'UNAVAILABLE' },
                    ],
                  })
                }
                className="card card-hover p-4 rounded-xl border space-y-2 cursor-pointer"
                style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
              >
                <p className="font-bold" style={{ color: 'var(--color-ink)' }}>Backup Target</p>
                <p className="font-mono text-slate-400">{tmData?.backupDestination ?? 'UNAVAILABLE'}</p>
                <p className="text-slate-300">Last Successful: <strong>{tmData?.lastSuccessfulBackup ?? 'UNAVAILABLE'}</strong></p>
              </div>

              <div
                onClick={() =>
                  setInspectItem({
                    title: 'Time Machine Excluded Paths',
                    category: 'Backup Boundaries',
                    badge: 'Managed',
                    subtitle: 'Standard caches and high-churn temporary directories excluded from backups to save storage.',
                    dataSource: 'macOS tmutil default exclusion policy',
                    evidenceQuality: 'Inferred',
                    details: [
                      { label: 'User Caches', value: '~/Library/Caches' },
                      { label: 'Build Artifacts', value: '~/Library/Developer/Xcode/DerivedData' },
                      { label: 'Package Caches', value: '~/.npm, ~/.cargo' },
                    ],
                  })
                }
                className="card card-hover p-4 rounded-xl border space-y-2 cursor-pointer"
                style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
              >
                <p className="font-bold" style={{ color: 'var(--color-ink)' }}>Standard Exclusion Bounds</p>
                <div className="space-y-1">
                  <p className="font-mono text-[11px] text-slate-400 truncate">• ~/Library/Caches</p>
                  <p className="font-mono text-[11px] text-slate-400 truncate">• ~/Library/Developer/Xcode/DerivedData</p>
                  <p className="font-mono text-[11px] text-slate-400 truncate">• ~/.npm &amp; ~/.cargo</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {subTab === 'icloud' && (
          <motion.div key="icloud" {...tabTransition} className="card p-6 space-y-6">
            <div
              onClick={() =>
                setInspectItem({
                  title: 'iCloud & CloudDocs Doctor',
                  category: 'Cloud Storage & Sync',
                  badge: icloudData?.accountConfigured ? 'Configured' : 'Inactive',
                  subtitle: icloudData?.verdict ?? 'UNAVAILABLE: iCloud probe has not returned data.',
                  dataSource: icloudData?.dataSource ?? 'UNAVAILABLE',
                  evidenceQuality: icloudData?.evidenceQuality ?? 'Unavailable',
                  details: [
                    { label: 'Local CloudDocs Repository', value: icloudData?.accountConfigured ? 'Present on disk' : 'Not Found' },
                    { label: 'iCloud Drive Sync', value: icloudData?.icloudDriveSync ?? 'UNAVAILABLE' },
                    { label: 'Cloud Daemon (bird / cloudd)', value: icloudData?.cloudDaemonActive ? 'Active' : 'Idle' },
                  ],
                  rawTelemetry: icloudData,
                })
              }
              className="flex items-center justify-between border-b pb-3 cursor-pointer hover:opacity-90"
              style={{ borderColor: 'var(--color-line)' }}
            >
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>
                  iCloud &amp; Apple Account Sync Status
                </h3>
                <p className="text-xs text-slate-400">{icloudData?.verdict ?? 'UNAVAILABLE: iCloud probe has not returned data.'}</p>
              </div>
              <span className="pill bg-emerald-500/10 text-emerald-500 border-emerald-500/25 text-xs font-bold">
                {icloudData?.accountConfigured ? 'Configured' : 'Inactive'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div
                onClick={() =>
                  setInspectItem({
                    title: 'iCloud Drive Local Sync',
                    category: 'Filesystem Sync',
                    badge: icloudData?.icloudDriveSync ?? 'UNAVAILABLE',
                    subtitle: 'Status of ~/Library/Mobile Documents/com~apple~CloudDocs repository.',
                    dataSource: 'fs.existsSync(CloudDocs)',
                    evidenceQuality: 'Observed',
                    details: [
                      { label: 'Sync State', value: icloudData?.icloudDriveSync ?? 'UNAVAILABLE' },
                    ],
                  })
                }
                className="card card-hover p-3.5 rounded-xl border text-center cursor-pointer"
                style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
              >
                <span className="text-[10px] uppercase font-bold text-slate-400">iCloud Drive</span>
                <p className="text-xs font-bold text-emerald-400 mt-1">{icloudData?.icloudDriveSync ?? 'UNAVAILABLE'}</p>
              </div>

              <div
                onClick={() =>
                  setInspectItem({
                    title: 'Sync Daemons Status',
                    category: 'Process Inspection',
                    badge: icloudData?.cloudDaemonActive ? 'Active' : 'Idle',
                    subtitle: 'Detects background synchronization worker daemons bird and cloudd.',
                    dataSource: 'ps -axco command',
                    evidenceQuality: 'Observed',
                    details: [
                      { label: 'Daemons Running', value: icloudData?.cloudDaemonActive ? 'Active' : 'Idle' },
                    ],
                  })
                }
                className="card card-hover p-3.5 rounded-xl border text-center cursor-pointer"
                style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
              >
                <span className="text-[10px] uppercase font-bold text-slate-400">Cloud Daemons</span>
                <p className="text-xs font-bold text-emerald-400 mt-1">{icloudData?.cloudDaemonActive ? 'Active' : 'Idle'}</p>
              </div>

              <div
                onClick={() =>
                  setInspectItem({
                    title: 'Desktop & Documents Sync',
                    category: 'Apple Account Sync',
                    badge: icloudData?.desktopDocumentsSync ?? 'UNAVAILABLE',
                    subtitle: 'Detects whether Desktop and Documents are mirrored to iCloud.',
                    dataSource: 'iCloud Drive Configuration',
                    evidenceQuality: 'Observed',
                    details: [
                      { label: 'Desktop Sync', value: icloudData?.desktopDocumentsSync ?? 'UNAVAILABLE' },
                    ],
                  })
                }
                className="card card-hover p-3.5 rounded-xl border text-center cursor-pointer"
                style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
              >
                <span className="text-[10px] uppercase font-bold text-slate-400">Desktop &amp; Docs</span>
                <p className="text-xs font-bold text-emerald-400 mt-1">{icloudData?.desktopDocumentsSync ?? 'UNAVAILABLE'}</p>
              </div>
            </div>
          </motion.div>
        )}

        {subTab === 'services' && (
          <motion.div key="services" {...tabTransition} className="card p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-line)' }}>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>
                  Continuity &amp; Nearby Device Ecosystem
                </h3>
                <p className="text-xs text-slate-400">Probed via live macOS daemon states (sharingd, rapportd, bluetoothd).</p>
              </div>
              <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25 text-xs font-bold">
                {servicesData?.services?.length || 0} Subsystems
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(servicesData?.services || []).map((srv: any, idx: number) => (
                <div
                  key={idx}
                  onClick={() =>
                    setInspectItem({
                      title: srv.name,
                      category: 'Apple Continuity Service',
                      badge: srv.status,
                      subtitle: srv.detail,
                      dataSource: `ps -axco command (${srv.daemon || 'daemon'})`,
                      evidenceQuality: 'Observed',
                      details: [
                        { label: 'Service Name', value: srv.name },
                        { label: 'Associated Daemon', value: srv.daemon || 'N/A', isCode: true },
                        { label: 'Runtime Status', value: srv.status },
                        { label: 'Service Details', value: srv.detail },
                      ],
                    })
                  }
                  className="card card-hover p-4 rounded-xl border space-y-1 cursor-pointer"
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
