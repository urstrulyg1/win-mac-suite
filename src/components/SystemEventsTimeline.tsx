import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Activity, AlertTriangle, ShieldCheck, HardDrive,
  Cpu, Wifi, Moon, Sparkles, MemoryStick, Layers, RefreshCw,
  ChevronRight, ArrowRight, TrendingUp, HelpCircle, CheckCircle2
} from 'lucide-react';
import { usePlatform } from '../platform';
import InspectorModal, { type InspectorData } from './InspectorModal';

export default function SystemEventsTimeline() {
  const { config, isMac } = usePlatform();
  const [subTab, setSubTab] = useState<'timeline' | 'incidents' | 'baseline' | 'forecast'>('incidents');
  const [timelineData, setTimelineData] = useState<any>(null);
  const [incidentData, setIncidentData] = useState<any>(null);
  const [baselineData, setBaselineData] = useState<any>(null);
  const [forecastData, setForecastData] = useState<any>(null);
  const [selectedBaseline, setSelectedBaseline] = useState('7day');
  const [loading, setLoading] = useState(false);
  const [inspectItem, setInspectItem] = useState<InspectorData | null>(null);

  const fetchTimelineAll = async () => {
    setLoading(true);
    try {
      const [tRes, iRes, bRes, fRes] = await Promise.all([
        fetch('/api/diagnostics/system-timeline').catch(() => null),
        fetch('/api/diagnostics/correlation-incidents').catch(() => null),
        fetch(`/api/diagnostics/multi-baseline?profile=${selectedBaseline}`).catch(() => null),
        fetch('/api/diagnostics/predictive-forecast').catch(() => null),
      ]);

      if (tRes && tRes.ok) setTimelineData(await tRes.json());
      if (iRes && iRes.ok) setIncidentData(await iRes.json());
      if (bRes && bRes.ok) setBaselineData(await bRes.json());
      if (fRes && fRes.ok) setForecastData(await fRes.json());
    } catch {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimelineAll();
  }, [selectedBaseline]);

  return (
    <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <InspectorModal data={inspectItem} onClose={() => setInspectItem(null)} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25">
              <Clock size={12} /> Causal Incidents &amp; Predictive Intelligence
            </span>
            <span className="pill" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-ink-3)', borderColor: 'var(--color-line)' }}>
              Causal Grouping &amp; Multi-Baseline Forecaster Active
            </span>
          </div>
          <h1 className="text-hero font-extrabold tracking-tight" style={{ color: 'var(--color-ink)' }}>
            System Incidents, Timeline &amp; Forecast
          </h1>
          <p className="mt-1 text-[14px]" style={{ color: 'var(--color-ink-3)' }}>
            Understand complex multi-subsystem incidents through causal chain linking, compare multi-period baselines, and forecast disk capacity horizons.
          </p>
        </div>

        <button onClick={fetchTimelineAll} disabled={loading} className="btn btn-ghost text-xs cursor-pointer">
          <RefreshCw size={13} className={loading ? 'animate-spin-smooth' : ''} />
          <span>Refresh Correlation Engine</span>
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl border overflow-x-auto" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
        {[
          { id: 'incidents' as const, label: 'Causal Incidents (Correlated)', icon: Activity },
          { id: 'timeline' as const, label: 'Chronological Timeline', icon: Clock },
          { id: 'baseline' as const, label: 'Multi-Baseline Engine', icon: ShieldCheck },
          { id: 'forecast' as const, label: 'Predictive Storage Forecast', icon: TrendingUp },
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
        {subTab === 'incidents' && (
          <motion.div key="incidents" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Correlated Cross-Subsystem Incidents ({incidentData?.incidents?.length || 0})
              </h3>
              <span className="pill bg-emerald-500/10 text-emerald-500 border-emerald-500/25 text-xs font-mono font-bold">
                Causal Engine: Active
              </span>
            </div>

            {(incidentData?.incidents || []).map((inc: any) => (
              <div
                key={inc.id}
                className="card p-6 space-y-5 border-l-4 border-l-amber-500 shadow-xl"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3" style={{ borderColor: 'var(--color-line)' }}>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">{inc.timeWindow} · PERFORMANCE INCIDENT</span>
                    <h3 className="text-base font-extrabold" style={{ color: 'var(--color-ink)' }}>
                      {inc.title}
                    </h3>
                  </div>
                  <span className="pill bg-amber-500/10 text-amber-400 border-amber-500/25 text-xs font-mono font-bold">
                    Causal Relationship: {inc.relationshipStrength}
                  </span>
                </div>

                {/* Causal Chain Visualization */}
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Causal Incident Sequence</span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {(inc.chain || []).map((step: any) => (
                      <div
                        key={step.step}
                        className="p-4 rounded-xl border space-y-1 relative"
                        style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold flex items-center justify-center font-mono">
                            {step.step}
                          </span>
                          <h4 className="text-xs font-bold" style={{ color: 'var(--color-ink)' }}>{step.title}</h4>
                        </div>
                        <p className="text-[11px] text-slate-400 ml-7">{step.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Verdict & Recommended Action */}
                <div className="p-4 rounded-xl border bg-blue-500/10 border-blue-500/25 text-xs space-y-1">
                  <p className="font-bold text-blue-400">💡 Root Cause Diagnosis</p>
                  <p className="text-slate-300">{inc.verdict}</p>
                  <p className="text-emerald-400 font-medium pt-1">Recommended Fix: {inc.recommendedAction}</p>
                </div>
              </div>
            ))}
          </motion.div>
        )}

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
            {/* Multi-Baseline Selector */}
            <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Baseline Comparison Profile</span>
                <h3 className="text-sm font-bold" style={{ color: 'var(--color-ink)' }}>
                  Active: {baselineData?.activeBaseline?.name}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {(baselineData?.availableProfiles || []).map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedBaseline(p.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      selectedBaseline === p.id
                        ? 'bg-blue-500 text-white border-blue-500 shadow-md'
                        : 'border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {p.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Baseline Metrics */}
            <div className="card p-6 space-y-4">
              <div className="divide-y" style={{ borderColor: 'var(--color-line)' }}>
                {(baselineData?.metrics || []).map((m: any, idx: number) => (
                  <div key={idx} className="py-3.5 flex items-center justify-between text-xs">
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

        {subTab === 'forecast' && (
          <motion.div key="forecast" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="card p-6 space-y-4 border-l-4 border-l-emerald-500">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">STORAGE DEPLETION HORIZON</span>
                  <h3 className="text-base font-extrabold" style={{ color: 'var(--color-ink)' }}>
                    Estimated Threshold: {forecastData?.storageForecast?.estimatedDaysUntilCritical != null ? `~${forecastData.storageForecast.estimatedDaysUntilCritical} Days of Nominal Capacity` : 'Unavailable / Unsupported'}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">Average storage growth rate measured at +{forecastData?.storageForecast?.averageDailyGrowthGB || 1.4} GB / day.</p>
                </div>
                <span className="pill bg-emerald-500/10 text-emerald-500 border-emerald-500/25 text-xs font-bold font-mono">
                  {forecastData?.storageForecast?.forecastTrend ?? 'Unavailable'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card p-5 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Storage Forecast Parameters</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-slate-400">Current Free Disk:</span><span className="font-mono font-bold text-blue-400">{forecastData?.storageForecast?.currentFreeDiskGB} GB</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Critical Threshold:</span><span className="font-mono text-slate-300">{forecastData?.storageForecast?.criticalThresholdGB} GB</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Confidence:</span><span className="text-emerald-400">{forecastData?.storageForecast?.confidence}</span></div>
                </div>
              </div>

              <div className="card p-5 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Battery Aging Projection</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-slate-400">Cycle Count:</span><span className="font-mono font-bold text-blue-400">{forecastData?.batteryForecast?.cycleCount} cycles</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">6-Month Projected Capacity:</span><span className="font-mono text-emerald-400">{forecastData?.batteryForecast?.sixMonthProjectedCapacityPct}%</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Aging Trend:</span><span className="text-slate-300">{forecastData?.batteryForecast?.conditionTrend}</span></div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
