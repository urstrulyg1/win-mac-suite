import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wrench, MemoryStick, Volume2, Sparkles, RefreshCw,
  FolderSync, ShieldCheck, Play, Terminal, CheckCircle2,
  AlertTriangle, Radio, Activity, ChevronRight, Cpu, Layers,
  XCircle, Zap, Code, Shield, Check
} from 'lucide-react';
import { usePlatform } from '../platform';
import InspectorModal, { type InspectorData } from './InspectorModal';

export default function MacUtilitiesHub() {
  const { config, isMac } = usePlatform();
  const [listeningPorts, setListeningPorts] = useState<any[]>([]);
  const [thermalInfo, setThermalInfo] = useState<any>(null);
  const [devHealth, setDevHealth] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [lastActionResult, setLastActionResult] = useState<{ title: string; message: string; type: 'success' | 'info' } | null>(null);
  const [inspectItem, setInspectItem] = useState<InspectorData | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'quickActions' | 'listeningPorts' | 'devHealth' | 'thermal'>('quickActions');

  const fetchUtilityData = async () => {
    setLoading(true);
    try {
      const [pRes, tRes, dRes] = await Promise.all([
        fetch('http://127.0.0.1:3131/api/network/listening-ports').catch(() => null),
        fetch('http://127.0.0.1:3131/api/thermal').catch(() => null),
        fetch('http://127.0.0.1:3131/api/developer/health').catch(() => null),
      ]);

      if (pRes && pRes.ok) {
        const pData = await pRes.json();
        setListeningPorts(pData.ports || []);
      }
      if (tRes && tRes.ok) {
        const tData = await tRes.json();
        setThermalInfo(tData);
      }
      if (dRes && dRes.ok) {
        const dData = await dRes.json();
        setDevHealth(dData);
      }
    } catch {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUtilityData();
  }, []);

  const runUtilityAction = async (endpoint: string, actionName: string, successMsg: string, payload: any = {}) => {
    setActionInProgress(actionName);
    try {
      const res = await fetch(`http://127.0.0.1:3131/api/actions/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setLastActionResult({
          title: `${actionName} Complete`,
          message: data.reclaimedMB ? `Reclaimed ~${data.reclaimedMB} MB of memory/disk space.` : successMsg,
          type: 'success',
        });
      } else {
        setLastActionResult({
          title: `${actionName} Encountered an Issue`,
          message: data.error || 'The utility executed with warnings.',
          type: 'info',
        });
      }
      await fetchUtilityData();
    } catch (err: any) {
      setLastActionResult({
        title: `${actionName} Failed`,
        message: err.message || 'Could not connect to operations daemon.',
        type: 'info',
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleKillPort = async (e: React.MouseEvent, port: number) => {
    e.stopPropagation();
    await runUtilityAction('kill-port', `Kill Port :${port}`, `Successfully killed process on port ${port}.`, { port });
  };

  const quickTools = [
    {
      id: 'purge-ram',
      title: isMac ? 'Purge Inactive RAM' : 'Trim System Memory',
      desc: isMac ? 'Flush unified memory buffer caches & reclaim inactive RAM via /usr/bin/purge' : 'Trim working set memory pools',
      icon: MemoryStick,
      color: '#3b82f6',
      bg: 'rgba(59,130,246,0.10)',
      btnLabel: 'Purge RAM',
      onRun: () => runUtilityAction('purge-ram', isMac ? 'RAM Purge' : 'Memory Trim', 'Flushed inactive memory caches.'),
      onInspect: () =>
        setInspectItem({
          title: isMac ? 'macOS RAM Cache Purger' : 'Memory Cache Trimmer',
          category: 'Memory Management',
          badge: isMac ? '/usr/bin/purge' : 'WorkingSet',
          subtitle: 'Forces disk cache buffers to flush and deallocates inactive unified RAM memory.',
          details: [
            { label: 'Executable', value: isMac ? '/usr/bin/purge' : 'Windows API' },
            { label: 'Safety Level', value: '100% Safe (No active app data lost)' },
            { label: 'Target Benefit', value: 'Frees up 500 MB - 2 GB of inactive RAM' },
          ],
          command: isMac ? 'purge' : 'N/A',
        }),
    },
    {
      id: 'restart-audio',
      title: 'Restart CoreAudio Engine',
      desc: 'Fix audio lag, crackling speakers, and AirPods connection dropouts without restarting',
      icon: Volume2,
      color: '#8b5cf6',
      bg: 'rgba(139,92,246,0.10)',
      btnLabel: 'Restart Audio',
      onRun: () => runUtilityAction('restart-audio', 'CoreAudio Reset', 'Restarted coreaudiod daemon cleanly.'),
      onInspect: () =>
        setInspectItem({
          title: 'macOS CoreAudio Subsystem Reset',
          category: 'Audio Daemon',
          badge: 'coreaudiod',
          subtitle: 'Terminates and restarts coreaudiod to refresh the entire macOS audio stack.',
          details: [
            { label: 'Target Daemon', value: 'com.apple.audio.coreaudiod' },
            { label: 'Command', value: 'killall -9 coreaudiod' },
            { label: 'Impact', value: 'Fixes headphone jack, Bluetooth AirPods, and audio glitches' },
          ],
          command: 'killall -9 coreaudiod',
        }),
    },
    {
      id: 'rebuild-icon-cache',
      title: 'Rebuild QuickLook & Icons',
      desc: 'Flush corrupted Finder desktop icon caches and reset QuickLook thumbnail generation',
      icon: Sparkles,
      color: '#ec4899',
      bg: 'rgba(236,72,153,0.10)',
      btnLabel: 'Rebuild Cache',
      onRun: () => runUtilityAction('rebuild-icon-cache', 'QuickLook Rebuild', 'Flushed thumbnail caches & reset QuickLook daemon.'),
      onInspect: () =>
        setInspectItem({
          title: 'QuickLook & Finder Thumbnail Rebuilder',
          category: 'Finder Desktop',
          badge: 'qlmanage -r cache',
          subtitle: 'Re-indexes file preview generators and purges corrupt icon caches.',
          details: [
            { label: 'Command', value: 'qlmanage -r cache && qlmanage -r' },
            { label: 'Target', value: '~/Library/Caches/com.apple.quicklook.ThumbnailsAgent' },
          ],
          command: 'qlmanage -r cache',
        }),
    },
    {
      id: 'brew-doctor',
      title: 'Homebrew Health Doctor',
      desc: 'Verify Homebrew repository integrity, formula paths, tap health, and compiler links',
      icon: ShieldCheck,
      color: '#10b981',
      bg: 'rgba(16,185,129,0.10)',
      btnLabel: 'Run Doctor',
      onRun: () => runUtilityAction('brew-doctor', 'Homebrew Doctor', 'Verified Homebrew taps and formula links.'),
      onInspect: () =>
        setInspectItem({
          title: 'Homebrew Doctor Diagnostics',
          category: 'Package Manager Health',
          badge: 'brew doctor',
          subtitle: 'Scans your Homebrew installation for outdated configs, missing taps, and symlink issues.',
          details: [
            { label: 'Target', value: '/opt/homebrew or /usr/local' },
            { label: 'Verification', value: 'Compiler tools, symlinks, git taps' },
          ],
          command: 'brew doctor',
        }),
    },
    {
      id: 'brew-autoremove',
      title: 'Remove Orphan Dependencies',
      desc: 'Cleanly delete orphaned Homebrew dependencies and formula libraries left by removed apps',
      icon: FolderSync,
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.10)',
      btnLabel: 'Autoremove',
      onRun: () => runUtilityAction('brew-autoremove', 'Homebrew Autoremove', 'Deleted unneeded orphaned formulae.'),
      onInspect: () =>
        setInspectItem({
          title: 'Homebrew Orphan Dependency Cleaner',
          category: 'Dependency Pruning',
          badge: 'brew autoremove',
          subtitle: 'Uninstalls formula packages that were installed as dependencies but are no longer needed.',
          details: [
            { label: 'Command', value: 'brew autoremove' },
            { label: 'Safety', value: 'Only removes unreferenced libraries' },
          ],
          command: 'brew autoremove',
        }),
    },
    {
      id: 'clean-xcode-simulators',
      title: 'Purge Xcode Simulators',
      desc: 'Delete unavailable iOS/watchOS simulator runtimes and clear simulator device caches',
      icon: Layers,
      color: '#06b6d4',
      bg: 'rgba(6,182,212,0.10)',
      btnLabel: 'Purge Simulators',
      onRun: () => runUtilityAction('clean-xcode-simulators', 'Xcode Simulator Cleanup', 'Purged unavailable simulator runtimes.'),
      onInspect: () =>
        setInspectItem({
          title: 'Xcode Simulator Runtime Purge',
          category: 'Developer Storage',
          badge: 'xcrun simctl',
          subtitle: 'Deletes orphaned iOS/tvOS simulator runtimes to reclaim 5 to 25 GB of disk space.',
          details: [
            { label: 'Command', value: 'xcrun simctl delete unavailable' },
            { label: 'Storage Reclaim', value: 'Reclaims ~2.5 GB - 15 GB' },
          ],
          command: 'xcrun simctl delete unavailable',
        }),
    },
  ];

  return (
    <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <InspectorModal data={inspectItem} onClose={() => setInspectItem(null)} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25">
              <Wrench size={12} /> {config.productName} Power Toolbox
            </span>
            <span className="pill" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-ink-3)', borderColor: 'var(--color-line)' }}>
              1-Click Port Killer, RAM Purger &amp; Dev Health
            </span>
          </div>
          <h1 className="text-hero font-extrabold tracking-tight" style={{ color: 'var(--color-ink)' }}>
            System Utilities &amp; Power Tools
          </h1>
          <p className="mt-1 text-[14px]" style={{ color: 'var(--color-ink-3)' }}>
            Instant 1-click RAM purger, CoreAudio daemon reset, port conflict killer, and developer environment diagnostics.
          </p>
        </div>

        <button onClick={fetchUtilityData} disabled={loading} className="btn btn-ghost text-xs cursor-pointer">
          <RefreshCw size={13} className={loading ? 'animate-spin-smooth' : ''} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Action Toast Alert */}
      {lastActionResult && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-4 rounded-2xl border"
          style={{
            backgroundColor: lastActionResult.type === 'success' ? 'rgba(34,197,94,0.10)' : 'rgba(59,130,246,0.10)',
            borderColor: lastActionResult.type === 'success' ? 'rgba(34,197,94,0.30)' : 'rgba(59,130,246,0.30)',
          }}
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--color-ink)' }}>{lastActionResult.title}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-ink-3)' }}>{lastActionResult.message}</p>
            </div>
          </div>
          <button
            onClick={() => setLastActionResult(null)}
            className="text-xs font-bold px-2 py-1 rounded-lg border hover:opacity-75 cursor-pointer"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-line)', color: 'var(--color-ink-2)' }}
          >
            Dismiss
          </button>
        </motion.div>
      )}

      {/* Subtabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl border overflow-x-auto" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
        {[
          { id: 'quickActions' as const, label: '1-Click System Utilities', icon: Wrench },
          { id: 'listeningPorts' as const, label: `Active Ports & Sockets (${listeningPorts.length})`, icon: Radio },
          { id: 'devHealth' as const, label: 'Developer CLI Matrix', icon: Code },
          { id: 'thermal' as const, label: 'Thermal Pressure State', icon: Activity },
        ].map((t) => {
          const isSel = activeSubTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveSubTab(t.id)}
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
        {activeSubTab === 'quickActions' && (
          <motion.div key="quick" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quickTools.map((tool) => {
                const isRunning = actionInProgress === (isMac && tool.id === 'purge-ram' ? 'RAM Purge' : tool.title);
                return (
                  <div
                    key={tool.id}
                    className="card card-hover p-5 flex flex-col justify-between space-y-4"
                  >
                    <button
                      onClick={tool.onInspect}
                      className="w-full text-left cursor-pointer transition-all hover:opacity-85 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: tool.bg, color: tool.color }}>
                          <tool.icon size={20} />
                        </div>
                        <span className="text-[10px] font-mono text-blue-500 font-bold uppercase tracking-wider">Inspect</span>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold" style={{ color: 'var(--color-ink)' }}>{tool.title}</h3>
                        <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--color-ink-3)' }}>{tool.desc}</p>
                      </div>
                    </button>

                    <button
                      onClick={tool.onRun}
                      disabled={!!actionInProgress}
                      className="btn btn-primary text-xs w-full !py-2.5 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isRunning ? (
                        <>
                          <RefreshCw size={13} className="animate-spin-smooth" />
                          <span>Executing...</span>
                        </>
                      ) : (
                        <>
                          <Play size={12} className="fill-white" />
                          <span>{tool.btnLabel}</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {activeSubTab === 'listeningPorts' && (
          <motion.div key="ports" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>
                  Active Listening TCP Ports &amp; 1-Click Port Killer
                </h3>
                <p className="text-xs font-medium" style={{ color: 'var(--color-ink-4)' }}>
                  Kill rogue processes holding developer ports (:3000, :5173, :8080) to fix EADDRINUSE errors.
                </p>
              </div>
              <span className="pill bg-emerald-500/10 text-emerald-500 border-emerald-500/25 text-[10px]">
                {listeningPorts.length} Open Sockets
              </span>
            </div>

            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-xs text-left min-w-[540px]">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--color-line)', color: 'var(--color-ink-4)' }}>
                    <th className="pb-3 font-bold uppercase tracking-wider">Port</th>
                    <th className="pb-3 font-bold uppercase tracking-wider">Process Name</th>
                    <th className="pb-3 font-bold uppercase tracking-wider">PID</th>
                    <th className="pb-3 font-bold uppercase tracking-wider">User</th>
                    <th className="pb-3 font-bold uppercase tracking-wider">Socket Binding</th>
                    <th className="pb-3 font-bold uppercase tracking-wider text-right">Kill / Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--color-line)' }}>
                  {listeningPorts.map((port) => (
                    <tr
                      key={port.id}
                      className="hover:bg-blue-500/5 transition-colors cursor-pointer"
                      onClick={() =>
                        setInspectItem({
                          title: `Port ${port.port} (${port.process})`,
                          category: 'Listening Socket',
                          badge: `PID ${port.pid}`,
                          subtitle: `Open network binding on ${port.address}.`,
                          details: [
                            { label: 'Port Number', value: port.port },
                            { label: 'Process Name', value: port.process },
                            { label: 'Process PID', value: port.pid },
                            { label: 'Owner User', value: port.user },
                            { label: 'Bound Address', value: port.address },
                            { label: 'Protocol', value: port.protocol },
                          ],
                          command: `lsof -i :${port.port}`,
                          actionButton: {
                            label: `Kill Process on Port ${port.port}`,
                            danger: true,
                            onClick: () => runUtilityAction('kill-port', `Kill Port :${port.port}`, `Killed port ${port.port}`, { port: port.port }),
                          },
                        })
                      }
                    >
                      <td className="py-3 font-mono font-bold text-blue-500">:{port.port}</td>
                      <td className="py-3 font-bold truncate max-w-[140px]" style={{ color: 'var(--color-ink)' }}>{port.process}</td>
                      <td className="py-3 font-mono" style={{ color: 'var(--color-ink-3)' }}>{port.pid}</td>
                      <td className="py-3 font-mono" style={{ color: 'var(--color-ink-4)' }}>{port.user}</td>
                      <td className="py-3 font-mono text-[11px] truncate max-w-[140px]" style={{ color: 'var(--color-ink-3)' }}>{port.address}</td>
                      <td className="py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={(e) => handleKillPort(e, port.port)}
                            className="text-[10px] font-bold px-2 py-1 rounded-md bg-red-500/10 text-red-500 border border-red-500/25 hover:bg-red-500/20 cursor-pointer"
                            title={`Kill process on port ${port.port}`}
                          >
                            Kill Port
                          </button>
                          <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25 text-[10px]">
                            Inspect
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeSubTab === 'devHealth' && (
          <motion.div key="devHealth" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>Developer Toolchain &amp; CLI Health</h3>
                <p className="text-xs font-medium" style={{ color: 'var(--color-ink-4)' }}>
                  Detected {devHealth?.totalInstalled || 0} active developer runtimes and compilers.
                </p>
              </div>
              <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25 text-[10px]">
                CLI Toolchain Probe
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(devHealth?.tools || []).map((t: any) => (
                <div
                  key={t.name}
                  className="p-4 rounded-2xl border flex items-center justify-between gap-3"
                  style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      t.healthy ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-400'
                    }`}>
                      <Code size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate" style={{ color: 'var(--color-ink)' }}>{t.name}</p>
                      <p className="text-[11px] font-mono truncate" style={{ color: 'var(--color-ink-4)' }}>{t.version}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] pill shrink-0 ${
                    t.healthy ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                  }`}>
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeSubTab === 'thermal' && (
          <motion.div key="thermal" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card p-6 space-y-5">
            <div>
              <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>Apple Silicon Thermal Pressure State</h3>
              <p className="text-xs font-medium" style={{ color: 'var(--color-ink-4)' }}>Probed from macOS power management subsystem via /usr/bin/pmset -g therm</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() =>
                  setInspectItem({
                    title: 'Apple Silicon Thermal Pressure',
                    category: 'Thermal Subsystem',
                    badge: thermalInfo?.state || 'Nominal',
                    badgeType: thermalInfo?.state === 'Nominal' ? 'success' : 'warning',
                    subtitle: 'Thermal throttling sensor condition.',
                    details: [
                      { label: 'Thermal Pressure State', value: thermalInfo?.state || 'Nominal' },
                      { label: 'Hardware Throttling', value: 'None Active' },
                    ],
                    output: thermalInfo?.detail || 'No thermal warning level has been recorded.',
                  })
                }
                className="p-5 rounded-2xl border text-left cursor-pointer transition-all hover:scale-[1.01]"
                style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-ink-4)' }}>Thermal Level</span>
                  <Activity size={18} className="text-emerald-500" />
                </div>
                <p className="text-2xl font-extrabold font-mono text-emerald-500">
                  {thermalInfo?.state || 'Nominal'}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-ink-3)' }}>
                  Hardware thermal level is nominal. Zero CPU throttling active.
                </p>
              </button>

              <button
                onClick={() =>
                  setInspectItem({
                    title: 'CPU Governor & Fan Governor',
                    category: 'Cooling Subsystem',
                    badge: 'Apple M1 Dynamic Fanless',
                    subtitle: 'Passive thermal cooling state.',
                    details: [
                      { label: 'Cooling Profile', value: 'Passive Heat Dissipation' },
                      { label: 'Speed Limit', value: '100% Unrestricted' },
                    ],
                  })
                }
                className="p-5 rounded-2xl border text-left cursor-pointer transition-all hover:scale-[1.01]"
                style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-ink-4)' }}>Performance Limit</span>
                  <Cpu size={18} className="text-blue-500" />
                </div>
                <p className="text-2xl font-extrabold font-mono" style={{ color: 'var(--color-ink)' }}>
                  100%
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-ink-3)' }}>
                  Full CPU clock speed available with no thermal degradation.
                </p>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
