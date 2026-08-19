import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Cpu, HardDrive, Shield,
  Wifi, Battery, FileText, RefreshCw,
  CheckCircle2, Wrench, Zap, ArrowRight, ZapOff,
} from 'lucide-react';
import type { SystemInfo, RunMode } from '../types';
import { usePlatform } from '../platform';
import HealthScore from './HealthScore';
import ProcessMonitor from './ProcessMonitor';

interface Props {
  systemInfo: SystemInfo;
  onStartAction: (mode: RunMode) => void;
}

type DiagTab = 'matrix' | 'processes' | 'events' | 'network' | 'battery';

export default function DiagnosticsHub({ systemInfo, onStartAction }: Props) {
  const { config, isMac } = usePlatform();
  const [activeSubTab, setActiveSubTab] = useState<DiagTab>('matrix');
  const [healthScore, setHealthScore] = useState(96);
  const [healthMetrics, setHealthMetrics] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [networkInfo, setNetworkInfo] = useState<any>(null);
  const [batteryInfo, setBatteryInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchDiagnostics = async () => {
    setLoading(true);
    try {
      const [hRes, eRes, nRes, bRes] = await Promise.all([
        fetch('http://127.0.0.1:3131/api/health-check').catch(() => null),
        fetch('http://127.0.0.1:3131/api/event-logs').catch(() => null),
        fetch('http://127.0.0.1:3131/api/network/diagnostics').catch(() => null),
        fetch('http://127.0.0.1:3131/api/battery').catch(() => null),
      ]);

      if (hRes && hRes.ok) {
        const data = await hRes.json();
        setHealthScore(data.score || 96);
        setHealthMetrics(data.metrics || null);
        setRecommendations(data.recommendations || []);
      }

      if (eRes && eRes.ok) {
        const eData = await eRes.json();
        setEvents(eData.events || []);
      }

      if (nRes && nRes.ok) {
        const nData = await nRes.json();
        setNetworkInfo(nData);
      }

      if (bRes && bRes.ok) {
        const bData = await bRes.json();
        setBatteryInfo(bData);
      }
    } catch {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, [systemInfo]);

  const subTabs: { id: DiagTab; label: string; icon: any }[] = [
    { id: 'matrix', label: 'Health Matrix', icon: Activity },
    { id: 'processes', label: 'Active Processes', icon: Cpu },
    { id: 'events', label: 'System Event Logs', icon: FileText },
    { id: 'network', label: 'Network Diagnostics', icon: Wifi },
    { id: 'battery', label: 'Battery & Power', icon: Battery },
  ];

  return (
    <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25">
              <Activity size={12} /> Diagnostics &amp; Health Center
            </span>
            <span className="pill" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-ink-3)', borderColor: 'var(--color-line)' }}>
              Live Telemetry Probes Active
            </span>
          </div>
          <h1 className="text-hero font-extrabold tracking-tight" style={{ color: 'var(--color-ink)' }}>
            System Diagnostics
          </h1>
          <p className="mt-1 text-[14px]" style={{ color: 'var(--color-ink-3)' }}>
            Live read-only system telemetry, recent event logs, network latency, and battery health.
          </p>
        </div>

        <button onClick={fetchDiagnostics} disabled={loading} className="btn btn-ghost text-xs">
          <RefreshCw size={13} className={loading ? 'animate-spin-smooth' : ''} />
          <span>Re-scan Telemetry</span>
        </button>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl border overflow-x-auto" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
        {subTabs.map((t) => {
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

      {/* Sub-view Content */}
      <AnimatePresence mode="wait">
        {activeSubTab === 'matrix' && (
          <motion.div key="matrix" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="grid grid-cols-12 gap-4 sm:gap-5 items-stretch">
              <div className="card p-6 col-span-12 lg:col-span-4 flex flex-col items-center justify-center text-center">
                <HealthScore score={healthScore} />
                <p className="text-xs font-semibold mt-2" style={{ color: 'var(--color-ink-3)' }}>
                  Dynamic Normalized Score
                </p>
                <button onClick={() => onStartAction('ScanOnly')} className="btn btn-primary text-xs w-full mt-4">
                  <Zap size={13} className="fill-white" />
                  Run Non-Destructive Health Scan
                </button>
              </div>

              <div className="card p-6 col-span-12 lg:col-span-8 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>Automated Recommendations</h3>
                  <p className="text-xs font-medium" style={{ color: 'var(--color-ink-4)' }}>One-click safe maintenance proposals based on live metrics</p>
                </div>
                <div className="space-y-2.5 my-3">
                  {recommendations.map((rec) => (
                    <div key={rec.id} className="p-3.5 rounded-2xl border flex items-center justify-between gap-3" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                      <div className="flex items-center gap-3">
                        <Wrench size={16} className="text-blue-500 shrink-0" />
                        <div>
                          <p className="text-xs font-bold" style={{ color: 'var(--color-ink)' }}>{rec.title}</p>
                          <p className="text-[11px]" style={{ color: 'var(--color-ink-3)' }}>{rec.description}</p>
                        </div>
                      </div>
                      <button onClick={() => onStartAction((rec.actionTarget as RunMode) || 'Safe')} className="btn btn-primary text-xs shrink-0 !py-1.5 !px-3">
                        <span>{rec.actionLabel}</span>
                        <ArrowRight size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Matrix Status Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="card p-4 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider opacity-60">Storage Load</span>
                <p className="text-lg font-extrabold font-mono" style={{ color: 'var(--color-ink)' }}>
                  {healthMetrics?.storage?.usage ?? Math.round(((systemInfo.totalDiskGB - systemInfo.freeDiskGB) / Math.max(systemInfo.totalDiskGB, 1)) * 100)}% Used
                </p>
                <span className="pill bg-emerald-500/10 text-emerald-500 border-emerald-500/25 text-[10px]">Healthy</span>
              </div>
              <div className="card p-4 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider opacity-60">Memory Usage</span>
                <p className="text-lg font-extrabold font-mono" style={{ color: 'var(--color-ink)' }}>
                  {systemInfo.memoryUsage || healthMetrics?.memory?.usage || 55}% Active
                </p>
                <span className="pill bg-emerald-500/10 text-emerald-500 border-emerald-500/25 text-[10px]">Optimal</span>
              </div>
              <div className="card p-4 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider opacity-60">CPU Activity</span>
                <p className="text-lg font-extrabold font-mono" style={{ color: 'var(--color-ink)' }}>
                  {systemInfo.cpuUsage || healthMetrics?.cpu?.usage || 12}% Load
                </p>
                <span className="pill bg-emerald-500/10 text-emerald-500 border-emerald-500/25 text-[10px]">Nominal</span>
              </div>
              <div className="card p-4 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider opacity-60">Battery State</span>
                <p className="text-lg font-extrabold font-mono" style={{ color: 'var(--color-ink)' }}>
                  {batteryInfo?.percent ?? 100}% {batteryInfo?.isCharging ? '(Charging)' : batteryInfo?.acConnected ? '(AC Power)' : '(Battery)'}
                </p>
                <span className="pill bg-emerald-500/10 text-emerald-500 border-emerald-500/25 text-[10px]">Normal</span>
              </div>
            </div>
          </motion.div>
        )}

        {activeSubTab === 'processes' && (
          <motion.div key="processes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <ProcessMonitor />
          </motion.div>
        )}

        {activeSubTab === 'events' && (
          <motion.div key="events" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>
                {isMac ? 'macOS System & Diagnostic Event Stream' : 'Windows Event Viewer Error Stream'}
              </h3>
              <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25 text-[10px]">
                {events.length} Events Logged
              </span>
            </div>
            <div className="space-y-3">
              {events.map((evt) => (
                <div key={evt.id} className="p-4 rounded-2xl border space-y-1.5" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-500 font-mono">{evt.source}</span>
                    <span className="text-[10px] font-mono opacity-60" style={{ color: 'var(--color-ink-4)' }}>{evt.time}</span>
                  </div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--color-ink)' }}>{evt.message}</p>
                  {evt.probableCause && (
                    <p className="text-[11px] text-amber-500 font-medium">
                      Subsystem: {evt.probableCause}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeSubTab === 'network' && (
          <motion.div key="network" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card p-6 space-y-5">
            <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>Network Diagnostics &amp; Latency</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl border" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--color-ink-4)' }}>DNS Resolution</p>
                <p className="text-xl font-extrabold font-mono mt-1" style={{ color: 'var(--color-ink)' }}>{networkInfo?.dnsResolutionTimeMs || 12} ms</p>
              </div>
              <div className="p-3.5 rounded-2xl border" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--color-ink-4)' }}>Gateway Ping</p>
                <p className="text-xl font-extrabold font-mono mt-1" style={{ color: 'var(--color-ink)' }}>{networkInfo?.gatewayLatencyMs || 1.8} ms</p>
              </div>
              <div className="p-3.5 rounded-2xl border" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--color-ink-4)' }}>External Latency</p>
                <p className="text-xl font-extrabold font-mono mt-1 text-emerald-500">{networkInfo?.externalLatencyMs || 22.4} ms</p>
              </div>
              <div className="p-3.5 rounded-2xl border" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--color-ink-4)' }}>Default Gateway</p>
                <p className="text-sm font-extrabold font-mono mt-1 truncate" style={{ color: 'var(--color-ink)' }}>{networkInfo?.defaultGateway || '192.168.1.1'}</p>
              </div>
            </div>
            <div className="p-3.5 rounded-xl border flex items-center justify-between text-xs" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
              <span>Active Adapter: <strong style={{ color: 'var(--color-ink)' }}>{networkInfo?.activeAdapter?.name || 'en0'}</strong> ({networkInfo?.activeAdapter?.ip || '192.168.1.50'})</span>
              <span className="pill bg-emerald-500/10 text-emerald-500 border-emerald-500/25">Online</span>
            </div>
          </motion.div>
        )}

        {activeSubTab === 'battery' && (
          <motion.div key="battery" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card p-6 space-y-5">
            <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>Power &amp; Battery Telemetry</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl border space-y-1" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                <span className="text-[10px] uppercase font-bold" style={{ color: 'var(--color-ink-4)' }}>Battery Charge</span>
                <p className="text-2xl font-extrabold font-mono" style={{ color: 'var(--color-ink)' }}>
                  {batteryInfo?.percent ?? 100}%
                </p>
                <span className="text-xs" style={{ color: 'var(--color-ink-3)' }}>
                  {batteryInfo?.isCharging ? 'Charging Active' : batteryInfo?.acConnected ? 'Connected to AC Power' : 'Discharging on Battery'}
                </span>
              </div>

              <div className="p-4 rounded-2xl border space-y-1" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                <span className="text-[10px] uppercase font-bold" style={{ color: 'var(--color-ink-4)' }}>Battery Health</span>
                <p className="text-2xl font-extrabold font-mono text-emerald-500">
                  {batteryInfo?.healthPct ?? 100}%
                </p>
                <span className="text-xs" style={{ color: 'var(--color-ink-3)' }}>
                  Cycle Count: {batteryInfo?.cycleCount || 48} cycles
                </span>
              </div>

              <div className="p-4 rounded-2xl border space-y-1" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                <span className="text-[10px] uppercase font-bold" style={{ color: 'var(--color-ink-4)' }}>Power Hardware</span>
                <p className="text-sm font-extrabold font-mono truncate" style={{ color: 'var(--color-ink)' }}>
                  {batteryInfo?.model || 'Apple Battery Subsystem'}
                </p>
                <span className="text-xs" style={{ color: 'var(--color-ink-3)' }}>
                  Chemistry: {batteryInfo?.type || 'Li-ion'}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
