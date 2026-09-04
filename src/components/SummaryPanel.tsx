import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Clock, HardDrive, ArrowUpCircle, Wrench, RotateCcw, ChevronRight, Layers, Download, Ban } from 'lucide-react';
import type { RunSummary } from '../types';
import HealthScore from './HealthScore';
import InspectorModal, { type InspectorData } from './InspectorModal';

interface Props { summary: RunSummary; onReset: () => void; onExport?: () => void; }
const shown = (value: number | null, suffix = '') => value === null ? 'N/A' : `${value}${suffix}`;

export default function SummaryPanel({ summary, onReset, onExport }: Props) {
  const [inspectItem, setInspectItem] = useState<InspectorData | null>(null);
  const cancelled = summary.cancelled;
  const stats = [
    { icon: ArrowUpCircle, label: 'Verified Results', value: shown(summary.totalUpdated), detail: 'Phases with observed successful verification.' },
    { icon: HardDrive, label: 'Space Reclaimed', value: shown(summary.spaceReclaimed, ' MB'), detail: 'Measured only from backend cleanup results.' },
    { icon: Wrench, label: 'Issues Detected', value: shown(summary.issuesFound), detail: 'Observed phase errors during this run.' },
    { icon: CheckCircle2, label: 'Issues Resolved', value: shown(summary.issuesFixed), detail: 'Only shown when the backend reports measured fixes.' },
    { icon: Clock, label: 'Execution Time', value: `${summary.durationMinutes.toFixed(1)}m`, detail: 'Measured elapsed runtime.' },
    { icon: Layers, label: 'Phases Passed', value: `${summary.passedSections}/${summary.totalSections}`, detail: 'Successfully executed phases / planned phases.' },
  ];

  return <div className="space-y-5">
    <InspectorModal data={inspectItem} onClose={() => setInspectItem(null)} />
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-sm border">
        {cancelled ? <Ban size={14} /> : <CheckCircle2 size={14} />}
        {cancelled ? 'Run Cancelled — Partial Report' : 'Maintenance Run Complete'}
      </span>
      <h2 className="text-h2 font-extrabold tracking-tight" style={{ color: 'var(--color-ink)' }}>Observed Maintenance Report</h2>
      {summary.mode && <p className="text-xs font-mono" style={{ color: 'var(--color-ink-3)' }}>Profile: <span className="text-blue-500 font-bold">{summary.mode}</span>{summary.startedAt && <> · {new Date(summary.startedAt).toLocaleString()}</>}</p>}
    </motion.div>
    <div className="flex justify-center py-2"><HealthScore score={summary.healthScore} /></div>
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {stats.map((s, i) => <motion.button key={s.label} type="button" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} onClick={() => setInspectItem({ title: s.label, category: 'Observed Run Result', badge: s.value, subtitle: s.detail, details: [{ label: s.label, value: s.value }] })} className="card card-hover p-4 flex flex-col items-center text-center cursor-pointer">
        <div className="w-9 h-9 rounded-xl mb-2 flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--color-surface-2)' }}><s.icon size={17} /></div>
        <p className="text-2xl font-extrabold font-mono tabular-nums w-full text-center leading-tight" style={{ color: 'var(--color-ink)' }}>{s.value}</p>
        <p className="text-[11.5px] font-semibold mt-1 w-full text-center leading-snug" style={{ color: 'var(--color-ink-3)' }}>{s.label}</p>
      </motion.button>)}
    </div>
    {summary.rebootRequired === true && !cancelled && <div className="flex items-start gap-3 p-4 rounded-2xl border"><RotateCcw size={18} /><div><p className="text-sm font-bold">Restart requirement observed</p><p className="text-xs mt-0.5">The backend reported that a restart is required.</p></div></div>}
    {summary.rebootRequired === null && <p className="text-center text-xs" style={{ color: 'var(--color-ink-4)' }}>Restart requirement: N/A — not reported by the backend.</p>}
    {summary.followUps.length > 0 && <div className="card p-4 sm:p-5 space-y-3"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider"><AlertTriangle size={15} /><span>Observed Follow-Ups</span></div><div className="space-y-2">{summary.followUps.map((f, i) => <button type="button" key={i} onClick={() => setInspectItem({ title: 'Follow-Up', category: 'Backend Report', badge: `Step ${i + 1}`, subtitle: f, details: [{ label: 'Recommendation', value: f }] })} className="w-full flex items-start gap-2.5 p-2.5 rounded-xl text-xs border text-left cursor-pointer"><ChevronRight size={14} className="shrink-0 mt-0.5" /><span className="break-word-safe leading-relaxed flex-1">{f}</span></button>)}</div></div>}
    <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-1 pb-2">
      {onExport && <button type="button" onClick={onExport} className="btn btn-ghost text-xs !py-2.5 !px-4 cursor-pointer"><Download size={14} /><span>Export JSON Report</span></button>}
      <button type="button" onClick={onReset} className="btn btn-primary text-xs !py-2.5 !px-5 cursor-pointer"><RotateCcw size={14} /><span>New Maintenance Run</span></button>
    </div>
  </div>;
}
