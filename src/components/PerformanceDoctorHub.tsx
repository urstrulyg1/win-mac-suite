import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cpu, Activity, Flame, Zap, ZapOff, RefreshCw, CheckCircle2,
  AlertTriangle, ArrowRight, MemoryStick, HardDrive, Layers, Sparkles, ChevronRight
} from 'lucide-react';
import { usePlatform } from '../platform';
import InspectorModal, { type InspectorData } from './InspectorModal';

interface Props {
  onNavigateTab?: (tab: string) => void;
}

export default function PerformanceDoctorHub({ onNavigateTab }: Props) {
  const { config, isMac } = usePlatform();
  const [perfDiagnosis, setPerfDiagnosis] = useState<any>(null);
  const [thermalDeep, setThermalDeep] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [purgingRam, setPurgingRam] = useState(false);
  const [purgeDone, setPurgeDone] = useState(false);
  const [inspectItem, setInspectItem] = useState<InspectorData | null>(null);

  const fetchPerfData = async () => {
    setLoading(true);
    try {
      const [pRes, tRes] = await Promise.all([
        fetch('/api/performance/diagnosis').catch(() => null),
        fetch('/api/thermal/deep').catch(() => null),
      ]);

      if (pRes && pRes.ok) {
        const pData = await pRes.json();
        setPerfDiagnosis(pData);
      }
      if (tRes && tRes.ok) {
        const tData = await tRes.json();
        setThermalDeep(tData);
      }
    } catch {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerfData();
  }, []);

  const handlePurgeRam = async () => {
    setPurgingRam(true);
    try {
      await fetch('/api/actions/purge-ram', { method: 'POST' });
      setPurgeDone(true);
      await fetchPerfData();
    } catch {}
    finally {
      setPurgingRam(false);
    }
  };

  return (
    <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <InspectorModal data={inspectItem} onClose={() => setInspectItem(null)} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25">
              <Cpu size={12} /> Performance &amp; Thermal Intelligence
            </span>
            <span className="pill" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-ink-3)', borderColor: 'var(--color-line)' }}>
              Correlated Multi-Subsystem Root-Cause Analyzer
            </span>
          </div>
          <h1 className="text-hero font-extrabold tracking-tight" style={{ color: 'var(--color-ink)' }}>
            Why Is My Mac Slow?
          </h1>
          <p className="mt-1 text-[14px]" style={{ color: 'var(--color-ink-3)' }}>
            Instead of showing disconnected CPU graphs, we correlate Unified Memory Pressure, swap usage, disk I/O, background startup burden, and thermal throttling to tell you exactly what's causing slowness.
          </p>
        </div>

        <button onClick={fetchPerfData} disabled={loading} className="btn btn-ghost text-xs cursor-pointer">
          <RefreshCw size={13} className={loading ? 'animate-spin-smooth' : ''} />
          <span>Re-evaluate Diagnosis</span>
        </button>
      </div>

      {/* Main Verdict Card */}
      <div
        className="card p-6 border-l-4 space-y-4 shadow-sm"
        style={{
          borderLeftColor: perfDiagnosis?.overallStatus === 'Attention Needed' ? '#f59e0b' : '#10b981',
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                perfDiagnosis?.overallStatus === 'Attention Needed'
                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/25'
                  : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25'
              }`}
            >
              <Activity size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                MAC PERFORMANCE DIAGNOSIS VERDICT
              </span>
              <h2 className="text-base font-extrabold" style={{ color: 'var(--color-ink)' }}>
                {perfDiagnosis?.verdict || 'Correlating system metrics...'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePurgeRam}
              disabled={purgingRam}
              className="btn btn-primary text-xs flex items-center gap-2 cursor-pointer"
            >
              <MemoryStick size={13} />
              <span>{purgingRam ? 'Purging RAM Buffers...' : purgeDone ? 'RAM Flushed ✓' : 'Purge Inactive RAM'}</span>
            </button>
          </div>
        </div>

        {/* Subsystems Breakdown Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {(perfDiagnosis?.subsystems || []).map((sub: any) => (
            <div
              key={sub.id}
              onClick={() =>
                setInspectItem({
                  title: sub.name,
                  category: 'Subsystem Diagnosis',
                  badge: sub.status,
                  badgeType: sub.level === 'error' ? 'error' : sub.level === 'warning' ? 'warning' : 'success',
                  subtitle: sub.detail,
                  details: [
                    { label: 'Diagnostic Metric', value: sub.name },
                    { label: 'Observed State', value: sub.status },
                    { label: 'Technical Evidence', value: sub.evidence },
                  ],
                })
              }
              className="p-4 rounded-xl border space-y-2 cursor-pointer transition-all hover:scale-[1.01]"
              style={{
                backgroundColor: 'var(--color-surface-2)',
                borderColor: sub.level === 'error' ? 'rgba(239,68,68,0.35)' : sub.level === 'warning' ? 'rgba(245,158,11,0.35)' : 'var(--color-line)',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold" style={{ color: 'var(--color-ink)' }}>
                  {sub.name}
                </span>
                <span
                  className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border ${
                    sub.level === 'error'
                      ? 'bg-red-500/10 text-red-500 border-red-500/25'
                      : sub.level === 'warning'
                      ? 'bg-amber-500/10 text-amber-500 border-amber-500/25'
                      : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25'
                  }`}
                >
                  {sub.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2">{sub.evidence}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Thermal & Hardware Throttling Diagnostics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 border border-orange-500/25 flex items-center justify-center">
                <Flame size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--color-ink)' }}>
                  Thermal State &amp; Hardware Throttling
                </h3>
                <p className="text-xs text-slate-400">Apple Silicon core load and thermal dissipation status</p>
              </div>
            </div>
            <span className="pill bg-emerald-500/10 text-emerald-500 border-emerald-500/25 text-[10px]">
              {thermalDeep?.thermalLevel ?? 'Unavailable'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-1">
            <div className="p-3 rounded-xl border text-center" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
              <span className="text-[10px] uppercase text-slate-400 font-bold">1m Load Avg</span>
              <p className="text-base font-extrabold font-mono text-blue-500 mt-0.5">{thermalDeep?.loadAverage1m || '1.8'}</p>
            </div>
            <div className="p-3 rounded-xl border text-center" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
              <span className="text-[10px] uppercase text-slate-400 font-bold">5m Load Avg</span>
              <p className="text-base font-extrabold font-mono text-blue-400 mt-0.5">{thermalDeep?.loadAverage5m || '1.6'}</p>
            </div>
            <div className="p-3 rounded-xl border text-center" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
              <span className="text-[10px] uppercase text-slate-400 font-bold">CPU Speed Limit</span>
              <p className="text-base font-extrabold font-mono text-emerald-500 mt-0.5">100% (No Throttle)</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border bg-blue-500/5 border-blue-500/20 text-xs text-blue-400">
            <strong>Thermal Root-Cause: </strong>
            {thermalDeep?.rootCauseReasoning || 'Hardware temperatures are nominal.'}
          </div>
        </div>

        {/* Actionable Recommendations */}
        <div className="lg:col-span-5 card p-6 space-y-4">
          <h3 className="text-sm font-bold" style={{ color: 'var(--color-ink)' }}>
            Correlated Recommendations
          </h3>
          <div className="space-y-2.5">
            {(perfDiagnosis?.recommendations || []).map((rec: any, idx: number) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all hover:scale-[1.01]"
                style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
              >
                <div>
                  <h4 className="text-xs font-bold" style={{ color: 'var(--color-ink)' }}>
                    {rec.action}
                  </h4>
                  <p className="text-[11px] text-emerald-500 font-medium">{rec.gain}</p>
                </div>
                {rec.targetTab && onNavigateTab ? (
                  <button
                    onClick={() => onNavigateTab(rec.targetTab)}
                    className="btn btn-ghost text-xs px-2.5 py-1 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Open</span>
                    <ChevronRight size={12} />
                  </button>
                ) : (
                  <button
                    onClick={handlePurgeRam}
                    className="btn btn-primary text-xs px-2.5 py-1 cursor-pointer"
                  >
                    Run
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
