import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Code, Terminal, Layers, Trash2, CheckCircle2, AlertTriangle,
  Radio, HardDrive, Sparkles, RefreshCw, ChevronRight, XCircle,
  Key, Globe, Shield, Lock, Box
} from 'lucide-react';
import { usePlatform } from '../platform';
import InspectorModal, { type InspectorData } from './InspectorModal';

export default function DeveloperDoctorHub() {
  const { config, isMac } = usePlatform();
  const [subTab, setSubTab] = useState<'env' | 'docker' | 'xcode' | 'ssh' | 'vm' | 'browser' | 'ports'>('env');
  const [envData, setEnvData] = useState<any>(null);
  const [dockerData, setDockerData] = useState<any>(null);
  const [xcodeData, setXcodeData] = useState<any>(null);
  const [sshData, setSshData] = useState<any>(null);
  const [vmData, setVmData] = useState<any>(null);
  const [browserData, setBrowserData] = useState<any>(null);
  const [listeningPorts, setListeningPorts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [cleaningAction, setCleaningAction] = useState<string | null>(null);
  const [actionDoneMsg, setActionDoneMsg] = useState<string | null>(null);
  const [inspectItem, setInspectItem] = useState<InspectorData | null>(null);

  const fetchDevData = async () => {
    setLoading(true);
    try {
      const [eRes, dRes, xRes, sRes, vRes, bRes, pRes] = await Promise.all([
        fetch('http://127.0.0.1:3131/api/developer/health').catch(() => null),
        fetch('http://127.0.0.1:3131/api/storage/docker').catch(() => null),
        fetch('http://127.0.0.1:3131/api/storage/xcode').catch(() => null),
        fetch('http://127.0.0.1:3131/api/diagnostics/ssh-doctor').catch(() => null),
        fetch('http://127.0.0.1:3131/api/diagnostics/virtualization').catch(() => null),
        fetch('http://127.0.0.1:3131/api/diagnostics/browser-health').catch(() => null),
        fetch('http://127.0.0.1:3131/api/network/listening-ports').catch(() => null),
      ]);

      if (eRes && eRes.ok) setEnvData(await eRes.json());
      if (dRes && dRes.ok) setDockerData(await dRes.json());
      if (xRes && xRes.ok) setXcodeData(await xRes.json());
      if (sRes && sRes.ok) setSshData(await sRes.json());
      if (vRes && vRes.ok) setVmData(await vRes.json());
      if (bRes && bRes.ok) setBrowserData(await bRes.json());
      if (pRes && pRes.ok) {
        const p = await pRes.json();
        setListeningPorts(p.ports || []);
      }
    } catch {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevData();
  }, []);

  const handleCleanDocker = async () => {
    setCleaningAction('docker');
    try {
      const res = await fetch('http://127.0.0.1:3131/api/actions/clean-docker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pruneImages: true, pruneBuildCache: true }),
      });
      const data = await res.json();
      setActionDoneMsg(data.message || 'Docker storage cleaned.');
      await fetchDevData();
    } catch {}
    finally {
      setCleaningAction(null);
    }
  };

  const handleCleanXcode = async () => {
    setCleaningAction('xcode');
    try {
      const res = await fetch('http://127.0.0.1:3131/api/actions/clean-xcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setActionDoneMsg(data.message || 'Xcode DerivedData purged.');
      await fetchDevData();
    } catch {}
    finally {
      setCleaningAction(null);
    }
  };

  const handleKillPort = async (e: React.MouseEvent, port: number) => {
    e.stopPropagation();
    try {
      await fetch('http://127.0.0.1:3131/api/actions/kill-port', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port }),
      });
      setActionDoneMsg(`Freed TCP port ${port}`);
      await fetchDevData();
    } catch {}
  };

  return (
    <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <InspectorModal data={inspectItem} onClose={() => setInspectItem(null)} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25">
              <Code size={12} /> Developer Health, Storage &amp; SSH Doctor
            </span>
            <span className="pill" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-ink-3)', borderColor: 'var(--color-line)' }}>
              Runtimes, SSH, Docker, Virtualization &amp; Browsers
            </span>
          </div>
          <h1 className="text-hero font-extrabold tracking-tight" style={{ color: 'var(--color-ink)' }}>
            Developer Health &amp; Toolchain Doctor
          </h1>
          <p className="mt-1 text-[14px]" style={{ color: 'var(--color-ink-3)' }}>
            Diagnose multi-runtime environments, PATH conflicts, SSH configurations, Virtualization/VM hypervisors, browser bloat, and manage active sockets.
          </p>
        </div>

        <button onClick={fetchDevData} disabled={loading} className="btn btn-ghost text-xs cursor-pointer">
          <RefreshCw size={13} className={loading ? 'animate-spin-smooth' : ''} />
          <span>Refresh Developer Hub</span>
        </button>
      </div>

      {actionDoneMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-500 flex items-center justify-between">
          <span>✓ {actionDoneMsg}</span>
          <button onClick={() => setActionDoneMsg(null)} className="text-slate-400 hover:text-slate-200">×</button>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl border overflow-x-auto" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
        {[
          { id: 'env' as const,     label: 'Environment & PATH',    icon: Terminal,  color: '#facc15' },
          { id: 'docker' as const,  label: 'Docker Storage',        icon: Layers,    color: '#22d3ee' },
          { id: 'xcode' as const,   label: 'Xcode Doctor',          icon: HardDrive, color: '#f97316' },
          { id: 'ssh' as const,     label: 'SSH & Git Doctor',      icon: Key,       color: '#34d399' },
          { id: 'vm' as const,      label: 'Virtualization & VMs',  icon: Box,       color: '#a78bfa' },
          { id: 'browser' as const, label: 'Browser Health',        icon: Globe,     color: '#60a5fa' },
          { id: 'ports' as const,   label: 'Sockets & Port Killer', icon: Radio,     color: '#f43f5e' },
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
              <t.icon size={14} style={{ color: isSel ? '#fff' : t.color }} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sub-tab Views */}
      <AnimatePresence mode="wait">
        {subTab === 'env' && (
          <motion.div key="env" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            {envData?.pathWarnings?.length > 0 && (
              <div className="p-4 rounded-xl border bg-amber-500/10 border-amber-500/25 space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-500">
                  <AlertTriangle size={14} />
                  <span>PATH Conflict / Multiple Version Warning</span>
                </div>
                {envData.pathWarnings.map((w: any, idx: number) => (
                  <p key={idx} className="text-xs text-slate-300 ml-5">{w.warning}</p>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(envData?.runtimes || []).map((tool: any, idx: number) => (
                <div
                  key={idx}
                  onClick={() =>
                    setInspectItem({
                      title: tool.name,
                      category: 'Developer Toolchain',
                      badge: tool.installed ? tool.version : 'Not Installed',
                      badgeType: tool.installed ? 'success' : 'error',
                      subtitle: tool.path || 'Binary Path',
                      details: [
                        { label: 'Executable Path', value: tool.path, isCode: true },
                        { label: 'Installed Architecture', value: tool.arch || 'arm64' },
                        { label: 'Multiple Installs', value: tool.multipleInstalls ? 'Yes (Detected)' : 'No (Clean single install)' },
                        { label: 'PATH Integrity', value: tool.pathHealthy ? 'Verified in $PATH' : 'Missing from $PATH' },
                      ],
                    })
                  }
                  className="card card-hover p-4 space-y-2.5 text-left cursor-pointer transition-all hover:scale-[1.01]"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold" style={{ color: 'var(--color-ink)' }}>
                      {tool.name}
                    </h3>
                    <span
                      className={`pill text-[10px] ${
                        tool.installed
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25'
                          : 'bg-slate-500/10 text-slate-400 border-slate-500/25'
                      }`}
                    >
                      {tool.installed ? tool.version : 'Missing'}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-slate-400 truncate">{tool.path || 'Not discovered'}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {subTab === 'docker' && (
          <motion.div key="docker" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--color-line)' }}>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>
                  Docker Storage Breakdown
                </h3>
                <p className="text-xs text-slate-400">Selective pruning for images, containers, and build cache without deleting essential volumes.</p>
              </div>
              <button
                onClick={handleCleanDocker}
                disabled={cleaningAction === 'docker'}
                className="btn btn-primary text-xs flex items-center gap-2 cursor-pointer"
              >
                <Trash2 size={13} />
                <span>{cleaningAction === 'docker' ? 'Pruning...' : 'Prune Unused Images & Build Cache'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div
                onClick={() =>
                  setInspectItem({
                    title: 'Docker Image Footprint',
                    category: 'Container Storage',
                    badge: dockerData?.imagesSize || '0 MB',
                    subtitle: 'Local cached OCI/Docker container layer images.',
                    dataSource: 'docker system df / getMacDockerStorage()',
                    evidenceQuality: 'Observed',
                    details: [
                      { label: 'Image Storage Used', value: dockerData?.imagesSize || '0 MB' },
                    ],
                  })
                }
                className="card card-hover p-4 rounded-xl border text-center cursor-pointer"
                style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
              >
                <span className="text-[10px] uppercase font-bold text-slate-400">Images</span>
                <p className="text-lg font-extrabold font-mono text-blue-500 mt-1">{dockerData?.imagesSize || '0 MB'}</p>
              </div>

              <div
                onClick={() =>
                  setInspectItem({
                    title: 'Docker Containers Footprint',
                    category: 'Container Storage',
                    badge: dockerData?.containersSize || '0 MB',
                    subtitle: 'Disk space occupied by writable container layers.',
                    dataSource: 'docker system df',
                    evidenceQuality: 'Observed',
                    details: [
                      { label: 'Container Storage', value: dockerData?.containersSize || '0 MB' },
                    ],
                  })
                }
                className="card card-hover p-4 rounded-xl border text-center cursor-pointer"
                style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
              >
                <span className="text-[10px] uppercase font-bold text-slate-400">Containers</span>
                <p className="text-lg font-extrabold font-mono text-blue-400 mt-1">{dockerData?.containersSize || '0 MB'}</p>
              </div>

              <div
                onClick={() =>
                  setInspectItem({
                    title: 'Docker Local Volumes',
                    category: 'Persistent Storage',
                    badge: dockerData?.volumesSize || '0 MB',
                    subtitle: 'Persistent database and state volumes mounted into containers.',
                    dataSource: 'docker volume ls',
                    evidenceQuality: 'Observed',
                    details: [
                      { label: 'Volume Space', value: dockerData?.volumesSize || '0 MB' },
                    ],
                  })
                }
                className="card card-hover p-4 rounded-xl border text-center cursor-pointer"
                style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
              >
                <span className="text-[10px] uppercase font-bold text-slate-400">Local Volumes</span>
                <p className="text-lg font-extrabold font-mono text-purple-400 mt-1">{dockerData?.volumesSize || '0 MB'}</p>
              </div>

              <div
                onClick={() =>
                  setInspectItem({
                    title: 'Docker BuildKit Cache',
                    category: 'Build Cache',
                    badge: dockerData?.buildCacheSize || '0 MB',
                    subtitle: 'Intermediate multistage build artifacts generated during docker build.',
                    dataSource: 'docker builder du',
                    evidenceQuality: 'Observed',
                    details: [
                      { label: 'Build Cache Space', value: dockerData?.buildCacheSize || '0 MB' },
                    ],
                  })
                }
                className="card card-hover p-4 rounded-xl border text-center cursor-pointer"
                style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
              >
                <span className="text-[10px] uppercase font-bold text-slate-400">Build Cache</span>
                <p className="text-lg font-extrabold font-mono text-emerald-500 mt-1">{dockerData?.buildCacheSize || '0 MB'}</p>
              </div>
            </div>
          </motion.div>
        )}

        {subTab === 'xcode' && (
          <motion.div key="xcode" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--color-line)' }}>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>
                  Xcode Doctor &amp; Build Artifacts ({xcodeData?.totalGB || '0'} GB Total)
                </h3>
                <p className="text-xs text-slate-400">DerivedData, device sandboxes, archives, and symbol caches.</p>
              </div>
              <button
                onClick={handleCleanXcode}
                disabled={cleaningAction === 'xcode'}
                className="btn btn-primary text-xs flex items-center gap-2 cursor-pointer"
              >
                <Trash2 size={13} />
                <span>{cleaningAction === 'xcode' ? 'Purging...' : 'Purge DerivedData & Caches'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(xcodeData?.items || []).map((item: any) => (
                <div
                  key={item.id}
                  onClick={() =>
                    setInspectItem({
                      title: item.name,
                      category: 'Xcode Build Artifact',
                      badge: `${Math.round(item.sizeMB)} MB`,
                      subtitle: item.path,
                      dataSource: `du -sk '${item.path}'`,
                      evidenceQuality: 'Observed',
                      details: [
                        { label: 'Artifact Name', value: item.name },
                        { label: 'Directory Path', value: item.path, isCode: true },
                        { label: 'Disk Footprint', value: `${Math.round(item.sizeMB)} MB` },
                      ],
                    })
                  }
                  className="card card-hover p-3.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer"
                  style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
                >
                  <div>
                    <h4 className="text-xs font-bold" style={{ color: 'var(--color-ink)' }}>
                      {item.name}
                    </h4>
                    <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5">{item.path}</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-blue-500 shrink-0">
                    {Math.round(item.sizeMB)} MB
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {subTab === 'ssh' && (
          <motion.div key="ssh" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card p-6 space-y-6">
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-line)' }}>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>
                  SSH Keys, Agent &amp; Git Connectivity
                </h3>
                <p className="text-xs text-slate-400">{sshData?.diagnosis || 'SSH environment verified.'}</p>
              </div>
              <span className="pill bg-emerald-500/10 text-emerald-500 border-emerald-500/25 text-xs font-bold">
                SSH Inspected
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div
                onClick={() =>
                  setInspectItem({
                    title: 'SSH Configuration File',
                    category: 'Developer Networking',
                    badge: sshData?.sshConfigFound ? 'Configured' : 'Default',
                    subtitle: 'Local user ~/.ssh/config host definitions and identity rules.',
                    dataSource: 'fs.existsSync(~/.ssh/config)',
                    evidenceQuality: 'Observed',
                    details: [
                      { label: 'Config Present', value: sshData?.sshConfigFound ? 'Yes (~/.ssh/config)' : 'No' },
                    ],
                  })
                }
                className="card card-hover p-3 rounded-xl border text-center cursor-pointer"
                style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
              >
                <span className="text-[10px] uppercase font-bold text-slate-400">~/.ssh/config</span>
                <p className="font-mono font-bold text-emerald-400 mt-1">{sshData?.sshConfigFound ? 'Configured ✓' : 'Default'}</p>
              </div>

              <div
                onClick={() =>
                  setInspectItem({
                    title: 'Private Keys Inventory',
                    category: 'Developer Credentials',
                    badge: `${sshData?.privateKeysCount ?? 0} Keys`,
                    subtitle: 'Detected private authentication keys stored inside ~/.ssh.',
                    dataSource: 'fs.readdirSync(~/.ssh)',
                    evidenceQuality: 'Observed',
                    details: [
                      { label: 'Private Keys Count', value: sshData?.privateKeysCount ?? 0 },
                    ],
                  })
                }
                className="card card-hover p-3 rounded-xl border text-center cursor-pointer"
                style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
              >
                <span className="text-[10px] uppercase font-bold text-slate-400">Private Keys</span>
                <p className="font-mono font-bold text-blue-400 mt-1">{sshData?.privateKeysCount ?? 0} Keys</p>
              </div>

              <div
                onClick={() =>
                  setInspectItem({
                    title: 'Known Hosts File',
                    category: 'Host Fingerprints',
                    badge: sshData?.knownHostsFound ? 'Present' : 'None',
                    subtitle: 'Verified server public key fingerprints stored in ~/.ssh/known_hosts.',
                    dataSource: 'fs.existsSync(~/.ssh/known_hosts)',
                    evidenceQuality: 'Observed',
                    details: [
                      { label: 'known_hosts Present', value: sshData?.knownHostsFound ? 'Yes' : 'No' },
                    ],
                  })
                }
                className="card card-hover p-3 rounded-xl border text-center cursor-pointer"
                style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
              >
                <span className="text-[10px] uppercase font-bold text-slate-400">known_hosts</span>
                <p className="font-mono font-bold text-emerald-400 mt-1">{sshData?.knownHostsFound ? 'Present ✓' : 'None'}</p>
              </div>
            </div>
          </motion.div>
        )}

        {subTab === 'vm' && (
          <motion.div key="vm" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card p-6 space-y-4">
            <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>
              Virtualization Hypervisors &amp; VM Footprint
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(vmData?.hypervisorsDetected || []).map((vm: any, idx: number) => (
                <div
                  key={idx}
                  onClick={() =>
                    setInspectItem({
                      title: vm.name,
                      category: 'Virtualization & Hypervisors',
                      badge: vm.active ? 'Active' : 'Inactive',
                      subtitle: vm.support || (vm.active ? 'Hypervisor process active' : 'Not currently running'),
                      dataSource: 'ps -axco command + Hypervisor.framework',
                      evidenceQuality: 'Observed',
                      details: [
                        { label: 'Hypervisor Engine', value: vm.name },
                        { label: 'Running Status', value: vm.active ? 'Active' : 'Inactive' },
                      ],
                    })
                  }
                  className="card card-hover p-4 rounded-xl border space-y-1 cursor-pointer"
                  style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold" style={{ color: 'var(--color-ink)' }}>{vm.name}</h4>
                    <span className={`pill text-[10px] ${vm.active ? 'bg-blue-500/10 text-blue-500 border-blue-500/25' : 'bg-slate-500/10 text-slate-400 border-slate-500/25'}`}>
                      {vm.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {subTab === 'browser' && (
          <motion.div key="browser" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-line)' }}>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>
                  Browser Health &amp; Disk Storage
                </h3>
                <p className="text-xs text-slate-400">{browserData?.verdict || 'Measured via profile & cache sizes on disk.'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(browserData?.browsers || []).map((b: any, idx: number) => (
                <div
                  key={idx}
                  onClick={() =>
                    setInspectItem({
                      title: b.name,
                      category: 'Browser Profile & Storage',
                      badge: `${b.totalStorageMB} MB`,
                      subtitle: 'Measured profile state and network cache size on local disk.',
                      dataSource: '~/Library/Application Support & ~/Library/Caches via du -sk',
                      evidenceQuality: 'Observed',
                      details: [
                        { label: 'Browser Name', value: b.name },
                        { label: 'Profile Size', value: `${b.profileSizeMB} MB` },
                        { label: 'Cache Storage', value: `${b.cacheSizeMB} MB` },
                        { label: 'Total Disk Used', value: `${b.totalStorageMB} MB` },
                      ],
                    })
                  }
                  className="card card-hover p-4 rounded-xl border space-y-2 text-xs cursor-pointer"
                  style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold" style={{ color: 'var(--color-ink)' }}>{b.name}</h4>
                    <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25 text-[10px]">{b.status}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-slate-400">
                    <div>Profile: <strong className="text-slate-200">{b.profileSizeMB} MB</strong></div>
                    <div>Caches: <strong className="text-slate-200">{b.cacheSizeMB} MB</strong></div>
                    <div>Total: <strong className="text-blue-400">{b.totalStorageMB} MB</strong></div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {subTab === 'ports' && (
          <motion.div key="ports" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>
                Active Listening Sockets ({listeningPorts.length} Ports)
              </h3>
              <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25 text-[10px]">
                Click row to inspect · 1-Click Port Killer Active
              </span>
            </div>

            <div className="divide-y overflow-hidden" style={{ borderColor: 'var(--color-line)' }}>
              {listeningPorts.map((p) => (
                <div
                  key={p.id}
                  onClick={() =>
                    setInspectItem({
                      title: `TCP Port ${p.port} (${p.process})`,
                      category: 'Active Network Socket',
                      badge: `PID ${p.pid}`,
                      subtitle: `Listening on ${p.address}:${p.port} bound to process ${p.process}`,
                      dataSource: '/usr/bin/lsof -iTCP -sTCP:LISTEN -P -n',
                      evidenceQuality: 'Observed',
                      details: [
                        { label: 'Port Number', value: p.port },
                        { label: 'Process Name', value: p.process },
                        { label: 'Process ID (PID)', value: p.pid, isCode: true },
                        { label: 'Bind Address', value: p.address },
                        { label: 'Owner User', value: p.user || 'Current User' },
                      ],
                      command: `/usr/bin/lsof -i :${p.port}`,
                      actionButton: {
                        label: `Terminate Process & Free Port ${p.port}`,
                        danger: true,
                        icon: XCircle,
                        onClick: () => handleKillPort({ stopPropagation: () => {} } as any, p.port),
                      },
                    })
                  }
                  className="flex items-center justify-between py-3 px-2 hover:bg-slate-500/5 transition-colors cursor-pointer rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-500 font-mono font-bold text-xs">
                      :{p.port}
                    </span>
                    <div>
                      <p className="text-xs font-bold" style={{ color: 'var(--color-ink)' }}>
                        {p.process} <span className="text-slate-400 font-normal">(PID {p.pid})</span>
                      </p>
                      <p className="text-[10px] font-mono text-slate-500">{p.address} · User: {p.user}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleKillPort(e, p.port)}
                    className="btn btn-ghost text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2.5 py-1 cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <XCircle size={13} />
                    <span>Kill : {p.port}</span>
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
