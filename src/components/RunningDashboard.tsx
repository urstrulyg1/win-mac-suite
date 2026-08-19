import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Sliders, CheckSquare, Square,
  SquareX, Timer, Search, Filter, ChevronsUpDown, ChevronsDownUp,
  TrendingUp, Package, ShieldCheck, AlertTriangle,
} from 'lucide-react';
import type { Section, RunMode, LogEntry, AppPhase, SystemInfo, RunSummary } from '../types';
import { useElapsedTimer, formatDuration } from '../hooks/useElapsedTimer';
import SystemInfoPanel from './SystemInfoPanel';
import ModeSelector from './ModeSelector';
import SectionCard from './SectionCard';
import TerminalLog from './TerminalLog';
import SummaryPanel from './SummaryPanel';
import ProgressRow from './charts/ProgressRow';
import FunnelBars from './charts/FunnelBars';
import ConfirmationModal from './ConfirmationModal';
import { usePlatform } from '../platform';
import { createMaintenancePlan } from '../maintenance';

interface Props {
  phase: AppPhase;
  mode: RunMode;
  sections: Section[];
  allLogs: LogEntry[];
  isRunning: boolean;
  systemInfo: SystemInfo;
  summary: RunSummary | null;
  overallProgress: number;
  currentSectionName: string;
  noReboot: boolean;
  exportJson: boolean;
  onModeChange: (mode: RunMode) => void;
  onToggleNoReboot: () => void;
  onToggleExportJson: () => void;
  onStart: () => void;
  onReset: () => void;
  onCancel: () => void;
  onClearLogs: () => void;
  onExport: () => void;
}

type FilterKey = 'all' | 'pending' | 'running' | 'done' | 'issues';

export default function RunningDashboard({
  phase, mode, sections, allLogs, isRunning, systemInfo, summary,
  overallProgress, currentSectionName, noReboot, exportJson,
  onModeChange, onToggleNoReboot, onToggleExportJson,
  onStart, onReset, onCancel, onClearLogs, onExport,
}: Props) {
  const { config, isMac, capabilities } = usePlatform();
  const elapsed = useElapsedTimer(isRunning);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [expandSignal, setExpandSignal] = useState(0);
  const [collapseSignal, setCollapseSignal] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const plan = useMemo(() => {
    return createMaintenancePlan(config, mode, capabilities);
  }, [config, mode, capabilities]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: sections.length, pending: 0, running: 0, done: 0, issues: 0 };
    for (const s of sections) {
      if (s.status === 'pending') c.pending++;
      else if (s.status === 'running') c.running++;
      else if (s.status === 'success' || s.status === 'skipped') c.done++;
      if (s.status === 'error' || s.status === 'warning') c.issues++;
    }
    return c;
  }, [sections]);

  const visibleSections = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sections.filter((s) => {
      if (q && !`${s.title} ${s.description} ${s.result}`.toLowerCase().includes(q)) return false;
      if (filter === 'pending') return s.status === 'pending';
      if (filter === 'running') return s.status === 'running';
      if (filter === 'done') return s.status === 'success' || s.status === 'skipped';
      if (filter === 'issues') return s.status === 'error' || s.status === 'warning';
      return true;
    });
  }, [sections, search, filter]);

  const etaSeconds = useMemo(() => {
    if (!isRunning || overallProgress <= 0) return 0;
    return Math.max(0, (elapsed / overallProgress) * (100 - overallProgress));
  }, [elapsed, overallProgress, isRunning]);

  const doneCount = sections.filter((s) => s.status === 'success' || s.status === 'skipped').length;
  const updatedCount = sections
    .flatMap((s) => s.logs)
    .filter((l) => /upgrad|updat|installed|up-to-date|up to date/i.test(l.message)).length;

  const funnelData = [
    { label: 'Queued', value: 100, display: `${sections.length}` },
    { label: 'Scanned', value: Math.max(doneCount + counts.running, 1) * 20, display: `${doneCount + counts.running}` },
    { label: 'Updated', value: updatedCount * 12 + 10, display: `${updatedCount}` },
    { label: 'Verified', value: Math.round((doneCount / Math.max(sections.length, 1)) * 100), display: `${doneCount}` },
    { label: 'Issues', value: counts.issues * 20 + 4, display: `${counts.issues}` },
  ];

  const filterChips: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'running', label: 'Running' },
    { key: 'pending', label: 'Pending' },
    { key: 'done', label: 'Done' },
    { key: 'issues', label: 'Issues' },
  ];

  const handleStartAttempt = () => {
    if (mode === 'Aggressive') {
      setShowConfirmModal(true);
    } else {
      onStart();
    }
  };

  return (
    <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Confirmation Dialog for Deep Operations */}
      <ConfirmationModal
        open={showConfirmModal}
        title={`Execute ${config.productName} Deep Maintenance?`}
        description={
          isMac
            ? 'Deep Maintenance will purge ~/Library/Caches, thin local Time Machine snapshots, and trim APFS volumes. Continue?'
            : 'Deep Maintenance will clean Component Store with ResetBase and purge old update caches. Continue?'
        }
        riskLevel="moderate"
        onConfirm={() => {
          setShowConfirmModal(false);
          onStart();
        }}
        onCancel={() => setShowConfirmModal(false)}
      />

      {/* Page header / status row */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25">
              <ShieldCheck size={12} /> {mode} Profile
            </span>
            {isRunning ? (
              <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse-dot" /> Executing
              </span>
            ) : phase === 'complete' ? (
              summary?.cancelled ? (
                <span className="pill bg-amber-500/10 text-amber-500 border-amber-500/25">Cancelled</span>
              ) : (
                <span className="pill bg-emerald-500/10 text-emerald-500 border-emerald-500/25">Completed</span>
              )
            ) : (
              <span className="pill" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-ink-3)', borderColor: 'var(--color-line)' }}>
                {config.productName} Ready
              </span>
            )}
          </div>
          <h1 className="text-hero font-extrabold tracking-tight" style={{ color: 'var(--color-ink)' }}>
            {phase === 'configuring' ? `Configure ${config.productName}` : phase === 'complete' ? 'Execution Summary' : 'Maintenance Pipeline'}
          </h1>
          <p className="mt-1 text-[14px]" style={{ color: 'var(--color-ink-3)' }}>
            {phase === 'configuring'
              ? `Select an execution profile, review flags and inspect the 10 scheduled ${config.osFamily} phases.`
              : phase === 'complete'
              ? 'Review diagnostics, reclaimed space, and system health results.'
              : `Live execution across the ${config.osFamily} maintenance pipeline.`}
          </p>
        </div>

        {/* Action cluster */}
        <div className="flex flex-wrap items-center gap-2">
          {isRunning && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono font-bold border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-line)', color: 'var(--color-ink-2)' }}>
              <Timer size={13} className="text-blue-500" />
              <span className="tabular-nums">{formatDuration(elapsed)}</span>
              {overallProgress > 2 && <span style={{ color: 'var(--color-ink-4)' }}>· ~{formatDuration(etaSeconds)} left</span>}
            </div>
          )}
          {isRunning && (
            <button onClick={onCancel} className="btn btn-danger">
              <SquareX size={15} /> Cancel run
            </button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ── Configuring ── */}
        {phase === 'configuring' && (
          <motion.div
            key="config"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-12 gap-4 sm:gap-5 items-start"
          >
            <div className="col-span-12 lg:col-span-8 space-y-5">
              <ModeSelector selectedMode={mode} onSelect={onModeChange} />

              <div className="card p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sliders size={16} className="text-blue-500" />
                  <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>Execution Flags</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {!isMac && (
                    <ToggleCard active={noReboot} onClick={onToggleNoReboot} title="No Reboot Prompt" desc="Skip restart prompt at completion" />
                  )}
                  <ToggleCard active={exportJson} onClick={onToggleExportJson} title="Export Diagnostics" desc="Auto-compile JSON telemetry report" />
                </div>

                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={handleStartAttempt}
                  className="btn btn-primary w-full mt-5 !py-3.5 text-[15px] relative overflow-hidden"
                >
                  <span className="shimmer-bar" />
                  <Play size={17} className="fill-white relative z-10" />
                  <span className="relative z-10">Start Execution — {mode} Profile</span>
                </motion.button>
              </div>

              {/* Maintenance Phase Tiles (All Clickable) */}
              <div className="card p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>Included Maintenance Phases</h3>
                    <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--color-ink-4)' }}>
                      Click any phase tile below to view execution details and target tools
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpandSignal((n) => n + 1)}
                      className="btn btn-ghost !py-1.5 !px-2.5 text-xs"
                      title="Expand all"
                    >
                      <ChevronsDownUp size={13} /> <span>Expand All</span>
                    </button>
                    <button
                      onClick={() => setCollapseSignal((n) => n + 1)}
                      className="btn btn-ghost !py-1.5 !px-2.5 text-xs"
                      title="Collapse all"
                    >
                      <ChevronsUpDown size={13} /> <span>Collapse All</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  {visibleSections.map((s, i) => (
                    <SectionCard key={s.id} section={s} index={i} expandSignal={expandSignal} collapseSignal={collapseSignal} />
                  ))}
                </div>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-4 space-y-5 lg:sticky lg:top-24">
              <SystemInfoPanel systemInfo={systemInfo} selectedMode={mode} live={false} />
            </div>
          </motion.div>
        )}

        {/* ── Running / Complete ── */}
        {(phase === 'running' || phase === 'complete') && (
          <motion.div
            key="running"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-12 gap-4 sm:gap-5 items-start"
          >
            {/* Left: KPIs + sections or summary */}
            <div className="col-span-12 lg:col-span-8 space-y-5">
              {phase !== 'complete' && (
                <div className="grid grid-cols-12 gap-4">
                  <div className="card p-5 col-span-12 sm:col-span-6">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-ink-4)' }}>Overall Progress</p>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md border" style={{ color: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.10)', borderColor: 'rgba(59,130,246,0.25)' }}>
                        {Math.round(overallProgress)}%
                      </span>
                    </div>
                    <div className="text-4xl font-extrabold tracking-tight tabular-nums" style={{ color: 'var(--color-ink)' }}>
                      {doneCount}<span style={{ color: 'var(--color-line-strong)' }}>/{sections.length}</span>
                    </div>
                    <p className="text-xs font-medium mt-0.5 mb-3 truncate" style={{ color: 'var(--color-ink-3)' }}>
                      {currentSectionName || 'Preparing phases...'}
                    </p>
                    <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-surface-2)' }}>
                      <motion.div
                        className="h-full rounded-full relative overflow-hidden progress-stripe"
                        style={{ background: 'linear-gradient(90deg, #2563eb, #06b6d4)' }}
                        animate={{ width: `${overallProgress}%` }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                      />
                    </div>
                  </div>

                  <div className="card p-5 col-span-6 sm:col-span-3 flex flex-col justify-between">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: 'rgba(6,182,212,0.12)', color: '#22d3ee' }}>
                      <Package size={16} />
                    </div>
                    <div>
                      <p className="text-3xl font-extrabold tabular-nums" style={{ color: 'var(--color-ink)' }}>{updatedCount}</p>
                      <p className="text-[11px] font-semibold mt-0.5" style={{ color: 'var(--color-ink-3)' }}>Updates processed</p>
                    </div>
                  </div>

                  <div className="card p-5 col-span-6 sm:col-span-3 flex flex-col justify-between">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: '#4ade80' }}>
                      <TrendingUp size={16} />
                    </div>
                    <div>
                      <p className="text-3xl font-extrabold tabular-nums" style={{ color: 'var(--color-ink)' }}>{formatDuration(elapsed)}</p>
                      <p className="text-[11px] font-semibold mt-0.5" style={{ color: 'var(--color-ink-3)' }}>Elapsed</p>
                    </div>
                  </div>

                  {/* Funnel / pipeline card */}
                  <div className="card p-5 col-span-12 overflow-visible">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>Execution Pipeline</h3>
                        <p className="text-xs font-medium" style={{ color: 'var(--color-ink-4)' }}>Phase throughput this run</p>
                      </div>
                      <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25">
                        <ShieldCheck size={11} /> Live
                      </span>
                    </div>
                    <div className="pb-1">
                      <FunnelBars data={funnelData} height={180} />
                    </div>
                  </div>
                </div>
              )}

              {phase === 'complete' && summary ? (
                <SummaryPanel summary={summary} onReset={onReset || (() => {})} onExport={onExport} />
              ) : (
                <>
                  {/* Toolbar */}
                  <div className="card p-3.5 sm:p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="relative flex-1 min-w-0">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Search phases, descriptions, results..."
                          className="field pl-9 py-2.5 text-sm"
                          aria-label="Search phases"
                        />
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setExpandSignal((n) => n + 1)}
                          className="btn btn-ghost !py-2 !px-3 text-xs"
                          title="Expand all"
                        >
                          <ChevronsDownUp size={13} /> <span className="hidden sm:inline">Expand</span>
                        </button>
                        <button
                          onClick={() => setCollapseSignal((n) => n + 1)}
                          className="btn btn-ghost !py-2 !px-3 text-xs"
                          title="Collapse all"
                        >
                          <ChevronsUpDown size={13} /> <span className="hidden sm:inline">Collapse</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Filter size={13} className="text-slate-400" />
                      {filterChips.map((chip) => {
                        const active = filter === chip.key;
                        const count = counts[chip.key] ?? 0;
                        return (
                          <button
                            key={chip.key}
                            onClick={() => setFilter(chip.key)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer`}
                            style={active
                              ? { backgroundColor: 'var(--color-ink)', color: '#fff', borderColor: 'var(--color-ink)' }
                              : { backgroundColor: 'var(--color-surface)', color: 'var(--color-ink-3)', borderColor: 'var(--color-line)' }
                            }
                          >
                            {chip.label}
                            <span className="tabular-nums" style={{ color: active ? 'rgba(255,255,255,0.55)' : 'var(--color-ink-4)' }}>{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {visibleSections.length > 0 ? (
                      visibleSections.map((s, i) => (
                        <SectionCard key={s.id} section={s} index={i} expandSignal={expandSignal} collapseSignal={collapseSignal} />
                      ))
                    ) : (
                      <div className="card p-10 text-center">
                        <p className="text-sm" style={{ color: 'var(--color-ink-3)' }}>No phases match your filters.</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Right column */}
            <div className="col-span-12 lg:col-span-4 space-y-5 lg:sticky lg:top-24">
              {phase !== 'complete' && (
                <div className="space-y-5">
                  <SystemInfoPanel systemInfo={systemInfo} live={isRunning} />
                  <div className="card p-5 space-y-4">
                    <h3 className="text-sm font-bold" style={{ color: 'var(--color-ink)' }}>Resource Breakdown</h3>
                    <ProgressRow label="CPU Load" value={systemInfo.cpuUsage} total={100} display={`${systemInfo.cpuUsage}%`} color="#2563eb" />
                    <ProgressRow label="Memory" value={systemInfo.memoryUsage} total={100} display={`${systemInfo.memoryUsage}%`} color="#7c3aed" />
                    <ProgressRow
                      label="Disk Used"
                      value={Math.round(((systemInfo.totalDiskGB - systemInfo.freeDiskGB) / Math.max(systemInfo.totalDiskGB, 1)) * 100)}
                      total={100}
                      display={`${Math.round(((systemInfo.totalDiskGB - systemInfo.freeDiskGB) / Math.max(systemInfo.totalDiskGB, 1)) * 100)}%`}
                      color="#0891b2"
                    />
                  </div>
                </div>
              )}
              <TerminalLog logs={allLogs} isRunning={isRunning} onClear={onClearLogs} onExport={onExport} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-center text-[11px] font-mono mt-4 tracking-wide" style={{ color: 'var(--color-ink-4)' }}>
        {config.productName} · {config.subtitle} · Version {config.version}
      </p>
    </div>
  );
}

function ToggleCard({
  active, onClick, title, desc,
}: { active: boolean; onClick: () => void; title: string; desc: string }) {
  return (
    <div
      onClick={onClick}
      role="checkbox"
      aria-checked={active}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onClick();
        }
      }}
      className="flex items-center gap-3.5 p-4 rounded-2xl border cursor-pointer select-none transition-all outline-none"
      style={active
        ? { backgroundColor: 'rgba(59,130,246,0.10)', borderColor: 'rgba(59,130,246,0.35)' }
        : { backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }
      }
    >
      {active ? (
        <CheckSquare size={20} className="text-blue-500 shrink-0" />
      ) : (
        <Square size={20} className="shrink-0" style={{ color: 'var(--color-ink-4)' }} />
      )}
      <div className="min-w-0">
        <p className="text-sm font-bold truncate" style={{ color: 'var(--color-ink)' }}>{title}</p>
        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-ink-3)' }}>{desc}</p>
      </div>
    </div>
  );
}
