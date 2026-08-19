import { motion } from 'framer-motion';
import {
  CheckCircle2, AlertTriangle, Clock, HardDrive,
  ArrowUpCircle, Wrench, RotateCcw, ChevronRight, Sparkles, Layers,
  Download, Ban,
} from 'lucide-react';
import type { RunSummary } from '../types';
import HealthScore from './HealthScore';
import CountUp from './CountUp';

interface Props {
  summary: RunSummary;
  onReset: () => void;
  onExport?: () => void;
}

export default function SummaryPanel({ summary, onReset, onExport }: Props) {
  const cancelled = summary.cancelled;

  const stats = [
    { icon: ArrowUpCircle, label: 'Packages Updated', node: <CountUp value={summary.totalUpdated} />, color: '#2563eb', bg: '#eff6ff' },
    { icon: HardDrive,     label: 'Space Reclaimed',   node: <CountUp value={summary.spaceReclaimed} suffix=" MB" />, color: '#0891b2', bg: '#ecfeff' },
    { icon: Wrench,        label: 'Issues Detected',   node: <CountUp value={summary.issuesFound} />, color: summary.issuesFound > 0 ? '#b45309' : '#15803d', bg: summary.issuesFound > 0 ? '#fffbeb' : '#f0fdf4' },
    { icon: CheckCircle2,  label: 'Issues Resolved',   node: <CountUp value={summary.issuesFixed} />, color: '#15803d', bg: '#f0fdf4' },
    { icon: Clock,         label: 'Execution Time',    node: <CountUp value={summary.durationMinutes} decimals={1} suffix="m" />, color: '#7c3aed', bg: '#f5f3ff' },
    { icon: Layers,        label: 'Phases Passed',     node: <><CountUp value={summary.passedSections} />/{summary.totalSections}</>, color: '#15803d', bg: '#f0fdf4' },
  ];

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="text-center space-y-2"
      >
        <motion.span
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 350, damping: 20, delay: 0.1 }}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-sm border ${
            cancelled
              ? 'bg-amber-50 border-amber-200 text-amber-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}
        >
          {cancelled ? <Ban size={14} strokeWidth={2.5} /> : <CheckCircle2 size={14} strokeWidth={2.5} />}
          {cancelled ? 'Run Cancelled — Partial Report' : 'Maintenance Suite Complete'}
        </motion.span>
        <h2 className="text-h2 font-extrabold text-slate-900 tracking-tight">
          Optimization &amp; Health Report
        </h2>
        {summary.mode && (
          <p className="text-xs text-slate-500 font-mono">
            Profile: <span className="text-blue-700 font-bold">{summary.mode}</span>
            {summary.startedAt && <> · {new Date(summary.startedAt).toLocaleString()}</>}
          </p>
        )}
      </motion.div>

      <div className="flex justify-center py-2">
        <HealthScore score={summary.healthScore} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="card card-hover p-4 text-center"
          >
            <div
              className="w-9 h-9 rounded-xl mx-auto mb-2 flex items-center justify-center"
              style={{ backgroundColor: s.bg, color: s.color }}
            >
              <s.icon size={17} />
            </div>
            <p className="text-2xl font-extrabold font-mono text-slate-900 tabular-nums truncate">
              {s.node}
            </p>
            <p className="text-[11.5px] text-slate-500 font-semibold mt-0.5 truncate" title={s.label}>
              {s.label}
            </p>
          </motion.div>
        ))}
      </div>

      {summary.rebootRequired && !cancelled && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="flex items-start sm:items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800"
        >
          <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0">
            <RotateCcw size={18} className="animate-spin-slow" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-amber-800">System Restart Recommended</p>
            <p className="text-xs text-amber-700/80 mt-0.5 leading-relaxed">
              Windows updates and driver components are staged to finish installation upon next reboot.
            </p>
          </div>
        </motion.div>
      )}

      {summary.followUps.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="card p-4 sm:p-5 space-y-3"
        >
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700">
            <AlertTriangle size={15} />
            <span>Follow-Up Recommendations ({summary.followUps.length})</span>
          </div>
          <div className="space-y-2">
            {summary.followUps.map((f, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs min-w-0"
              >
                <ChevronRight size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <span className="text-slate-600 break-word-safe leading-relaxed flex-1">{f}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.85 }}
        className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-1 pb-2"
      >
        {onExport && (
          <motion.button
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={onExport}
            className="btn btn-ghost w-full sm:w-auto"
          >
            <Download size={16} />
            Export Report
          </motion.button>
        )}
        <motion.button
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={onReset}
          className="btn btn-primary w-full sm:w-auto"
        >
          <RotateCcw size={16} className="group-hover:-rotate-90 transition-transform duration-300" />
          Configure Another Run
          <Sparkles size={14} className="text-cyan-200" />
        </motion.button>
      </motion.div>
    </div>
  );
}
