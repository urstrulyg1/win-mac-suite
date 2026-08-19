import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2, AlertTriangle, Clock, HardDrive,
  ArrowUpCircle, Wrench, RotateCcw, ChevronRight, Sparkles, Layers,
  Download, Ban,
} from 'lucide-react';
import type { RunSummary } from '../types';
import HealthScore from './HealthScore';
import CountUp from './CountUp';
import InspectorModal, { type InspectorData } from './InspectorModal';

interface Props {
  summary: RunSummary;
  onReset: () => void;
  onExport?: () => void;
}

export default function SummaryPanel({ summary, onReset, onExport }: Props) {
  const cancelled = summary.cancelled;
  const [inspectItem, setInspectItem] = useState<InspectorData | null>(null);

  const stats = [
    {
      icon: ArrowUpCircle,
      label: 'Packages Updated',
      node: <CountUp value={summary.totalUpdated} />,
      color: '#2563eb',
      bg: '#eff6ff',
      onInspect: () =>
        setInspectItem({
          title: 'Package Repositories Updated',
          category: 'Package Subsystem',
          badge: `${summary.totalUpdated} Updated`,
          subtitle: 'CLI packages and application cask manifests updated during run.',
          details: [
            { label: 'Total Packages Updated', value: summary.totalUpdated },
            { label: 'Package Managers', value: 'Homebrew, Pip, Npm' },
          ],
        }),
    },
    {
      icon: HardDrive,
      label: 'Space Reclaimed',
      node: <CountUp value={summary.spaceReclaimed} suffix=" MB" />,
      color: '#0891b2',
      bg: '#ecfeff',
      onInspect: () =>
        setInspectItem({
          title: 'Disk Storage Reclaimed',
          category: 'Storage Subsystem',
          badge: summary.spaceReclaimed >= 1024 ? `${(summary.spaceReclaimed / 1024).toFixed(1)} GB Reclaimed` : `${summary.spaceReclaimed} MB Reclaimed`,
          subtitle: 'Purged temporary caches, old logs, and build artifacts.',
          details: [
            { label: 'Total Space Cleaned', value: `${summary.spaceReclaimed} MB` },
          ],
        }),
    },
    {
      icon: Wrench,
      label: 'Issues Detected',
      node: <CountUp value={summary.issuesFound} />,
      color: summary.issuesFound > 0 ? '#b45309' : '#15803d',
      bg: summary.issuesFound > 0 ? '#fffbeb' : '#f0fdf4',
      onInspect: () =>
        setInspectItem({
          title: 'Detected Subsystem Issues',
          category: 'Diagnostics Integrity',
          badge: `${summary.issuesFound} Issues`,
          subtitle: 'Summary of anomalies or warning states detected.',
          details: [
            { label: 'Issues Found', value: summary.issuesFound },
            { label: 'Auto-Resolved Count', value: summary.issuesFixed },
          ],
        }),
    },
    {
      icon: CheckCircle2,
      label: 'Issues Resolved',
      node: <CountUp value={summary.issuesFixed} />,
      color: '#15803d',
      bg: '#f0fdf4',
      onInspect: () =>
        setInspectItem({
          title: 'Resolved Subsystem Issues',
          category: 'Remediation',
          badge: `${summary.issuesFixed} Resolved`,
          subtitle: 'Anomalies corrected during the execution pipeline.',
          details: [
            { label: 'Fixed Count', value: summary.issuesFixed },
          ],
        }),
    },
    {
      icon: Clock,
      label: 'Execution Time',
      node: <CountUp value={summary.durationMinutes} decimals={1} suffix="m" />,
      color: '#7c3aed',
      bg: '#f5f3ff',
      onInspect: () =>
        setInspectItem({
          title: 'Pipeline Execution Duration',
          category: 'Execution Metrics',
          badge: `${summary.durationMinutes} minutes`,
          subtitle: 'Total elapsed runtime for the maintenance cycle.',
          details: [
            { label: 'Duration in Minutes', value: `${summary.durationMinutes}m` },
            { label: 'Started Timestamp', value: summary.startedAt || 'Recent' },
          ],
        }),
    },
    {
      icon: Layers,
      label: 'Phases Passed',
      node: <><CountUp value={summary.passedSections} />/{summary.totalSections}</>,
      color: '#15803d',
      bg: '#f0fdf4',
      onInspect: () =>
        setInspectItem({
          title: 'Maintenance Phases Completed',
          category: 'Phase Verification',
          badge: `${summary.passedSections}/${summary.totalSections} Passed`,
          subtitle: 'Maintenance phases executed and verified.',
          details: [
            { label: 'Passed Phases', value: summary.passedSections },
            { label: 'Total Scheduled', value: summary.totalSections },
          ],
        }),
    },
  ];

  return (
    <div className="space-y-5">
      <InspectorModal data={inspectItem} onClose={() => setInspectItem(null)} />

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

      <div className="flex justify-center py-2">
        <HealthScore score={summary.healthScore} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {stats.map((s, i) => (
          <motion.button
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            onClick={s.onInspect}
            className="card card-hover p-4 flex flex-col items-center text-center cursor-pointer transition-all hover:scale-[1.02]"
          >
            <div
              className="w-9 h-9 rounded-xl mb-2 flex items-center justify-center shrink-0"
              style={{ backgroundColor: s.bg, color: s.color }}
            >
              <s.icon size={17} />
            </div>
            <p className="text-2xl font-extrabold font-mono tabular-nums w-full text-center leading-tight" style={{ color: 'var(--color-ink)' }}>
              {s.node}
            </p>
            <p className="text-[11.5px] font-semibold mt-1 w-full text-center leading-snug" title={s.label} style={{ color: 'var(--color-ink-3)' }}>
              {s.label}
            </p>
          </motion.button>
        ))}
      </div>

      {summary.rebootRequired && !cancelled && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
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
              <button
                key={i}
                onClick={() =>
                  setInspectItem({
                    title: 'Follow-Up Recommendation',
                    category: 'System Advice',
                    badge: `Step ${i + 1}`,
                    subtitle: f,
                    details: [
                      { label: 'Recommendation', value: f },
                    ],
                  })
                }
                className="w-full flex items-start gap-2.5 p-2.5 rounded-xl text-xs min-w-0 border text-left cursor-pointer transition-all hover:scale-[1.005]"
                style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
              >
                <ChevronRight size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <span className="break-word-safe leading-relaxed flex-1" style={{ color: 'var(--color-ink-2)' }}>{f}</span>
              </button>
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
          <button onClick={onExport} className="btn btn-ghost text-xs !py-2.5 !px-4 cursor-pointer">
            <Download size={14} />
            <span>Export JSON Report</span>
          </button>
        )}
        <button onClick={onReset} className="btn btn-primary text-xs !py-2.5 !px-5 cursor-pointer">
          <RotateCcw size={14} />
          <span>New Maintenance Run</span>
        </button>
      </motion.div>
    </div>
  );
}
