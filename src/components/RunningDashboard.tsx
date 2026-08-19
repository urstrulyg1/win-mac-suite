import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Settings, ArrowLeft, Shield, Sliders, CheckSquare, Square, Info } from 'lucide-react';
import type { Section, RunMode, LogEntry, AppPhase, SystemInfo, RunSummary } from '../types';
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
  onModeChange: (mode: RunMode) => void;
  onStart: () => void;
  onReset: () => void;
  onBack: () => void;
}

export default function RunningDashboard({
  phase, mode, sections, allLogs, isRunning, systemInfo, summary,
  overallProgress, currentSectionName,
  onModeChange, onStart, onReset, onBack,
}: Props) {
  const [noReboot, setNoReboot] = useState(false);
  const [exportJson, setExportJson] = useState(true);

  return (
    <div className="min-h-screen grid-bg flex flex-col justify-between">
      {/* ── Fixed/Sticky Header ── */}
      <motion.header
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="sticky top-0 z-50 glass border-b border-white/[0.08] backdrop-blur-xl shadow-lg"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          {/* Logo & Suite Title */}
          <div className="flex items-center gap-3.5 min-w-0">
            {phase === 'configuring' && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onBack}
                className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white cursor-pointer border border-white/[0.08] transition-colors"
                title="Back to Landing Hero"
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
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  v5.0.0
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate hidden sm:block">
                Automated Multi-Engine Maintenance &amp; Diagnostic System
              </p>
            </div>
          </div>

          {/* Progress / Status Pill */}
          <div className="flex items-center gap-4 shrink-0">
            {isRunning && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 max-w-[160px] sm:max-w-[240px] truncate hidden md:inline-block">
                  {currentSectionName || 'Processing...'}
                </span>

                <div className="w-28 sm:w-44 h-2.5 bg-black/50 rounded-full overflow-hidden p-[1px] border border-white/[0.08]">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, #3b82f6, #06b6d4)' }}
                    animate={{ width: `${overallProgress}%` }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                  />
                </div>

                <span className="text-xs font-mono font-bold text-cyan-400 tabular-nums w-9 text-right">
                  {overallProgress}%
                </span>
              </div>
            )}

            {/* Status Indicator */}
            <span
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border shadow-sm"
              style={{
                backgroundColor: isRunning
                  ? 'rgba(59, 130, 246, 0.16)'
                  : phase === 'complete'
                  ? 'rgba(34, 197, 94, 0.16)'
                  : 'rgba(100, 116, 139, 0.14)',
                color: isRunning ? '#60a5fa' : phase === 'complete' ? '#4ade80' : '#cbd5e1',
                borderColor: isRunning
                  ? 'rgba(59, 130, 246, 0.4)'
                  : phase === 'complete'
                  ? 'rgba(34, 197, 94, 0.4)'
                  : 'rgba(100, 116, 139, 0.25)',
              }}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor: isRunning ? '#3b82f6' : phase === 'complete' ? '#22c55e' : '#94a3b8',
                  animation: isRunning ? 'pulse-glow 1.8s ease infinite' : 'none',
                }}
              />
              <span>{isRunning ? 'Executing Suite' : phase === 'complete' ? 'Run Finished' : 'Ready'}</span>
            </span>
          </div>
        </div>
      </motion.header>

      {/* ── Main Content Area with Generous Spacing ── */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {/* ── 1. Configuration Screen (Spacious 2-column grid) ── */}
          {phase === 'configuring' && (
            <motion.div
              key="config-screen"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start my-auto"
            >
              {/* Left Column: Mode Selector + Execution Flags + Launch (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                <ModeSelector selectedMode={mode} onSelect={onModeChange} />

                {/* Additional Execution Flags */}
                <div className="glass rounded-2xl p-5 sm:p-6 space-y-4 border border-white/[0.08]">
                  <div className="flex items-center gap-2">
                    <Sliders size={16} className="text-cyan-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Configuration Flags
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* No Reboot Toggle */}
                    <div
                      onClick={() => setNoReboot(!noReboot)}
                      className={`
                        flex items-center gap-3.5 p-4 rounded-xl border cursor-pointer select-none transition-all
                        ${noReboot
                          ? 'bg-blue-500/15 border-blue-500/40 text-white shadow-md shadow-blue-500/10'
                          : 'glass border-white/[0.06] hover:bg-white/[0.04] text-slate-300'
                        }
                      `}
                    >
                      {noReboot ? (
                        <CheckSquare size={20} className="text-blue-400 shrink-0" />
                      ) : (
                        <Square size={20} className="text-slate-500 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">No Reboot Prompt</p>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">Skip restart prompt at completion</p>
                      </div>
                    </div>

                    {/* Export JSON Toggle */}
                    <div
                      onClick={() => setExportJson(!exportJson)}
                      className={`
                        flex items-center gap-3.5 p-4 rounded-xl border cursor-pointer select-none transition-all
                        ${exportJson
                          ? 'bg-blue-500/15 border-blue-500/40 text-white shadow-md shadow-blue-500/10'
                          : 'glass border-white/[0.06] hover:bg-white/[0.04] text-slate-300'
                        }
                      `}
                    >
                      {exportJson ? (
                        <CheckSquare size={20} className="text-blue-400 shrink-0" />
                      ) : (
                        <Square size={20} className="text-slate-500 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">Export Diagnostics</p>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">Save JSON telemetry logs</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grand Launch Button */}
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onStart}
                  className="w-full relative group flex items-center justify-center gap-3.5 py-5 rounded-2xl bg-gradient-to-r from-[#2563eb] via-[#3b82f6] to-[#06b6d4] text-white font-bold text-fluid-btn cursor-pointer shadow-2xl shadow-blue-500/30 border border-white/25 overflow-hidden"
                >
                  <motion.div
                    className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none"
                    animate={{ x: ['-100%', '350%'] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
                  />
                  <Play size={20} className="fill-white relative z-10" />
                  <span className="relative z-10 tracking-wide font-bold">
                    Start Execution — {mode} Profile
                  </span>
                </motion.button>
              </div>

              {/* Right Column: System Telemetry & Specs (5 cols) */}
              <div className="lg:col-span-5">
                <SystemInfoPanel systemInfo={systemInfo} selectedMode={mode} />
              </div>
            </motion.div>
          )}

          {/* ── 2. Running & Complete Screen ── */}
          {(phase === 'running' || phase === 'complete') && (
            <motion.div
              key="running-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
            >
              {/* Left Column: Section Cards or Summary (7 cols) */}
              <div className="lg:col-span-7 space-y-3.5">
                {phase === 'complete' && summary ? (
                  <SummaryPanel summary={summary} onReset={onReset} />
                ) : (
                  sections.map((s, i) => <SectionCard key={s.id} section={s} index={i} />)
                )}
              </div>

              {/* Right Column: Live Telemetry & Terminal Log (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                {phase !== 'complete' && <SystemInfoPanel systemInfo={systemInfo} />}
                <TerminalLog logs={allLogs} isRunning={isRunning} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer bar */}
      <footer className="max-w-7xl mx-auto w-full px-6 py-4 text-center text-xs text-slate-500 font-mono">
        Windows System Maintenance &amp; Diagnostics Engine · Version 5.0.0
      </footer>
    </div>
  );
}


