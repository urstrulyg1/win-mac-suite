import { motion } from 'framer-motion';
import {
  FileText, Play, RotateCcw, Clock, HardDrive, ArrowUpCircle,
  Wrench, CheckCircle2, Layers, AlertTriangle, ChevronRight,
  Download, Sparkles, Ban, BarChart3,
} from 'lucide-react';
import type { RunSummary, RunMode } from '../types';
import HealthScore from './HealthScore';
import CountUp from './CountUp';

interface Props {
  summary: RunSummary | null;
  onStartNew: (mode?: RunMode) => void;
  onExport?: () => void;
}

const ease = [0.16, 1, 0.3, 1] as const;

export default function ReportsPage({ summary, onStartNew, onExport }: Props) {
  return (
    <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6"
      >
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="pill" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-ink-2)', borderColor: 'var(--color-line)' }}>
              <FileText size={12} /> Reports
            </span>
            {summary ? (
              <span className="pill bg-emerald-500/10 text-emerald-500 border-emerald-500/25">
                <CheckCircle2 size={12} /> Last run available
              </span>
            ) : (
              <span className="pill" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-ink-3)', borderColor: 'var(--color-line)' }}>
                No runs yet
              </span>
            )}
          </div>
          <h1 className="text-hero font-extrabold tracking-tight" style={{ color: 'var(--color-ink)' }}>Reports</h1>
          <p className="mt-1.5 text-[15px] max-w-xl" style={{ color: 'var(--color-ink-3)' }}>
            {summary
              ? 'Results and diagnostics from your last maintenance run.'
              : 'Run the maintenance suite to generate your first report.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {summary && onExport && (
            <button onClick={onExport} className="btn btn-ghost">
              <Download size={15} /> Export JSON
            </button>
          )}
          <button onClick={() => onStartNew()} className="btn btn-primary">
            <Play size={15} className="fill-white" />
            {summary ? 'Run Again' : 'Start First Run'}
          </button>
        </div>
      </motion.div>

      {/* ── No summary yet — empty state ── */}
      {!summary && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease }}
          className="card p-12 flex flex-col items-center justify-center text-center gap-5 min-h-[420px]"
        >
          <div className="w-20 h-20 rounded-3xl border flex items-center justify-center" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
            <BarChart3 size={36} style={{ color: 'var(--color-line-strong)' }} />
          </div>
          <div className="space-y-2 max-w-sm">
            <h2 className="text-xl font-bold" style={{ color: 'var(--color-ink)' }}>No reports yet</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-3)' }}>
              Complete a maintenance run to see your system health score, packages updated,
              space reclaimed, and follow-up recommendations here.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => onStartNew('Safe')} className="btn btn-primary">
              <Play size={15} className="fill-white" />
              Run Standard Update
            </button>
            <button onClick={() => onStartNew('ScanOnly')} className="btn btn-ghost">
              <CheckCircle2 size={15} />
              Run Health Scan Only
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4 pt-4 w-full max-w-md border-t" style={{ borderColor: 'var(--color-line)' }}>
            {[
              { label: 'Health Score',     value: '—' },
              { label: 'Packages Updated', value: '—' },
              { label: 'Space Reclaimed',  value: '—' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-extrabold font-mono" style={{ color: 'var(--color-line-strong)' }}>{s.value}</p>
                <p className="text-[11px] font-medium mt-0.5" style={{ color: 'var(--color-ink-4)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Summary available ── */}
      {summary && <SummaryReport summary={summary} onStartNew={onStartNew} onExport={onExport} />}

      <p className="text-center text-[11px] font-mono mt-8 tracking-wide" style={{ color: 'var(--color-ink-4)' }}>
        WinSuite Diagnostics Engine · Version 5.0.0
      </p>
    </div>
  );
}

/* ── Full summary report ─────────────────────────────────────────────────── */
function SummaryReport({
  summary, onStartNew, onExport,
}: { summary: RunSummary; onStartNew: (mode?: RunMode) => void; onExport?: () => void }) {
  const cancelled = summary.cancelled;

  const stats = [
    { icon: ArrowUpCircle, label: 'Packages Updated', node: <CountUp value={summary.totalUpdated} />,                                color: '#2563eb', bg: '#eff6ff' },
    { icon: HardDrive,     label: 'Space Reclaimed',  node: <CountUp value={summary.spaceReclaimed} suffix=" MB" />,                 color: '#0891b2', bg: '#ecfeff' },
    { icon: Wrench,        label: 'Issues Detected',  node: <CountUp value={summary.issuesFound} />,                                 color: summary.issuesFound > 0 ? '#b45309' : '#15803d', bg: summary.issuesFound > 0 ? '#fffbeb' : '#f0fdf4' },
    { icon: CheckCircle2,  label: 'Issues Resolved',  node: <CountUp value={summary.issuesFixed} />,                                 color: '#15803d', bg: '#f0fdf4' },
    { icon: Clock,         label: 'Execution Time',   node: <CountUp value={summary.durationMinutes} decimals={1} suffix="m" />,     color: '#7c3aed', bg: '#f5f3ff' },
    { icon: Layers,        label: 'Phases Passed',    node: <><CountUp value={summary.passedSections} />/{summary.totalSections}</>, color: '#15803d', bg: '#f0fdf4' },
  ];

  return (
    <div className="space-y-5">
      {/* Status badge + title */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease }}
        className="card p-6 text-center space-y-2"
      >
        <motion.span
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 350, damping: 20, delay: 0.1 }}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-sm border"
          style={cancelled
            ? { backgroundColor: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.30)', color: '#f59e0b' }
            : { backgroundColor: 'rgba(34,197,94,0.12)', borderColor: 'rgba(34,197,94,0.30)', color: '#22c55e' }
          }
        >
          {cancelled ? <Ban size={14} strokeWidth={2.5} /> : <CheckCircle2 size={14} strokeWidth={2.5} />}
          {cancelled ? 'Run Cancelled — Partial Report' : 'Maintenance Suite Complete'}
        </motion.span>
        <h2 className="text-h2 font-extrabold tracking-tight" style={{ color: 'var(--color-ink)' }}>
          Optimization &amp; Health Report
        </h2>
        {summary.mode && (
          <p className="text-xs font-mono" style={{ color: 'var(--color-ink-3)' }}>
            Profile: <span className="text-blue-500 font-bold">{summary.mode}</span>
            {summary.startedAt && <> · {new Date(summary.startedAt).toLocaleString()}</>}
          </p>
        )}
      </motion.div>

      {/* Health score ring */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, delay: 0.1, ease }}
        className="card p-6 flex justify-center"
      >
        <HealthScore score={summary.healthScore} />
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.05, duration: 0.4, ease }}
            className="card card-hover p-4 flex flex-col items-center text-center"
          >
            <div className="w-9 h-9 rounded-xl mb-2 flex items-center justify-center shrink-0"
              style={{ backgroundColor: s.bg, color: s.color }}>
              <s.icon size={17} />
            </div>
            <p className="text-2xl font-extrabold font-mono tabular-nums w-full text-center leading-tight" style={{ color: 'var(--color-ink)' }}>
              {s.node}
            </p>
            <p className="text-[11.5px] font-semibold mt-1 w-full text-center" title={s.label} style={{ color: 'var(--color-ink-3)' }}>
              {s.label}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Reboot warning */}
      {summary.rebootRequired && !cancelled && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, ease }}
          className="flex items-start sm:items-center gap-3 p-4 rounded-2xl border"
          style={{ backgroundColor: 'rgba(245,158,11,0.10)', borderColor: 'rgba(245,158,11,0.28)', color: '#d97706' }}
        >
          <div className="p-2 rounded-xl shrink-0" style={{ backgroundColor: 'rgba(245,158,11,0.18)', color: '#f59e0b' }}>
            <RotateCcw size={18} className="animate-spin-slow" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold">System Restart Recommended</p>
            <p className="text-xs mt-0.5 leading-relaxed opacity-80">
              Windows updates and driver components are staged to finish installation upon next reboot.
            </p>
          </div>
        </motion.div>
      )}

      {/* Follow-up recommendations */}
      {summary.followUps.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, ease }}
          className="card p-4 sm:p-5 space-y-3"
        >
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700">
            <AlertTriangle size={15} />
            <span>Follow-Up Recommendations ({summary.followUps.length})</span>
          </div>
          <div className="space-y-2">
            {summary.followUps.map((f, i) => (
              <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl text-xs min-w-0 border"
                style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                <ChevronRight size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <span className="break-word-safe leading-relaxed flex-1" style={{ color: 'var(--color-ink-2)' }}>{f}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, ease }}
        className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-1 pb-2"
      >
        {onExport && (
          <button onClick={onExport} className="btn btn-ghost w-full sm:w-auto">
            <Download size={16} /> Export Report
          </button>
        )}
        <button onClick={() => onStartNew()} className="btn btn-primary w-full sm:w-auto">
          <RotateCcw size={16} />
          Configure Another Run
          <Sparkles size={14} className="text-cyan-200" />
        </button>
      </motion.div>
    </div>
  );
}
