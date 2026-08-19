import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, ArrowLeft, Shield, Sliders, CheckSquare, Square,
  SquareX, Timer, Search, Filter, ChevronsUpDown, ChevronsDownUp,
} from 'lucide-react';
import type { Section, RunMode, LogEntry, AppPhase, SystemInfo, RunSummary, SectionStatus } from '../types';
import { useElapsedTimer, formatDuration } from '../hooks/useElapsedTimer';
import SystemInfoPanel from './SystemInfoPanel';
import ModeSelector from './ModeSelector';
import SectionCard from './SectionCard';
import TerminalLog from './TerminalLog';
import SummaryPanel from './SummaryPanel';

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
  onBack: () => void;
}

type FilterKey = 'all' | 'pending' | 'running' | 'done' | 'issues';

export default function RunningDashboard({
  phase, mode, sections, allLogs, isRunning, systemInfo, summary,
  overallProgress, currentSectionName, noReboot, exportJson,
  onModeChange, onToggleNoReboot, onToggleExportJson,
  onStart, onReset, onCancel, onClearLogs, onExport, onBack,
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
      if (q && !(`${s.title} ${s.description} ${s.result}`.toLowerCase().includes(q))) return false;
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

  const filterChips: { key: FilterKey; label: string; status?: SectionStatus }[] = [
    { key: 'all', label: 'All' },
    { key: 'running', label: 'Running' },
    { key: 'pending', label: 'Pending' },
    { key: 'done', label: 'Done' },
    { key: 'issues', label: 'Issues' },
  ];

  return (
    <div className="min-h-screen grid-bg flex flex-col justify-between">
      {/* ── Sticky Header ── */}
      <motion.header
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="sticky top-0 z-50 glass border-b border-white/[0.08] backdrop-blur-xl shadow-lg"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            {phase === 'configuring' && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onBack}
                className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white cursor-pointer border border-white/[0.08] transition-colors focus-visible:ring-2 focus-visible:ring-blue-500/60 outline-none"
                title="Back to home"
                aria-label="Back to home"
              >
                <ArrowLeft size={18} />
              </motion.button>
            )}

            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0 border border-white/20">
              <Shield size={18} className="text-white" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                  Windows Update &amp; Optimization Suite
                </p>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0">
                  v5.0.0
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate hidden sm:block">
                Automated Multi-Engine Maintenance &amp; Diagnostic System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            {isRunning && (
              <div className="hidden sm:flex items-center gap-2 text-cyan-400 font-mono text-xs tabular-nums">
                <Timer size={13} />
                <span>{formatDuration(elapsed)}</span>
                {overallProgress > 2 && (
                  <span className="text-slate-500">· ~{formatDuration(etaSeconds)} left</span>
                )}
              </div>
            )}

            {isRunning && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 max-w-[120px] sm:max-w-[200px] truncate hidden md:inline-block">
                  {currentSectionName || 'Processing...'}
                </span>
                <div className="w-24 sm:w-40 h-2.5 bg-black/50 rounded-full overflow-hidden p-[1px] border border-white/[0.08]">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, #3b82f6, #06b6d4)' }}
                    animate={{ width: `${overallProgress}%` }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                  />
                </div>
                <span className="text-xs font-mono font-bold text-cyan-400 tabular-nums w-9 text-right">
                  {overallProgress}%
                </span>
              </div>
            )}

            {isRunning ? (
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={onCancel}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/40 text-xs font-bold cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-red-500/60 outline-none"
              >
                <SquareX size={14} />
                <span className="hidden sm:inline">Cancel</span>
              </motion.button>
            ) : (
              <span
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border shadow-sm"
                style={{
                  backgroundColor:
                    phase === 'complete'
                      ? summary?.cancelled
                        ? 'rgba(234, 179, 8, 0.16)'
                        : 'rgba(34, 197, 94, 0.16)'
                      : 'rgba(100, 116, 139, 0.14)',
                  color:
                    phase === 'complete'
                      ? summary?.cancelled
                        ? '#fde047'
                        : '#4ade80'
                      : '#cbd5e1',
                  borderColor:
                    phase === 'complete'
                      ? summary?.cancelled
                        ? 'rgba(234, 179, 8, 0.4)'
                        : 'rgba(34, 197, 94, 0.4)'
                      : 'rgba(100, 116, 139, 0.25)',
                }}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    backgroundColor:
                      phase === 'complete'
                        ? summary?.cancelled
                          ? '#eab308'
                          : '#22c55e'
                        : '#94a3b8',
                  }}
                />
                <span>
                  {phase === 'complete'
                    ? summary?.cancelled
                      ? 'Cancelled'
                      : 'Run Finished'
                    : 'Ready'}
                </span>
              </span>
            )}
          </div>
        </div>
      </motion.header>

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {/* ── Configuration ── */}
          {phase === 'configuring' && (
            <motion.div
              key="config-screen"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start my-auto"
            >
              <div className="lg:col-span-7 space-y-6">
                <ModeSelector selectedMode={mode} onSelect={onModeChange} />

                <div className="glass rounded-2xl p-5 sm:p-6 space-y-4 border border-white/[0.08]">
                  <div className="flex items-center gap-2">
                    <Sliders size={16} className="text-cyan-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Configuration Flags
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <ToggleCard active={noReboot} onClick={onToggleNoReboot} title="No Reboot Prompt" desc="Skip restart prompt at completion" />
                    <ToggleCard active={exportJson} onClick={onToggleExportJson} title="Export Diagnostics" desc="Auto-save JSON telemetry report" />
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onStart}
                  className="w-full relative group flex items-center justify-center gap-3.5 py-5 rounded-2xl bg-gradient-to-r from-[#2563eb] via-[#3b82f6] to-[#06b6d4] text-white font-bold text-fluid-btn cursor-pointer shadow-2xl shadow-blue-500/30 border border-white/25 overflow-hidden focus-visible:ring-2 focus-visible:ring-blue-400 outline-none"
                >
                  <motion.div
                    className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none"
                    animate={{ x: ['-100%', '350%'] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1 }}
                  />
                  <Play size={20} className="fill-white relative z-10" />
                  <span className="relative z-10 tracking-wide font-bold">
                    Start Execution — {mode} Profile
                  </span>
                </motion.button>
              </div>

              <div className="lg:col-span-5">
                <SystemInfoPanel systemInfo={systemInfo} selectedMode={mode} live={false} />
              </div>
            </motion.div>
          )}

          {/* ── Running & Complete ── */}
          {(phase === 'running' || phase === 'complete') && (
            <motion.div
              key="running-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
            >
              <div className="lg:col-span-7 space-y-4">
                {phase === 'complete' && summary ? (
                  <SummaryPanel summary={summary} onReset={onReset} onExport={onExport} />
                ) : (
                  <>
                    {/* Section toolbar */}
                    <div className="glass rounded-2xl p-3.5 sm:p-4 border border-white/[0.08] space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="relative flex-1 min-w-0">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                          <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search phases, descriptions, results..."
                            className="glass-input w-full pl-9 pr-3 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 focus-visible:ring-2 focus-visible:ring-blue-500/60 outline-none"
                            aria-label="Search phases"
                          />
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => setExpandSignal((n) => n + 1)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-slate-300 hover:text-white cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-blue-500/60 outline-none"
                            title="Expand all phases"
                          >
                            <ChevronsDownUp size={13} />
                            <span className="hidden sm:inline">Expand</span>
                          </button>
                          <button
                            onClick={() => setCollapseSignal((n) => n + 1)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-slate-300 hover:text-white cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-blue-500/60 outline-none"
                            title="Collapse all phases"
                          >
                            <ChevronsUpDown size={13} />
                            <span className="hidden sm:inline">Collapse</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Filter size={13} className="text-slate-500 mr-0.5" />
                        {filterChips.map((chip) => {
                          const active = filter === chip.key;
                          const count = counts[chip.key] ?? 0;
                          return (
                            <button
                              key={chip.key}
                              onClick={() => setFilter(chip.key)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500/60 outline-none ${
                                active
                                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                  : 'bg-white/[0.03] text-slate-400 border-white/[0.07] hover:text-white hover:bg-white/[0.06]'
                              }`}
                            >
                              {chip.label}
                              <span className={`tabular-nums ${active ? 'text-blue-200' : 'text-slate-500'}`}>
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-3.5">
                      {visibleSections.length > 0 ? (
                        visibleSections.map((s, i) => (
                          <SectionCard
                            key={s.id}
                            section={s}
                            index={i}
                            expandSignal={expandSignal}
                            collapseSignal={collapseSignal}
                          />
                        ))
                      ) : (
                        <div className="glass rounded-xl p-10 text-center border border-white/[0.06]">
                          <p className="text-slate-400 text-sm">No phases match your filters.</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
                {phase !== 'complete' && (
                  <SystemInfoPanel systemInfo={systemInfo} live={isRunning} />
                )}
                <TerminalLog logs={allLogs} isRunning={isRunning} onClear={onClearLogs} onExport={onExport} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="max-w-7xl mx-auto w-full px-6 py-4 text-center text-xs text-slate-500 font-mono">
        Windows System Maintenance &amp; Diagnostics Engine · Version 5.0.0
      </footer>
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
        flex items-center gap-3.5 p-4 rounded-xl border cursor-pointer select-none transition-all outline-none
        focus-visible:ring-2 focus-visible:ring-blue-500/60
        ${active
          ? 'bg-blue-500/15 border-blue-500/40 text-white shadow-md shadow-blue-500/10'
          : 'glass border-white/[0.06] hover:bg-white/[0.04] text-slate-300'
        }
      `}
    >
      {active ? (
        <CheckSquare size={20} className="text-blue-400 shrink-0" />
      ) : (
        <Square size={20} className="text-slate-500 shrink-0" />
      )}
      <div className="min-w-0">
        <p className="text-sm font-bold text-white truncate">{title}</p>
        <p className="text-xs text-slate-400 mt-0.5 truncate">{desc}</p>
      </div>
    </div>
  );
}
