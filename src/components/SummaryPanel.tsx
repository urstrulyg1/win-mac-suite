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
  const stats = [
    { icon: ArrowUpCircle, label: 'Packages Updated', node: <CountUp value={summary.totalUpdated} />, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
    { icon: HardDrive,     label: 'Space Reclaimed',   node: <CountUp value={summary.spaceReclaimed} suffix=" MB" />, color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.12)' },
    { icon: Wrench,        label: 'Issues Detected',   node: <CountUp value={summary.issuesFound} />, color: summary.issuesFound > 0 ? '#eab308' : '#22c55e', bg: 'rgba(234, 179, 8, 0.12)' },
    { icon: CheckCircle2,  label: 'Issues Resolved',   node: <CountUp value={summary.issuesFixed} />, color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)' },
    { icon: Clock,         label: 'Execution Time',    node: <CountUp value={summary.durationMinutes} decimals={1} suffix="m" />, color: '#a855f7', bg: 'rgba(168, 85, 247, 0.12)' },
    { icon: Layers,        label: 'Phases Passed',     node: <><CountUp value={summary.passedSections} />/{summary.totalSections}</>, color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)' },
  ];

  const cancelled = summary.cancelled;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="text-center space-y-2"
      >
        <motion.span
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 350, damping: 20, delay: 0.1 }}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-sm border ${
            cancelled
              ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
              : 'bg-[#22c55e]/15 border-[#22c55e]/30 text-[#22c55e]'
          }`}
        >
          {cancelled ? <Ban size={14} className="stroke-[2.5]" /> : <CheckCircle2 size={14} className="stroke-[2.5]" />}
          <span>{cancelled ? 'Run Cancelled — Partial Report' : 'Maintenance Suite Complete'}</span>
        </motion.span>
        <h2 className="text-fluid-h2 font-extrabold text-white tracking-tight">
          Optimization &amp; Health Report
        </h2>
        {summary.mode && (
          <p className="text-xs text-slate-400 font-mono">
            Profile: <span className="text-cyan-400">{summary.mode}</span>
            {summary.startedAt && (
              <> · {new Date(summary.startedAt).toLocaleString()}</>
            )}
          </p>
        )}
      </motion.div>

      <div className="flex justify-center py-1">
        <HealthScore score={summary.healthScore} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="glass rounded-xl p-3.5 sm:p-4 text-center border border-white/[0.06] hover:border-white/[0.12] transition-colors min-w-0"
          >
            <div
              className="w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center"
              style={{ backgroundColor: s.bg, color: s.color }}
            >
              <s.icon size={17} />
            </div>
            <p className="text-fluid-metric font-bold font-mono text-white tabular-nums truncate">
              {s.node}
            </p>
            <p className="text-fluid-card-desc text-slate-400 font-medium mt-0.5 truncate" title={s.label}>
              {s.label}
            </p>
          </motion.div>
        ))}
      </div>

      {summary.rebootRequired && !cancelled && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex items-start sm:items-center gap-3.5 p-4 rounded-xl bg-orange-500/10 border border-orange-500/25 text-orange-300"
        >
          <div className="p-2 rounded-lg bg-orange-500/20 text-orange-400 shrink-0">
            <RotateCcw size={18} className="animate-spin-slow" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-bold text-orange-300">System Restart Recommended</p>
            <p className="text-xs text-orange-200/80 mt-0.5 leading-relaxed">
              Windows updates and driver components are staged to finish installation upon next reboot.
            </p>
          </div>
        </motion.div>
      )}

      {summary.followUps.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
          className="glass rounded-xl p-4 sm:p-5 space-y-3 border border-white/[0.08]"
        >
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
            <AlertTriangle size={15} />
            <span>Follow-Up Recommendations ({summary.followUps.length})</span>
          </div>

          <div className="space-y-2">
            {summary.followUps.map((f, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] text-xs min-w-0"
              >
                <ChevronRight size={14} className="text-amber-400 shrink-0 mt-0.5" />
                <span className="text-[var(--color-text-secondary)] break-word-safe leading-relaxed flex-1">
                  {f}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-2 pb-4"
      >
        {onExport && (
          <motion.button
            whileHover={{ scale: 1.025, y: -1 }}
            whileTap={{ scale: 0.985 }}
            onClick={onExport}
            className="group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 font-semibold text-sm cursor-pointer border border-white/15 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500/60 outline-none"
          >
            <Download size={16} />
            <span>Export Report</span>
          </motion.button>
        )}
        <motion.button
          whileHover={{ scale: 1.025, y: -1 }}
          whileTap={{ scale: 0.985 }}
          onClick={onReset}
          className="group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3 rounded-xl bg-gradient-to-r from-[#2563eb] via-[#3b82f6] to-[#8b5cf6] text-white font-semibold text-sm cursor-pointer shadow-lg shadow-blue-500/25 border border-white/20 focus-visible:ring-2 focus-visible:ring-blue-400 outline-none"
        >
          <RotateCcw size={16} className="group-hover:-rotate-90 transition-transform duration-300" />
          <span>Configure Another Run</span>
          <Sparkles size={14} className="text-cyan-300" />
        </motion.button>
      </motion.div>
    </div>
  );
}
