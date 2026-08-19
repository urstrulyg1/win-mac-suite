import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, ShieldCheck, Download, Store, Cpu, HardDrive,
  FileCheck, FolderSync, Trash, Gauge, ChevronDown,
  CheckCircle2, AlertTriangle, XCircle, Clock, Loader2, SkipForward,
} from 'lucide-react';
import type { Section, SectionStatus } from '../types';

const iconMap: Record<string, React.ComponentType<any>> = {
  Package, ShieldCheck, Download, Store, Cpu, HardDrive,
  FileCheck, FolderSync, Trash, Gauge,
};

const statusCfg: Record<SectionStatus, { icon: React.ComponentType<any>; color: string; bg: string; border: string; label: string }> = {
  pending:  { icon: Clock,        color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.08)', border: 'rgba(148, 163, 184, 0.15)', label: 'Pending' },
  running:  { icon: Loader2,      color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.14)', border: 'rgba(59, 130, 246, 0.3)', label: 'Running' },
  success:  { icon: CheckCircle2, color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)', border: 'rgba(34, 197, 94, 0.25)', label: 'Done' },
  warning:  { icon: AlertTriangle,color: '#eab308', bg: 'rgba(234, 179, 8, 0.12)', border: 'rgba(234, 179, 8, 0.25)', label: 'Warn' },
  error:    { icon: XCircle,      color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.25)', label: 'Error' },
  skipped:  { icon: SkipForward,  color: '#64748b', bg: 'rgba(100, 116, 139, 0.08)', border: 'rgba(100, 116, 139, 0.12)', label: 'Skip' },
};

const logColors: Record<string, { badge: string; text: string; bg: string }> = {
  INFO:    { badge: '#94a3b8', text: '#cbd5e1', bg: 'rgba(148, 163, 184, 0.1)' },
  SUCCESS: { badge: '#22c55e', text: '#86efac', bg: 'rgba(34, 197, 94, 0.12)' },
  WARNING: { badge: '#eab308', text: '#fde047', bg: 'rgba(234, 179, 8, 0.12)' },
  ERROR:   { badge: '#ef4444', text: '#fca5a5', bg: 'rgba(239, 68, 68, 0.15)' },
};

interface Props {
  section: Section;
  index: number;
}

export default function SectionCard({ section, index }: Props) {
  const [open, setOpen] = useState(false);
  const Icon = iconMap[section.icon] || Package;
  const st = statusCfg[section.status];
  const StIcon = st.icon;
  const isRunning = section.status === 'running';
  const isSkipped = section.status === 'skipped';
  const hasDetails = section.logs.length > 0 || (section.details && Object.keys(section.details).length > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.035, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={`
        rounded-xl overflow-hidden transition-all duration-300
        ${isRunning
          ? 'glass border border-blue-500/40 shadow-lg shadow-blue-500/15 animate-pulse-glow'
          : 'glass border border-white/[0.06] hover:border-white/[0.12]'
        }
        ${isSkipped ? 'opacity-45 hover:opacity-75' : ''}
      `}
    >
      {/* Main Header Bar */}
      <button
        onClick={() => hasDetails && setOpen(!open)}
        disabled={!hasDetails}
        className={`
          w-full flex items-center gap-3 p-3 sm:px-4 sm:py-3.5 text-left
          ${hasDetails ? 'cursor-pointer hover:bg-white/[0.025]' : 'cursor-default'}
          transition-colors duration-150
        `}
      >
        {/* Step Badge */}
        <span
          className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg text-[11px] font-bold font-mono flex items-center justify-center shrink-0 border"
          style={{ backgroundColor: st.bg, color: st.color, borderColor: st.border }}
        >
          {section.number}
        </span>

        {/* Section Icon */}
        <span
          className="p-1.5 sm:p-2 rounded-lg shrink-0 border transition-transform duration-200"
          style={{ backgroundColor: st.bg, borderColor: st.border }}
        >
          <Icon size={16} style={{ color: st.color }} />
        </span>

        {/* Title and description - protected from overflow */}
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2">
            <p
              title={section.title}
              className="text-fluid-card-title font-semibold text-white truncate"
            >
              {section.title}
            </p>
          </div>
          <p
            title={section.description}
            className="text-fluid-card-desc text-slate-400 truncate mt-0.5"
          >
            {section.description}
          </p>
        </div>

        {/* Right side status indicators */}
        <div className="flex items-center gap-2 shrink-0">
          {isRunning && (
            <span className="text-xs text-blue-400 font-mono font-medium tabular-nums w-9 text-right">
              {section.progress}%
            </span>
          )}

          {section.duration > 0 && (
            <span className="hidden sm:inline-block text-[11px] text-[var(--color-text-muted)] font-mono">
              {section.duration}s
            </span>
          )}

          {/* Status Badge */}
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border"
            style={{ backgroundColor: st.bg, color: st.color, borderColor: st.border }}
          >
            <StIcon size={11} className={isRunning ? 'animate-spin-smooth' : ''} />
            <span className="hidden xs:inline">{st.label}</span>
          </span>

          {/* Chevron for expandable details */}
          {hasDetails ? (
            <motion.span
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-white"
            >
              <ChevronDown size={15} />
            </motion.span>
          ) : (
            <span className="w-5" />
          )}
        </div>
      </button>

      {/* Progress Bar for Running Section */}
      {isRunning && (
        <div className="px-4 pb-3">
          <div className="h-1.5 bg-black/40 rounded-full overflow-hidden p-[1px]">
            <motion.div
              animate={{ width: `${section.progress}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="h-full rounded-full progress-stripe shadow-sm shadow-cyan-500/50"
              style={{ background: 'linear-gradient(90deg, #3b82f6, #06b6d4)' }}
            />
          </div>
        </div>
      )}

      {/* Finished Summary Pill when not running and result available */}
      {section.result && !isRunning && !open && (
        <div className="px-4 pb-3 flex items-center justify-between gap-2">
          <span
            className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md inline-block max-w-full truncate border"
            style={{ backgroundColor: st.bg, color: st.color, borderColor: st.border }}
            title={section.result}
          >
            {section.result}
          </span>
          {section.logs.length > 0 && (
            <button
              onClick={() => setOpen(true)}
              className="text-[10px] text-blue-400 hover:text-blue-300 font-mono underline underline-offset-2 cursor-pointer shrink-0"
            >
              View logs ({section.logs.length})
            </button>
          )}
        </div>
      )}

      {/* Smooth Accordion Body */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-white/[0.06]"
          >
            <div className="p-4 bg-black/25 space-y-3">
              {/* Detailed Result Banner */}
              {section.result && (
                <div
                  className="px-3 py-2 rounded-lg text-xs font-mono font-medium border flex items-center justify-between gap-2"
                  style={{ backgroundColor: st.bg, color: st.color, borderColor: st.border }}
                >
                  <span className="truncate">{section.result}</span>
                  {section.duration > 0 && (
                    <span className="text-[10px] opacity-80 shrink-0">Duration: {section.duration}s</span>
                  )}
                </div>
              )}

              {/* Key Metrics / Details Grid */}
              {section.details && Object.keys(section.details).length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(section.details).map(([k, v]) => (
                    <div
                      key={k}
                      className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05] min-w-0"
                    >
                      <p className="text-[10px] uppercase font-semibold text-[var(--color-text-muted)] truncate">
                        {k}
                      </p>
                      <p className="text-xs font-mono font-bold text-[var(--color-text-primary)] truncate mt-0.5">
                        {v}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Log Viewer with safe word wrapping and clean syntax colors */}
              {section.logs.length > 0 && (
                <div className="rounded-lg bg-[#080c14] border border-white/[0.06] p-3 max-h-48 overflow-y-auto font-mono text-[11px] space-y-1">
                  {section.logs.map((l, i) => {
                    const col = logColors[l.level] || logColors.INFO;
                    return (
                      <div key={i} className="flex items-start gap-2 leading-relaxed">
                        <span className="text-[var(--color-text-muted)] opacity-50 shrink-0 text-[10px] mt-0.5">
                          {l.time ? `[${l.time}]` : '•'}
                        </span>
                        <span
                          className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase shrink-0"
                          style={{ backgroundColor: col.bg, color: col.badge }}
                        >
                          {l.level}
                        </span>
                        <span
                          className="break-word-safe flex-1 text-xs"
                          style={{ color: col.text }}
                        >
                          {l.message}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

