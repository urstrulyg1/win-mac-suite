import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Activity, AlertTriangle, ShieldCheck, HardDrive,
  Cpu, Wifi, Moon, Sparkles, MemoryStick, Layers, RefreshCw, ChevronRight
} from 'lucide-react';
import { usePlatform } from '../platform';
import InspectorModal, { type InspectorData } from './InspectorModal';

export default function SystemEventsTimeline() {
  const { config, isMac } = usePlatform();
  const [timelineData, setTimelineData] = useState<any>(null);
  const [baselineData, setBaselineData] = useState<any>(null);
  const [subTab, setSubTab] = useState<'timeline' | 'baseline'>('timeline');
  const [loading, setLoading] = useState(false);
  const [inspectItem, setInspectItem] = useState<InspectorData | null>(null);

  const fetchTimeline = async () => {
    setLoading(true);
    try {
      const [tRes, bRes] = await Promise.all([
        fetch('http://127.0.0.1:3131/api/diagnostics/system-timeline').catch(() => null),
        fetch('http://127.0.0.1:3131/api/diagnostics/baseline-diff').catch(() => null),
      ]);

      if (tRes && tRes.ok) setTimelineData(await tRes.json());
      if (bRes && bRes.ok) setBaselineData(await bRes.json());
    } catch {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, []);

  return (
    <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <InspectorModal data={inspectItem} onClose={() => setInspectItem(null)} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25">
              <Clock size={12} /> System Events &amp; Baseline Intelligence
            </span>
            <span className="pill" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-ink-3)', borderColor: 'var(--color-line)' }}>
              "What happened before my Mac became slow?"
            </span>
          </div>
          <h1 className="text-hero font-extrabold tracking-tight" style={{ color: 'var(--color-ink)' }}>
            System Events Timeline &amp; Baseline
          </h1>
          <p className="mt-1 text-[14px]" style={{ color: 'var(--color-ink-3)' }}>
            Track chronological system lifecycle events—from wake-locks and memory pressure spikes to app crashes and storage growth deltas since your initial baseline.
          </p>
        </div>

        <button onClick={fetchTimeline} disabled={loading} className="btn btn-ghost text-xs cursor-pointer">
          <RefreshCw size={13} className={loading ? 'animate-spin-smooth' : ''} />
          <span>Refresh Timeline</span>
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl border overflow-x-auto" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
        {[
          { id: 'timeline' as const, label: 'System Events Timeline', icon: Clock },
          { id: 'baseline' as const, label: 'Mac Baseline & Proactive Alerts', icon: Activity },
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
        {subTab === 'timeline' && (
          <motion.div key="timeline" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card p-6 space-y-6">
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-line)' }}>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>
                  Chronological System Events (Past 48 Hours)
                </h3>
                <p className="text-xs text-slate-400">Correlates wake logs, high-pressure memory states, storage changes, and app crashes in real time.</p>
              </div>
            </div>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-700/50">
              {(timelineData?.events || []).map((ev: any, idx: number) => (
                <div key={idx} className="relative group">
                  {/* Dot */}
                  <div
                    className={`absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                      ev.impact === 'High'
                        ? 'bg-red-500'
                        : ev.impact === 'Warning'
                        ? 'bg-amber-500'
                        : ev.impact === 'Moderate'
                        ? 'bg-blue-500'
                        : 'bg-emerald-500'
                    }`}
                  />
                  <div
                    className="p-4 rounded-xl border space-y-1.5 transition-all hover:scale-[1.005]"
                    style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-400">{ev.time}</span>
                        <span className="pill bg-slate-500/10 text-slate-400 border-slate-500/25 text-[10px]">
                          {ev.category}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border ${
                          ev.impact === 'High' || ev.impact === 'Warning'
                            ? 'bg-red-500/10 text-red-500 border-red-500/25'
                            : ev.impact === 'Moderate'
                            ? 'bg-blue-500/10 text-blue-500 border-blue-500/25'
                            : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25'
                        }`}
                      >
                        {ev.impact} Impact
                      </span>
                    </div>
                    <p className="text-xs font-medium" style={{ color: 'var(--color-ink)' }}>
                      {ev.event}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {subTab === 'baseline' && (
          <motion.div key="baseline" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            {/* Proactive Alerts */}
            {baselineData?.proactiveAlerts?.length > 0 && (
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Proactive Anomaly &amp; Predictive Alerts
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {baselineData.proactiveAlerts.map((alt: any) => (
                    <div
                      key={alt.id}
                      className={`p-4 rounded-xl border space-y-1 ${
                        alt.severity === 'warning'
                          ? 'bg-amber-500/10 border-amber-500/25'
                          : 'bg-emerald-500/10 border-emerald-500/25'
                      }`}
                    >
                      <h4 className="text-xs font-bold" style={{ color: 'var(--color-ink)' }}>
                        {alt.title}
                      </h4>
                      <p className="text-[11px] text-slate-300">{alt.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Baseline Diff Table */}
            <div className="card p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-line)' }}>
                <div>
                  <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>
                    Mac Baseline Comparison
                  </h3>
                  <p className="text-xs text-slate-400">Baseline captured on {baselineData?.baselineCreatedDate || 'Initial Setup'} ({baselineData?.daysSinceBaseline || 9} days ago)</p>
                </div>
              </div>

              <div className="divide-y" style={{ borderColor: 'var(--color-line)' }}>
                {(baselineData?.metrics || []).map((m: any, idx: number) => (
                  <div key={idx} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold" style={{ color: 'var(--color-ink)' }}>{m.name}</p>
                      <p className="text-[10px] text-slate-500">Baseline: {m.baseline} → Current: {m.current}</p>
                    </div>
                    <span
                      className={`font-mono font-bold text-xs ${
                        m.severity === 'warning' ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {m.delta}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
