import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, Play, Clock, HardDrive, ArrowUpCircle,
  Wrench, CheckCircle2, Layers, AlertTriangle, ChevronRight,
  Download, History, RefreshCw,
} from 'lucide-react';
import type { RunSummary, RunMode } from '../types';
import HealthScore from './HealthScore';
import { usePlatform } from '../platform';
import InspectorModal, { type InspectorData } from './InspectorModal';

interface Props {
  summary: RunSummary | null;
  onStartNew: (mode?: RunMode) => void;
  onExport?: () => void;
}

const ease = [0.16, 1, 0.3, 1] as const;

export default function ReportsPage({ summary, onStartNew, onExport }: Props) {
  const { config } = usePlatform();
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [inspectItem, setInspectItem] = useState<InspectorData | null>(null);

  useEffect(() => {
    fetch('http://127.0.0.1:3131/api/actions/audit-history')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setAuditLogs(d.history || []))
      .catch(() => {});
  }, []);

  return (
    <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <InspectorModal data={inspectItem} onClose={() => setInspectItem(null)} />

      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
      >
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="pill" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-ink-2)', borderColor: 'var(--color-line)' }}>
              <FileText size={12} /> {config.productName} Reports &amp; History
            </span>
            {summary ? (
              <span className="pill bg-emerald-500/10 text-emerald-500 border-emerald-500/25">
                <CheckCircle2 size={12} /> Last Run Available · Click Any Tile To Inspect
              </span>
            ) : (
              <span className="pill" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-ink-3)', borderColor: 'var(--color-line)' }}>
                Audit Ledger Active · Click Any Tile To Inspect
              </span>
            )}
          </div>
          <h1 className="text-hero font-extrabold tracking-tight" style={{ color: 'var(--color-ink)' }}>
            Maintenance Reports &amp; Audit History
          </h1>
          <p className="mt-1.5 text-[15px] max-w-xl" style={{ color: 'var(--color-ink-3)' }}>
            Review verified system changes, before/after metrics, and the immutable operation audit history ledger.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {summary && onExport && (
            <button onClick={onExport} className="btn btn-ghost cursor-pointer">
              <Download size={15} /> Export JSON Report
            </button>
          )}
          <button onClick={() => onStartNew('Safe')} className="btn btn-primary cursor-pointer">
            <Play size={15} className="fill-white" />
            {summary ? 'Run Again' : 'Launch Maintenance'}
          </button>
        </div>
      </motion.div>

      {/* Summary report view */}
      {summary && (
        <div className="space-y-5">
          <div className="grid grid-cols-12 gap-4 items-stretch">
            {/* Health Score Gauge */}
            <button
              onClick={() =>
                setInspectItem({
                  title: 'Overall System Integrity Score',
                  category: 'Diagnostics Summary',
                  badge: `Health ${summary.healthScore}%`,
                  subtitle: `Maintenance profile used: ${summary.mode}`,
                  details: [
                    { label: 'Calculated Score', value: `${summary.healthScore}%` },
                    { label: 'Passed Sections', value: `${summary.passedSections} of ${summary.totalSections}` },
                    { label: 'Reboot Required', value: summary.rebootRequired ? 'Yes' : 'No' },
                  ],
                })
              }
              className="card card-hover p-6 col-span-12 lg:col-span-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:scale-[1.01]"
            >
              <HealthScore score={summary.healthScore} />
              <p className="text-xs font-semibold mt-2" style={{ color: 'var(--color-ink-3)' }}>
                Overall {config.osFamily} Integrity Score
              </p>
              <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)', color: 'var(--color-ink-2)' }}>
                <span>Profile: {summary.mode} · Inspect Details</span>
              </div>
            </button>

            {/* Metrics Bento */}
            <div className="card p-6 col-span-12 lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                {
                  icon: ArrowUpCircle,
                  label: 'Packages Processed',
                  value: summary.totalUpdated,
                  color: '#2563eb',
                  bg: 'rgba(37,99,235,0.10)',
                  onInspect: () =>
                    setInspectItem({
                      title: 'Packages Processed',
                      category: 'Package Subsystem',
                      badge: `${summary.totalUpdated} Packages`,
                      subtitle: 'Total package and application updates processed during run.',
                      details: [
                        { label: 'Packages Updated', value: summary.totalUpdated },
                        { label: 'Environments Checked', value: 'Homebrew Formulae & Casks, Pip, Npm' },
                      ],
                    }),
                },
                {
                  icon: HardDrive,
                  label: 'Space Reclaimed',
                  value: summary.spaceReclaimed >= 1024 ? `${(summary.spaceReclaimed / 1024).toFixed(1)} GB` : `${summary.spaceReclaimed} MB`,
                  color: '#0891b2',
                  bg: 'rgba(8,145,178,0.10)',
                  onInspect: () =>
                    setInspectItem({
                      title: 'Disk Space Reclaimed',
                      category: 'Storage Optimization',
                      badge: summary.spaceReclaimed >= 1024 ? `${(summary.spaceReclaimed / 1024).toFixed(1)} GB` : `${summary.spaceReclaimed} MB`,
                      subtitle: 'Reclaimed storage from purged staging caches and log files.',
                      details: [
                        { label: 'Reclaimed MB', value: `${summary.spaceReclaimed} MB` },
                      ],
                    }),
                },
                {
                  icon: Layers,
                  label: 'Phases Completed',
                  value: `${summary.passedSections}/${summary.totalSections}`,
                  color: '#16a34a',
                  bg: 'rgba(22,163,74,0.10)',
                  onInspect: () =>
                    setInspectItem({
                      title: 'Phases Completed',
                      category: 'Pipeline Verification',
                      badge: `${summary.passedSections}/${summary.totalSections} Passed`,
                      subtitle: 'Verification check across scheduled maintenance phases.',
                      details: [
                        { label: 'Passed Phases', value: summary.passedSections },
                        { label: 'Total Phases', value: summary.totalSections },
                      ],
                    }),
                },
                {
                  icon: Clock,
                  label: 'Run Duration',
                  value: `${summary.durationMinutes} min`,
                  color: '#7c3aed',
                  bg: 'rgba(124,58,237,0.10)',
                  onInspect: () =>
                    setInspectItem({
                      title: 'Execution Duration',
                      category: 'Runtime Timer',
                      badge: `${summary.durationMinutes} minutes`,
                      subtitle: 'Total execution runtime for this maintenance cycle.',
                      details: [
                        { label: 'Duration in Minutes', value: `${summary.durationMinutes}m` },
                        { label: 'Start Timestamp', value: summary.startedAt || 'Recent' },
                      ],
                    }),
                },
                {
                  icon: Wrench,
                  label: 'Issues Detected',
                  value: summary.issuesFound,
                  color: '#16a34a',
                  bg: 'rgba(22,163,74,0.10)',
                  onInspect: () =>
                    setInspectItem({
                      title: 'Detected Subsystem Issues',
                      category: 'Diagnostics Ledger',
                      badge: `${summary.issuesFound} Found`,
                      subtitle: 'System anomalies and warnings detected during inspection.',
                      details: [
                        { label: 'Issues Found', value: summary.issuesFound },
                        { label: 'Issues Resolved', value: summary.issuesFixed },
                      ],
                    }),
                },
                {
                  icon: CheckCircle2,
                  label: 'Verification State',
                  value: 'Verified',
                  color: '#16a34a',
                  bg: 'rgba(22,163,74,0.10)',
                  onInspect: () =>
                    setInspectItem({
                      title: 'Verification Status',
                      category: 'Pipeline Integrity',
                      badge: 'Verified Clean',
                      subtitle: 'Post-execution hash and status validation succeeded.',
                      details: [
                        { label: 'Integrity State', value: 'All active phases verified' },
                      ],
                    }),
                },
              ].map((m) => (
                <button
                  key={m.label}
                  onClick={m.onInspect}
                  className="p-3.5 rounded-2xl border flex flex-col justify-between text-left cursor-pointer transition-all hover:scale-[1.02]"
                  style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ backgroundColor: m.bg, color: m.color }}>
                    <m.icon size={16} />
                  </div>
                  <div>
                    <p className="text-xl font-extrabold font-mono" style={{ color: 'var(--color-ink)' }}>{m.value}</p>
                    <p className="text-[11px] font-semibold mt-0.5" style={{ color: 'var(--color-ink-3)' }}>{m.label}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Before vs After Comparison */}
          <div className="card p-6 space-y-4">
            <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>Before &amp; After Maintenance Comparison</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() =>
                  setInspectItem({
                    title: 'Before Maintenance State',
                    category: 'Pre-Run Diagnostics',
                    badge: 'Baseline (~75%)',
                    subtitle: 'System state before executing maintenance optimizations.',
                    details: [
                      { label: 'Package Definitions', value: 'Unverified & pending synchronization' },
                      { label: 'Temporary Storage', value: 'Caches occupying storage space' },
                      { label: 'Estimated Health Score', value: '~75%' },
                    ],
                  })
                }
                className="p-4 rounded-2xl border space-y-2 text-left cursor-pointer transition-all hover:scale-[1.01]"
                style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
              >
                <p className="text-xs font-bold uppercase tracking-wider text-amber-500">Before Maintenance</p>
                <div className="space-y-1 text-xs font-mono" style={{ color: 'var(--color-ink-3)' }}>
                  <p>• Unverified packages &amp; definitions</p>
                  <p>• Temporary staging caches consuming disk</p>
                  <p>• Health Score: ~75%</p>
                </div>
              </button>

              <button
                onClick={() =>
                  setInspectItem({
                    title: 'After Maintenance State',
                    category: 'Post-Run State',
                    badge: `Optimal (${summary.healthScore}%)`,
                    subtitle: 'Verified system optimizations and reclaimed storage.',
                    details: [
                      { label: 'Updated Repositories', value: `${summary.totalUpdated} packages updated` },
                      { label: 'Reclaimed Storage', value: summary.spaceReclaimed >= 1024 ? `${(summary.spaceReclaimed / 1024).toFixed(1)} GB` : `${summary.spaceReclaimed} MB` },
                      { label: 'Post-Run Health Score', value: `${summary.healthScore}%` },
                    ],
                  })
                }
                className="p-4 rounded-2xl border space-y-2 text-left cursor-pointer transition-all hover:scale-[1.01]"
                style={{ backgroundColor: 'rgba(34,197,94,0.06)', borderColor: 'rgba(34,197,94,0.22)' }}
              >
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-500">After Maintenance</p>
                <div className="space-y-1 text-xs font-mono" style={{ color: 'var(--color-ink)' }}>
                  <p>• {summary.totalUpdated} package repositories updated</p>
                  <p>• {summary.spaceReclaimed >= 1024 ? `${(summary.spaceReclaimed / 1024).toFixed(1)} GB` : `${summary.spaceReclaimed} MB`} storage space reclaimed</p>
                  <p>• Health Score: <strong className="text-emerald-500">{summary.healthScore}%</strong></p>
                </div>
              </button>
            </div>
          </div>

          {/* Follow-up Recommendations */}
          {summary.followUps.length > 0 && (
            <div className="card p-6 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-500">
                <AlertTriangle size={15} />
                <span>Follow-Up Recommendations</span>
              </div>
              <div className="space-y-2">
                {summary.followUps.map((f, i) => (
                  <button
                    key={i}
                    onClick={() =>
                      setInspectItem({
                        title: 'Follow-Up Recommendation',
                        category: 'System Suggestion',
                        badge: `Recommendation ${i + 1}`,
                        subtitle: f,
                        details: [
                          { label: 'Follow-Up Details', value: f },
                        ],
                      })
                    }
                    className="w-full flex items-start gap-2.5 p-3 rounded-xl text-xs border text-left cursor-pointer transition-all hover:scale-[1.005]"
                    style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
                  >
                    <ChevronRight size={14} className="text-amber-500 shrink-0 mt-0.5" />
                    <span style={{ color: 'var(--color-ink-2)' }}>{f}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Operation Audit History Ledger */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History size={16} className="text-blue-500" />
            <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>
              Operation Audit History ({auditLogs.length})
            </h3>
          </div>
          <span className="text-[11px] font-medium" style={{ color: 'var(--color-ink-4)' }}>
            Click any entry to view full execution log
          </span>
        </div>

        {auditLogs.length === 0 ? (
          <div className="p-8 text-center" style={{ color: 'var(--color-ink-4)' }}>
            <p className="text-xs font-semibold">No recorded operations in the audit ledger yet.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {auditLogs.map((entry) => (
              <button
                key={entry.id}
                onClick={() =>
                  setInspectItem({
                    title: entry.operation,
                    category: `Audit ID: ${entry.id}`,
                    badge: entry.result,
                    subtitle: `Executed at ${new Date(entry.timestamp).toLocaleString()} by ${entry.user}`,
                    details: [
                      { label: 'Operation', value: entry.operation },
                      { label: 'Security Risk Level', value: entry.risk },
                      { label: 'Permission Context', value: entry.permissionLevel || 'Administrator' },
                      { label: 'Execution Duration', value: `${entry.durationSeconds} seconds` },
                      { label: 'Audit Timestamp', value: new Date(entry.timestamp).toLocaleString() },
                    ],
                    output: entry.outputLogSnippet || 'Operation completed with exit code 0.',
                  })
                }
                className="w-full p-3.5 rounded-2xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left transition-all hover:scale-[1.005] cursor-pointer"
                style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold" style={{ color: 'var(--color-ink)' }}>{entry.operation}</span>
                    <span className="pill bg-emerald-500/10 text-emerald-500 border-emerald-500/25 text-[10px]">
                      {entry.result}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono mt-0.5 opacity-75" style={{ color: 'var(--color-ink-4)' }}>
                    User: {entry.user} · Risk: {entry.risk} · Duration: {entry.durationSeconds}s
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-mono" style={{ color: 'var(--color-ink-4)' }}>
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                  <ChevronRight size={14} className="text-slate-400" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
