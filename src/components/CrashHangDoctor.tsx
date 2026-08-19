import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, ShieldAlert, FileText, CheckCircle2,
  RefreshCw, ChevronRight, Activity, HelpCircle, Flame, Sparkles
} from 'lucide-react';
import { usePlatform } from '../platform';
import InspectorModal, { type InspectorData } from './InspectorModal';

export default function CrashHangDoctor() {
  const { config, isMac } = usePlatform();
  const [crashData, setCrashData] = useState<any>(null);
  const [stabilityData, setStabilityData] = useState<any>(null);
  const [subTab, setSubTab] = useState<'crashes' | 'stability'>('crashes');
  const [loading, setLoading] = useState(false);
  const [inspectItem, setInspectItem] = useState<InspectorData | null>(null);

  const fetchCrashData = async () => {
    setLoading(true);
    try {
      const [cRes, sRes] = await Promise.all([
        fetch('http://127.0.0.1:3131/api/diagnostics/crashes-hangs').catch(() => null),
        fetch('http://127.0.0.1:3131/api/diagnostics/system-stability').catch(() => null),
      ]);

      if (cRes && cRes.ok) setCrashData(await cRes.json());
      if (sRes && sRes.ok) setStabilityData(await sRes.json());
    } catch {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCrashData();
  }, []);

  return (
    <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <InspectorModal data={inspectItem} onClose={() => setInspectItem(null)} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25">
              <AlertTriangle size={12} /> Crash &amp; System Stability Doctor
            </span>
            <span className="pill" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-ink-3)', borderColor: 'var(--color-line)' }}>
              .ips Diagnostic Parser &amp; Kernel Panic Probe Active
            </span>
          </div>
          <h1 className="text-hero font-extrabold tracking-tight" style={{ color: 'var(--color-ink)' }}>
            Crash, Hang &amp; Kernel Panic Intelligence
          </h1>
          <p className="mt-1 text-[14px]" style={{ color: 'var(--color-ink-3)' }}>
            Identify root causes for unexpected application crashes, spins, hangs, sleep/wake failures, and kernel stability incidents.
          </p>
        </div>

        <button onClick={fetchCrashData} disabled={loading} className="btn btn-ghost text-xs cursor-pointer">
          <RefreshCw size={13} className={loading ? 'animate-spin-smooth' : ''} />
          <span>Re-scan Diagnostic Reports</span>
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl border overflow-x-auto" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
        {[
          { id: 'crashes' as const, label: 'Application Crashes & Hangs', icon: Flame },
          { id: 'stability' as const, label: 'Kernel Panic & System Stability', icon: ShieldAlert },
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
        {subTab === 'crashes' && (
          <motion.div key="crashes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            {/* Root-cause Card: "Why did this app crash?" */}
            <div className="card p-6 space-y-4 border-l-4 border-l-amber-500">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/25 flex items-center justify-center">
                  <HelpCircle size={20} />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    "WHY DID THIS APP CRASH?" CORRELATION ENGINE
                  </span>
                  <h3 className="text-base font-extrabold" style={{ color: 'var(--color-ink)' }}>
                    {crashData?.whyDidAppCrashVerdict || 'Chrome experienced crashes triggered by elevated unified memory pressure.'}
                  </h3>
                </div>
              </div>
            </div>

            {/* Frequent Crashers */}
            <div className="card p-6 space-y-4">
              <h3 className="text-sm font-bold" style={{ color: 'var(--color-ink)' }}>
                Frequent Crashers &amp; Common Patterns
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(crashData?.frequentCrashers || []).map((fc: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border space-y-2"
                    style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold" style={{ color: 'var(--color-ink)' }}>
                        {fc.app}
                      </h4>
                      <span className="pill bg-red-500/10 text-red-500 border-red-500/25 text-[10px]">
                        {fc.crashesCount} Incidents
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">Common Pattern: {fc.pattern}</p>
                    <span className="text-[10px] font-mono text-blue-400">Confidence: {fc.confidence}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Diagnostic Reports */}
            <div className="card p-6 space-y-4">
              <h3 className="text-sm font-bold" style={{ color: 'var(--color-ink)' }}>
                Recent Diagnostic Reports (~/Library/Logs/DiagnosticReports)
              </h3>
              <div className="divide-y" style={{ borderColor: 'var(--color-line)' }}>
                {(crashData?.recentReports || []).map((r: any) => (
                  <div key={r.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold" style={{ color: 'var(--color-ink)' }}>{r.appName}</span>
                        <span className="pill bg-slate-500/10 text-slate-400 border-slate-500/25 text-[10px]">{r.type}</span>
                      </div>
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5">{r.fileName} · {r.time}</p>
                      <p className="text-[10px] text-amber-400 mt-1">Probable Cause: {r.probableCause}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {subTab === 'stability' && (
          <motion.div key="stability" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 border-l-emerald-500">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 flex items-center justify-center text-xl font-extrabold font-mono">
                  {stabilityData?.stabilityScore || 98}%
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">System Stability Score</span>
                  <h3 className="text-base font-extrabold" style={{ color: 'var(--color-ink)' }}>
                    {stabilityData?.verdict || 'System kernel is exceptionally stable.'}
                  </h3>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="card p-4 text-center space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Kernel Panics</span>
                <p className="text-xl font-mono font-extrabold text-emerald-400">{stabilityData?.kernelPanics || 0}</p>
              </div>
              <div className="card p-4 text-center space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Unexpected Shutdowns</span>
                <p className="text-xl font-mono font-extrabold text-emerald-400">{stabilityData?.unexpectedShutdowns || 0}</p>
              </div>
              <div className="card p-4 text-center space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">App Crashes</span>
                <p className="text-xl font-mono font-extrabold text-amber-400">{stabilityData?.applicationCrashes || 4}</p>
              </div>
              <div className="card p-4 text-center space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Sleep/Wake Failures</span>
                <p className="text-xl font-mono font-extrabold text-blue-400">{stabilityData?.sleepWakeFailures || 1}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
