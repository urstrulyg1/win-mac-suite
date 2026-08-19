import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Sliders, CheckSquare, Square,
  SquareX, Timer, Search, Filter, ChevronsUpDown, ChevronsDownUp,
  TrendingUp, Package, ShieldCheck,
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
  const elapsed = useElapsedTimer(isRunning);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [expandSignal, setExpandSignal] = useState(0);
  const [collapseSignal, setCollapseSignal] = useState(0);

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

  // KPI numbers during a run
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

  return (
    <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Page header / status row */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="pill bg-blue-50 text-blue-700 border-blue-200">
              <ShieldCheck size={12} /> {mode} profile
            </span>
            {isRunning ? (
              <span className="pill bg-blue-50 text-blue-700 border-blue-200">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse-dot" /> Executing
              </span>
            ) : phase === 'complete' ? (
              summary?.cancelled ? (
                <span className="pill bg-amber-50 text-amber-700 border-amber-200">Cancelled</span>
              ) : (
                <span className="pill bg-emerald-50 text-emerald-700 border-emerald-200">Completed</span>
              )
            ) : (
              <span className="pill bg-slate-100 text-slate-600 border-slate-200">Ready to run</span>
            )}
          </div>
          <h1 className="text-hero font-extrabold text-slate-900 tracking-tight">
            {phase === 'configuring' ? 'Configure run' : phase === 'complete' ? 'Run report' : 'Maintenance'}
          </h1>
          <p className="text-slate-500 mt-1 text-[14px]">
            {phase === 'configuring'
              ? 'Pick a profile, review flags, then launch.'
              : phase === 'complete'
              ? 'Review results, metrics and follow-up actions.'
              : 'Live execution across the Windows maintenance pipeline.'}
          </p>
        </div>

        {/* Action cluster */}
        <div className="flex flex-wrap items-center gap-2">
          {isRunning && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono font-bold text-slate-700">
              <Timer size={13} className="text-blue-600" />
              <span className="tabular-nums">{formatDuration(elapsed)}</span>
              {overallProgress > 2 && <span className="text-slate-400">· ~{formatDuration(etaSeconds)} left</span>}
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
                  <Sliders size={16} className="text-blue-600" />
                  <h3 className="text-base font-bold text-slate-900">Configuration Flags</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ToggleCard active={noReboot} onClick={onToggleNoReboot} title="No Reboot Prompt" desc="Skip restart prompt at completion" />
                  <ToggleCard active={exportJson} onClick={onToggleExportJson} title="Export Diagnostics" desc="Auto-save JSON telemetry report" />
                </div>

                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={onStart}
                  className="btn btn-primary w-full mt-5 !py-3.5 text-[15px] relative overflow-hidden"
                >
                  <span className="shimmer-bar" />
                  <Play size={17} className="fill-white relative z-10" />
                  <span className="relative z-10">Start Execution — {mode} Profile</span>
                </motion.button>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-4">
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
              {/* KPI bento row */}
              {phase !== 'complete' && (
                <div className="grid grid-cols-12 gap-4">
                  <div className="card p-5 col-span-12 sm:col-span-6">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Overall Progress</p>
                      <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                        {Math.round(overallProgress)}%
                      </span>
                    </div>
                    <div className="text-4xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                      {doneCount}<span className="text-slate-300">/{sections.length}</span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5 mb-3 truncate">
                      {currentSectionName || 'Preparing phases...'}
                    </p>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full relative overflow-hidden progress-stripe"
                        style={{ background: 'linear-gradient(90deg, #2563eb, #06b6d4)' }}
                        animate={{ width: `${overallProgress}%` }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                      />
                    </div>
                  </div>

                  <div className="card p-5 col-span-6 sm:col-span-3 flex flex-col justify-between">
                    <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center mb-3">
                      <Package size={16} />
                    </div>
                    <div>
                      <p className="text-3xl font-extrabold text-slate-900 tabular-nums">{updatedCount}</p>
                      <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Updates processed</p>
                    </div>
                  </div>

                  <div className="card p-5 col-span-6 sm:col-span-3 flex flex-col justify-between">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
                      <TrendingUp size={16} />
                    </div>
                    <div>
                      <p className="text-3xl font-extrabold text-slate-900 tabular-nums">{formatDuration(elapsed)}</p>
                      <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Elapsed</p>
                    </div>
                  </div>

                  {/* Funnel / pipeline card */}
                  <div className="card p-5 col-span-12 overflow-visible">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">Execution Pipeline</h3>
                        <p className="text-xs text-slate-400 font-medium">Phase throughput this run</p>
                      </div>
                      <span className="pill bg-blue-50 text-blue-700 border-blue-200">
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
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                              active
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {chip.label}
                            <span className={`tabular-nums ${active ? 'text-slate-300' : 'text-slate-400'}`}>{count}</span>
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
                        <p className="text-slate-500 text-sm">No phases match your filters.</p>
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
                    <h3 className="text-sm font-bold text-slate-900">Resource Breakdown</h3>
                    <ProgressRow label="CPU Load" value={systemInfo.cpuUsage} total={100} display={`${systemInfo.cpuUsage}%`} color="#2563eb" />
                    <ProgressRow label="Memory" value={systemInfo.memoryUsage} total={100} display={`${systemInfo.memoryUsage}%`} color="#7c3aed" />
                    <ProgressRow
                      label="Disk Used"
                      value={Math.round(((systemInfo.totalDiskGB - systemInfo.freeDiskGB) / systemInfo.totalDiskGB) * 100)}
                      total={100}
                      display={`${Math.round(((systemInfo.totalDiskGB - systemInfo.freeDiskGB) / systemInfo.totalDiskGB) * 100)}%`}
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

      <p className="text-center text-[11px] text-slate-400 font-mono mt-10 tracking-wide">
        Windows System Maintenance &amp; Diagnostics Engine · Version 5.0.0
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
      className={`
        flex items-center gap-3.5 p-4 rounded-2xl border cursor-pointer select-none transition-all outline-none
        ${active
          ? 'bg-blue-50 border-blue-300 shadow-sm shadow-blue-500/10'
          : 'bg-slate-50/60 border-slate-200 hover:bg-white'
        }
      `}
    >
      {active ? (
        <CheckSquare size={20} className="text-blue-600 shrink-0" />
      ) : (
        <Square size={20} className="text-slate-400 shrink-0" />
      )}
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-900 truncate">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5 truncate">{desc}</p>
      </div>
    </div>
  );
}
