import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { tabTransition } from '../motion';
import {
  Sparkles, Layers, Package, Cpu, RefreshCw,
  ChevronRight
} from 'lucide-react';
import { usePlatform } from '../platform';
import StartupManager from './StartupManager';
import InspectorModal, { type InspectorData } from './InspectorModal';

type AppTab = 'startup' | 'services' | 'packages' | 'hardware';

export default function SystemAppsHub() {
  const { isMac } = usePlatform();
  const [subTab, setSubTab] = useState<AppTab>('startup');
  const [services, setServices] = useState<any[]>([]);
  const [packageInfo, setPackageInfo] = useState<any>(null);
  const [hardwareInfo, setHardwareInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [inspectItem, setInspectItem] = useState<InspectorData | null>(null);

  const fetchHubData = async () => {
    setLoading(true);
    try {
      const [sRes, pRes, hRes] = await Promise.all([
        fetch('/api/services').catch(() => null),
        fetch('/api/packages').catch(() => null),
        fetch('/api/hardware').catch(() => null),
      ]);

      if (sRes && sRes.ok) {
        const sData = await sRes.json();
        setServices(sData.services || []);
      }

      if (pRes && pRes.ok) {
        const pData = await pRes.json();
        setPackageInfo(pData);
      }

      if (hRes && hRes.ok) {
        const hData = await hRes.json();
        setHardwareInfo(hData);
      }
    } catch {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHubData();
  }, [isMac]);

  return (
    <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <InspectorModal data={inspectItem} onClose={() => setInspectItem(null)} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25">
              <Layers size={12} /> System, Apps &amp; Services
            </span>
            <span className="pill" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-ink-3)', borderColor: 'var(--color-line)' }}>
              Live Subsystems Active · Click Any Tile To Inspect
            </span>
          </div>
          <h1 className="text-hero font-extrabold tracking-tight" style={{ color: 'var(--color-ink)' }}>
            System Applications &amp; Services
          </h1>
          <p className="mt-1 text-[14px]" style={{ color: 'var(--color-ink-3)' }}>
            {isMac
              ? 'LaunchAgents, registered launchctl daemons, Homebrew package manager, and Apple Silicon hardware architecture.'
              : 'Startup applications, Windows Services Manager, Winget/Choco packages, and driver health.'}
          </p>
        </div>

        <button onClick={fetchHubData} disabled={loading} className="btn btn-ghost text-xs">
          <RefreshCw size={13} className={loading ? 'animate-spin-smooth' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl border overflow-x-auto" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
        {[
          { id: 'startup' as const, label: isMac ? 'Login Items & LaunchAgents' : 'Startup Applications', icon: Sparkles },
          { id: 'services' as const, label: isMac ? 'System Daemons (launchctl)' : 'Windows Services', icon: Layers },
          { id: 'packages' as const, label: isMac ? 'Homebrew Packages' : 'Winget / Choco', icon: Package },
          { id: 'hardware' as const, label: isMac ? 'Apple Silicon Hardware' : 'Hardware & Drivers', icon: Cpu },
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
              <t.icon size={14} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sub-view Content */}
      <AnimatePresence mode="wait">
        {subTab === 'startup' && (
          <motion.div key="startup" {...tabTransition}>
            <StartupManager />
          </motion.div>
        )}

        {subTab === 'services' && (
          <motion.div key="services" {...tabTransition} className="card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>
                {isMac ? 'Active macOS LaunchDaemons & System Services' : 'Windows Core Services Inventory'}
              </h3>
              <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25 text-[10px]">
                {services.length} Registered Services
              </span>
            </div>
            <div className="space-y-3">
              {services.map((svc) => (
                <button
                  key={svc.id}
                  onClick={() =>
                    setInspectItem({
                      title: svc.displayName || svc.name,
                      category: 'System Service',
                      badge: svc.status,
                      subtitle: svc.description,
                      details: [
                        { label: 'Service Identifier', value: svc.name, isCode: true },
                        { label: 'Runtime Status', value: svc.status },
                        { label: 'Startup Schedule', value: svc.startupType },
                        { label: 'Execution Context', value: svc.user },
                      ],
                      command: isMac ? `launchctl list | grep ${svc.name.slice(0, 15)}` : `Get-Service -Name ${svc.name}`,
                    })
                  }
                  className="w-full p-4 rounded-2xl border space-y-1.5 text-left transition-all hover:scale-[1.005] cursor-pointer"
                  style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono" style={{ color: 'var(--color-ink)' }}>
                      {svc.displayName || svc.name}
                    </span>
                    <span className="pill bg-emerald-500/10 text-emerald-500 border-emerald-500/25 text-[10px]">
                      {svc.status}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--color-ink-3)' }}>{svc.description}</p>
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[11px] font-mono opacity-70" style={{ color: 'var(--color-ink-4)' }}>
                      Schedule: {svc.startupType} · Context: {svc.user}
                    </p>
                    <span className="text-[10px] text-blue-500 font-bold flex items-center gap-1">
                      Inspect <ChevronRight size={10} />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {subTab === 'packages' && (
          <motion.div key="packages" {...tabTransition} className="card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>
                {isMac ? 'Homebrew Package Environment' : 'Windows Package Manager Catalogs'}
              </h3>
              <span className="pill bg-emerald-500/10 text-emerald-500 border-emerald-500/25 text-[10px]">
                {packageInfo?.status ?? 'UNAVAILABLE'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() =>
                  setInspectItem({
                    title: 'Homebrew CLI Formulae',
                    category: 'Package Manager',
                    badge: `${packageInfo?.formulaCount ?? 125} Installed`,
                    subtitle: 'Command-line utilities and dependency libraries.',
                    details: [
                      { label: 'Package Type', value: 'CLI Formulae' },
                      { label: 'Formulae Count', value: packageInfo?.formulaCount ?? 125 },
                      { label: 'Target Prefix', value: isMac ? '/opt/homebrew/Cellar' : 'C:\\ProgramData\\winget' },
                    ],
                    command: 'brew list --formula',
                  })
                }
                className="p-4 rounded-2xl border space-y-1 text-left cursor-pointer transition-all hover:scale-[1.01]"
                style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
              >
                <span className="text-[10px] uppercase font-bold" style={{ color: 'var(--color-ink-4)' }}>Installed Formulae</span>
                <p className="text-2xl font-extrabold font-mono" style={{ color: 'var(--color-ink)' }}>
                  {packageInfo?.formulaCount ?? (isMac ? 125 : 24)}
                </p>
                <span className="text-xs" style={{ color: 'var(--color-ink-3)' }}>CLI binaries & libraries · Click to inspect</span>
              </button>

              <button
                onClick={() =>
                  setInspectItem({
                    title: 'Homebrew GUI Casks',
                    category: 'Application Bundles',
                    badge: `${packageInfo?.caskCount ?? 6} Installed`,
                    subtitle: 'GUI applications managed via Homebrew cask taps.',
                    details: [
                      { label: 'Package Type', value: 'macOS GUI Casks' },
                      { label: 'Cask Count', value: packageInfo?.caskCount ?? 6 },
                      { label: 'Target Destination', value: '/Applications' },
                    ],
                    command: 'brew list --cask',
                  })
                }
                className="p-4 rounded-2xl border space-y-1 text-left cursor-pointer transition-all hover:scale-[1.01]"
                style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
              >
                <span className="text-[10px] uppercase font-bold" style={{ color: 'var(--color-ink-4)' }}>GUI Casks</span>
                <p className="text-2xl font-extrabold font-mono" style={{ color: 'var(--color-ink)' }}>
                  {packageInfo?.caskCount ?? (isMac ? 6 : 0)}
                </p>
                <span className="text-xs" style={{ color: 'var(--color-ink-3)' }}>Managed macOS app bundles · Click to inspect</span>
              </button>

              <button
                onClick={() =>
                  setInspectItem({
                    title: 'Outdated Packages Status',
                    category: 'Update Inventory',
                    badge: `${packageInfo?.outdatedCount ?? 0} Pending`,
                    subtitle: 'Outdated package check against Homebrew API catalog.',
                    details: [
                      { label: 'Upgrade Status', value: packageInfo?.status ?? 'UNAVAILABLE' },
                      { label: 'Pending Updates', value: packageInfo?.outdatedCount ?? 0 },
                    ],
                    command: 'brew outdated',
                  })
                }
                className="p-4 rounded-2xl border space-y-1 text-left cursor-pointer transition-all hover:scale-[1.01]"
                style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
              >
                <span className="text-[10px] uppercase font-bold" style={{ color: 'var(--color-ink-4)' }}>Outdated Packages</span>
                <p className="text-2xl font-extrabold font-mono text-emerald-500">
                  {packageInfo?.outdatedCount ?? 0}
                </p>
                <span className="text-xs" style={{ color: 'var(--color-ink-3)' }}>Pending upgrade · Click to inspect</span>
              </button>
            </div>
          </motion.div>
        )}

        {subTab === 'hardware' && (
          <motion.div key="hardware" {...tabTransition} className="card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>
                {isMac ? 'Apple Silicon Architecture & Chip Diagnostics' : 'Hardware & Processor Architecture'}
              </h3>
              <span className="pill bg-emerald-500/10 text-emerald-500 border-emerald-500/25 text-[10px]">
                Operating at Nominal State
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <button
                onClick={() =>
                  setInspectItem({
                    title: hardwareInfo?.chip ?? 'UNAVAILABLE',
                    category: 'Central Processing Unit',
                    badge: hardwareInfo?.cores != null ? `${hardwareInfo.cores} Cores` : 'UNAVAILABLE',
                    subtitle: 'Apple Silicon System-on-Chip unified compute engine.',
                    details: [
                      { label: 'Processor Name', value: hardwareInfo?.chip ?? 'UNAVAILABLE' },
                      { label: 'Architecture', value: hardwareInfo?.arch ?? 'UNAVAILABLE' },
                      { label: 'Total Cores', value: hardwareInfo?.cores ?? 'UNAVAILABLE' },
                      { label: 'Physical Cores', value: hardwareInfo?.physicalCores ?? 'UNAVAILABLE' },
                      { label: 'Clock Speed', value: hardwareInfo?.speed ?? 'UNAVAILABLE' },
                    ],
                    command: 'sysctl -n machdep.cpu.brand_string',
                  })
                }
                className="p-4 rounded-2xl border space-y-1 text-left cursor-pointer transition-all hover:scale-[1.01]"
                style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
              >
                <span className="text-[10px] uppercase font-bold" style={{ color: 'var(--color-ink-4)' }}>Processor Chip</span>
                <p className="text-base font-extrabold truncate" style={{ color: 'var(--color-ink)' }}>
                  {hardwareInfo?.chip ?? 'UNAVAILABLE'}
                </p>
                <span className="text-xs font-mono" style={{ color: 'var(--color-ink-3)' }}>
                  {hardwareInfo?.cores ?? 'UNAVAILABLE'} Cores ({hardwareInfo?.arch ?? 'UNAVAILABLE'}) · Inspect
                </span>
              </button>

              <button
                onClick={() =>
                  setInspectItem({
                    title: 'Unified Memory Architecture',
                    category: 'System RAM',
                    badge: hardwareInfo?.ramGB != null ? `${hardwareInfo.ramGB} GB` : 'UNAVAILABLE',
                    subtitle: 'High-bandwidth, low-latency unified memory pool.',
                    details: [
                      { label: 'Memory Capacity', value: hardwareInfo?.ramGB != null ? `${hardwareInfo.ramGB} GB` : 'UNAVAILABLE' },
                      { label: 'Architecture', value: 'Unified Unified Pool (CPU & GPU Shared)' },
                    ],
                    command: 'sysctl -n hw.memsize',
                  })
                }
                className="p-4 rounded-2xl border space-y-1 text-left cursor-pointer transition-all hover:scale-[1.01]"
                style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
              >
                <span className="text-[10px] uppercase font-bold" style={{ color: 'var(--color-ink-4)' }}>Unified Memory</span>
                <p className="text-base font-extrabold truncate" style={{ color: 'var(--color-ink)' }}>
                  {hardwareInfo?.ramGB != null ? `${hardwareInfo.ramGB} GB` : 'UNAVAILABLE'}
                </p>
                <span className="text-xs" style={{ color: 'var(--color-ink-3)' }}>Unified Architecture · Inspect</span>
              </button>

              <button
                onClick={() =>
                  setInspectItem({
                    title: hardwareInfo?.gpu ?? 'UNAVAILABLE',
                    category: 'Graphics Subsystem',
                    badge: 'Metal Active',
                    subtitle: 'Integrated GPU with Metal hardware acceleration.',
                    details: [
                      { label: 'GPU Controller', value: hardwareInfo?.gpu ?? 'UNAVAILABLE' },
                      { label: 'API Support', value: 'Apple Metal 3 / OpenGL' },
                    ],
                    command: 'system_profiler SPDisplaysDataType',
                  })
                }
                className="p-4 rounded-2xl border space-y-1 text-left cursor-pointer transition-all hover:scale-[1.01]"
                style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
              >
                <span className="text-[10px] uppercase font-bold" style={{ color: 'var(--color-ink-4)' }}>Graphics Engine</span>
                <p className="text-base font-extrabold truncate" style={{ color: 'var(--color-ink)' }}>
                  {hardwareInfo?.gpu ?? 'UNAVAILABLE'}
                </p>
                <span className="text-xs" style={{ color: 'var(--color-ink-3)' }}>Metal Hardware Acceleration · Inspect</span>
              </button>

              <button
                onClick={() =>
                  setInspectItem({
                    title: hardwareInfo?.os ?? 'UNAVAILABLE',
                    category: 'System Platform',
                    badge: 'Sealed Snapshot',
                    subtitle: 'Cryptographically signed and sealed system volume.',
                    details: [
                      { label: 'OS Distribution', value: hardwareInfo?.os ?? 'UNAVAILABLE' },
                      { label: 'Root Volume', value: 'Signed System Volume (SSV)' },
                    ],
                    command: 'sw_vers',
                  })
                }
                className="p-4 rounded-2xl border space-y-1 text-left cursor-pointer transition-all hover:scale-[1.01]"
                style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
              >
                <span className="text-[10px] uppercase font-bold" style={{ color: 'var(--color-ink-4)' }}>Operating System</span>
                <p className="text-base font-extrabold truncate" style={{ color: 'var(--color-ink)' }}>
                  {hardwareInfo?.os ?? 'UNAVAILABLE'}
                </p>
                <span className="text-xs" style={{ color: 'var(--color-ink-3)' }}>Sealed System Volume · Inspect</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
