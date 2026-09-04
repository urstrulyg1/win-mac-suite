import { useState } from 'react';
import {
  HelpCircle, AlertTriangle, CheckCircle2, Play, RefreshCw,
  Cpu, Battery, Radio, Shield, Wifi, HardDrive, ArrowRight,
  ChevronRight, Check
} from 'lucide-react';
import { usePlatform } from '../platform';
import InspectorModal, { type InspectorData } from './InspectorModal';

interface Props {
  onNavigateTab?: (tab: string) => void;
}

const issuesList = [
  { id: 'mac-slow', label: 'Mac is slow or unresponsive', icon: Cpu, desc: 'High memory pressure, runaway threads, or bloated inactive RAM buffer caches.' },
  { id: 'battery-drain', label: 'Battery drains quickly / Mac won’t sleep', icon: Battery, desc: 'Background wake-lock assertions preventing deep idle sleep in backpacks.' },
  { id: 'port-in-use', label: 'Port is already in use (EADDRINUSE)', icon: Radio, desc: 'Orphaned Node, Python, or Docker processes holding listening sockets.' },
  { id: 'app-damaged', label: 'App won’t open / "App is Damaged"', icon: Shield, desc: 'macOS Gatekeeper com.apple.quarantine attribute blocking downloaded apps.' },
  { id: 'wifi-captive', label: 'Hotel/Airport Wi-Fi portal not opening', icon: Wifi, desc: 'Stale DNS resolver and captive portal detection probe timeout.' },
  { id: 'storage-full', label: 'System Data is taking up 40GB+ storage', icon: HardDrive, desc: 'APFS snapshot delta extents, Xcode build artifacts, and app cache bloat.' },
];

export default function TroubleshootCenter({ onNavigateTab }: Props) {
  const { config } = usePlatform();
  const [selectedIssue, setSelectedIssue] = useState<string>('mac-slow');
  const [diagnosisData, setDiagnosisData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [actionDone, setActionDone] = useState<string | null>(null);
  const [inspectItem, setInspectItem] = useState<InspectorData | null>(null);

  const runDiagnosis = async (issueId: string) => {
    setSelectedIssue(issueId);
    setLoading(true);
    setActionDone(null);
    try {
      const res = await fetch(`/api/troubleshoot/${issueId}`);
      if (res.ok) {
        const data = await res.json();
        setDiagnosisData(data);
      }
    } catch {
      setDiagnosisData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (act: any) => {
    if (act.targetTab && onNavigateTab) {
      onNavigateTab(act.targetTab);
      return;
    }

    if (act.endpoint) {
      setLoading(true);
      try {
        const res = await fetch(`/api/actions/${act.endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(act.parameters || {}),
        });
        if (res.ok) {
          setActionDone(act.label);
        }
      } catch {}
      finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <InspectorModal data={inspectItem} onClose={() => setInspectItem(null)} />

      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 mb-2">
          <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25">
            <HelpCircle size={12} /> {config.productName} Intelligence Doctor
          </span>
          <span className="pill" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-ink-3)', borderColor: 'var(--color-line)' }}>
            Guided Issue Diagnoser &amp; Resolver
          </span>
        </div>
        <h1 className="text-hero font-extrabold tracking-tight" style={{ color: 'var(--color-ink)' }}>
          Fix a Problem &amp; System Intelligence
        </h1>
        <p className="mt-1 text-[14px]" style={{ color: 'var(--color-ink-3)' }}>
          Don't guess what's wrong. Select what your {config.osFamily} is experiencing for instant diagnostic investigation and 1-click guided resolution.
        </p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Issue Selector */}
        <div className="lg:col-span-5 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: 'var(--color-ink-4)' }}>
            What are you experiencing?
          </h2>

          <div className="space-y-2">
            {issuesList.map((item) => {
              const isSelected = selectedIssue === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => runDiagnosis(item.id)}
                  className="w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3.5 cursor-pointer"
                  style={{
                    backgroundColor: isSelected ? 'rgba(59,130,246,0.08)' : 'var(--color-surface)',
                    borderColor: isSelected ? '#3b82f6' : 'var(--color-line)',
                    boxShadow: isSelected ? '0 0 0 1px #3b82f6' : undefined,
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border"
                    style={{
                      backgroundColor: isSelected ? '#3b82f6' : 'var(--color-surface-2)',
                      borderColor: isSelected ? '#3b82f6' : 'var(--color-line)',
                      color: isSelected ? '#fff' : 'var(--color-ink-2)',
                    }}
                  >
                    <item.icon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate" style={{ color: 'var(--color-ink)' }}>
                      {item.label}
                    </p>
                    <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--color-ink-3)' }}>
                      {item.desc}
                    </p>
                  </div>
                  <ChevronRight size={15} className={`shrink-0 mt-2 transition-transform ${isSelected ? 'text-blue-500 translate-x-1' : 'text-slate-400 opacity-40'}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Guided Diagnosis & Remediation Box */}
        <div className="lg:col-span-7">
          <div className="card p-6 space-y-6 h-full flex flex-col justify-between" style={{ borderColor: 'var(--color-line)' }}>
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--color-line)' }}>
                <div>
                  <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-blue-500">
                    Live Diagnostics Stream
                  </span>
                  <h3 className="text-lg font-bold mt-0.5" style={{ color: 'var(--color-ink)' }}>
                    {diagnosisData?.title ?? 'UNAVAILABLE'}
                  </h3>
                </div>
                <button
                  onClick={() => runDiagnosis(selectedIssue)}
                  disabled={loading}
                  className="btn btn-ghost text-xs cursor-pointer"
                >
                  <RefreshCw size={13} className={loading ? 'animate-spin-smooth' : ''} />
                  <span>Re-scan</span>
                </button>
              </div>

              {/* Diagnosis Analysis */}
              <div className="p-4 rounded-2xl border space-y-2" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-ink-4)' }}>Investigation Summary</p>
                <p className="text-xs font-mono leading-relaxed" style={{ color: 'var(--color-ink-2)' }}>
                  {diagnosisData?.diagnosis ?? 'UNAVAILABLE: diagnostic probe has not returned data.'}
                </p>
              </div>

              {/* Findings List */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: 'var(--color-ink-4)' }}>
                  Diagnostic Probes
                </h4>
                <div className="divide-y rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--color-line)' }}>
                  {(diagnosisData?.findings || []).map((f: any, idx: number) => (
                    <div key={idx} className="p-3.5 flex items-center justify-between gap-3 text-xs" style={{ backgroundColor: 'var(--color-surface)' }}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        {f.healthy ? (
                          <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                        ) : (
                          <AlertTriangle size={15} className="text-amber-500 shrink-0" />
                        )}
                        <span className="font-semibold" style={{ color: 'var(--color-ink)' }}>{f.label}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`font-mono font-bold ${f.healthy ? 'text-emerald-500' : 'text-amber-500'}`}>
                          {f.value}
                        </span>
                        {f.hint && (
                          <span className="text-[10px] pill bg-amber-500/10 text-amber-500 border-amber-500/25">
                            {f.hint}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t space-y-3" style={{ borderColor: 'var(--color-line)' }}>
              {actionDone && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 text-xs font-bold flex items-center gap-2">
                  <Check size={14} /> Action complete: {actionDone}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2.5 justify-end">
                {(diagnosisData?.actions || []).map((act: any) => (
                  <button
                    key={act.id}
                    onClick={() => handleAction(act)}
                    disabled={loading}
                    className={`btn text-xs !py-2.5 !px-4 flex items-center gap-2 cursor-pointer ${
                      act.primary ? 'btn-primary' : 'btn-ghost border'
                    }`}
                    style={!act.primary ? { borderColor: 'var(--color-line)' } : undefined}
                  >
                    {act.primary ? <Play size={12} className="fill-white" /> : <ArrowRight size={12} />}
                    <span>{act.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
