import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { tabTransition } from '../motion';
import {
  Activity, Cpu,
  Battery, FileText, RefreshCw,
  Search, Moon
} from 'lucide-react';
import type { SystemInfo, RunMode } from '../types';
import { usePlatform } from '../platform';
import HealthScore from './HealthScore';
import ProcessMonitor from './ProcessMonitor';
import InspectorModal, { type InspectorData } from './InspectorModal';

interface Props {
  systemInfo: SystemInfo;
  onStartAction: (mode: RunMode) => void;
}

type DiagTab = 'matrix' | 'battery' | 'processes' | 'events' | 'spotlight';

export default function DiagnosticsHub({ systemInfo: _systemInfo, onStartAction: _onStartAction }: Props) {
  const { isMac } = usePlatform();
  const [activeSubTab, setActiveSubTab] = useState<DiagTab>('matrix');
  const [healthScore, setHealthScore] = useState<number | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [batteryIntelligence, setBatteryIntelligence] = useState<any>(null);
  const [spotlightInfo, setSpotlightInfo] = useState<any>(null);
  const [powerAssertions, setPowerAssertions] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [inspectItem, setInspectItem] = useState<InspectorData | null>(null);

  const fetchDiagnostics = async () => {
    setLoading(true);
    try {
      const [hRes, eRes, bRes, sRes, pRes] = await Promise.all([
        fetch('/api/health-check').catch(() => null),
        fetch('/api/event-logs').catch(() => null),
        fetch('/api/battery/intelligence').catch(() => null),
        fetch('/api/spotlight').catch(() => null),
        fetch('/api/power-assertions').catch(() => null),
      ]);

      if (hRes && hRes.ok) {
        const data = await hRes.json();
        if (typeof data.score === 'number') setHealthScore(data.score);
      }
      if (eRes && eRes.ok) {
        const eData = await eRes.json();
        setEvents(eData.events || []);
      }
      if (bRes && bRes.ok) {
        const bData = await bRes.json();
        setBatteryIntelligence(bData);
      }
      if (sRes && sRes.ok) {
        const sData = await sRes.json();
        setSpotlightInfo(sData);
      }
      if (pRes && pRes.ok) {
        const pData = await pRes.json();
        setPowerAssertions(pData);
      }
    } catch {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subTabs: { id: DiagTab; label: string; icon: any; color: string }[] = [
    { id: 'matrix',    label: 'Health Matrix',                        icon: Activity,  color: '#34d399' },
    { id: 'battery',   label: isMac ? 'Battery Intelligence & Sleep Timeline' : 'Power & Battery Diagnostics', icon: Battery, color: '#facc15' },
    { id: 'processes', label: 'Active Processes & Threads',            icon: Cpu,       color: '#a78bfa' },
    { id: 'events',    label: 'System Event Logs',                     icon: FileText,  color: '#60a5fa' },
    ...(isMac ? [{ id: 'spotlight' as DiagTab, label: 'Spotlight Indexer', icon: Search, color: '#fb923c' }] : []),
  ];

  return (
    <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <InspectorModal data={inspectItem} onClose={() => setInspectItem(null)} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25">
              <Activity size={12} /> Diagnostics &amp; Health Center
            </span>
            <span className="pill" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-ink-3)', borderColor: 'var(--color-line)' }}>
              {isMac ? 'Native macOS Probes & Sleep Guardian Active' : 'Native Windows Diagnostics & System Health'}
            </span>
          </div>
          <h1 className="text-hero font-extrabold tracking-tight" style={{ color: 'var(--color-ink)' }}>
            {isMac ? 'System Diagnostics & Sleep Guardian' : 'System Diagnostics & Health Center'}
          </h1>
          <p className="mt-1 text-[14px]" style={{ color: 'var(--color-ink-3)' }}>
            {isMac
              ? 'Live read-only system telemetry, hourly battery drain timeline, overnight sleep drain diagnostics, and power assertion blockers.'
              : 'Live read-only system telemetry, battery and power states, active processes, and Windows event log analysis.'}
          </p>
        </div>

        <button onClick={fetchDiagnostics} disabled={loading} className="btn btn-ghost text-xs cursor-pointer">
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

      {/* Sub-views */}
      <AnimatePresence mode="wait">
        {activeSubTab === 'matrix' && (
          <motion.div key="matrix" {...tabTransition} className="space-y-6">
            {healthScore === null ? (
              <div className="card p-8 flex items-center justify-center">
                <span className="text-sm text-slate-400">Loading health score…</span>
              </div>
            ) : (
              <HealthScore score={healthScore} />
            )}
          </motion.div>
        )}

        {activeSubTab === 'battery' && (
          <motion.div key="battery" {...tabTransition} className="space-y-6">
            {/* Overnight Sleep Drain Verdict Card */}
            <div className="card p-6 space-y-4 border-l-4 border-l-emerald-500">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 flex items-center justify-center">
                    <Moon size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      OVERNIGHT SLEEP DRAIN &amp; WAKE DIAGNOSIS
                    </span>
                    <h3 className="text-base font-extrabold" style={{ color: 'var(--color-ink)' }}>
                      {batteryIntelligence?.sleepDrainVerdict ?? 'UNAVAILABLE: sleep-drain probe has not returned data.'}
                    </h3>
                  </div>
                </div>
                <span className="pill bg-emerald-500/10 text-emerald-500 border-emerald-500/25 text-xs font-bold font-mono">
                  Condition: {batteryIntelligence?.healthPct ?? 'UNAVAILABLE'}{batteryIntelligence?.healthPct != null ? '% Maximum Capacity' : ' Maximum Capacity: UNAVAILABLE'}
                </span>
              </div>
            </div>

            {/* Hourly Drain Timeline */}
            <div className="card p-6 space-y-4">
              <h3 className="text-sm font-bold" style={{ color: 'var(--color-ink)' }}>
                Battery Drain Timeline
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {(batteryIntelligence?.drainTimeline || []).map((pt: any, idx: number) => (
                  <div key={idx} className="p-3.5 rounded-xl border text-center space-y-1" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                    <span className="text-[10px] uppercase font-bold text-slate-400">{pt.time}</span>
                    <p className="text-base font-extrabold font-mono text-blue-500">{pt.percent}%</p>
                    <p className="text-[10px] text-slate-400 truncate">{pt.majorDrain}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Wake History & Reasons */}
            <div className="card p-6 space-y-4">
              <h3 className="text-sm font-bold" style={{ color: 'var(--color-ink)' }}>
                Recent Sleep Duration &amp; Wake Reasons
              </h3>
              <div className="divide-y" style={{ borderColor: 'var(--color-line)' }}>
                {(batteryIntelligence?.wakeReasons || []).map((w: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-xs font-bold" style={{ color: 'var(--color-ink)' }}>{w.reason}</p>
                      <p className="text-[10px] text-slate-500">Duration: {w.sleepDuration} · Battery Delta: -{w.batteryLost}</p>
                    </div>
                    <span className="text-xs font-mono text-slate-400">{w.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Power Assertions / Sleep Blockers */}
            <div className="card p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-line)' }}>
                <h3 className="text-sm font-bold" style={{ color: 'var(--color-ink)' }}>
                  Active Power Assertions (Sleep Blockers)
                </h3>
                <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25 text-[10px]">
                  {powerAssertions?.activeBlockers?.length || 0} Active Wake-Locks
                </span>
              </div>
              {powerAssertions?.activeBlockers?.length > 0 ? (
                <div className="space-y-2">
                  {powerAssertions.activeBlockers.map((b: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-xl border flex items-center justify-between" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                      <div>
                        <span className="text-xs font-bold" style={{ color: 'var(--color-ink)' }}>{b.name} (PID {b.pid})</span>
                        <p className="text-[10px] text-slate-400">{b.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  {powerAssertions == null ? 'UNAVAILABLE: power-assertion probe has not returned data.' : (isMac ? 'No sleep blockers observed in the latest probe.' : 'No sleep blockers observed in the latest probe.')}
                </p>
              )}
            </div>
          </motion.div>
        )}

        {activeSubTab === 'processes' && (
          <motion.div key="processes" {...tabTransition}>
            <ProcessMonitor />
          </motion.div>
        )}

        {activeSubTab === 'events' && (
          <motion.div key="events" {...tabTransition} className="card p-6 space-y-4">
            <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>
              Unified System Diagnostic Logs
            </h3>
            <div className="divide-y" style={{ borderColor: 'var(--color-line)' }}>
              {events.map((evt) => (
                <div key={evt.id} className="py-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-400 font-mono">{evt.source}</span>
                    <span className="text-[10px] text-slate-500">{evt.time}</span>
                  </div>
                  <p className="text-xs text-slate-300">{evt.message}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {isMac && activeSubTab === 'spotlight' && (
          <motion.div key="spotlight" {...tabTransition} className="card p-6 space-y-4">
            <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>
              Spotlight Metadata Indexing Engine
            </h3>
            <p className="text-xs text-slate-400">Volume: {spotlightInfo?.volume ?? 'UNAVAILABLE'} · Status: {spotlightInfo?.statusText ?? 'UNAVAILABLE'}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
