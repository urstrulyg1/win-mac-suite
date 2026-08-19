import { useEffect, useState } from 'react';
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

const statusCfg: Record<
  SectionStatus,
  { icon: React.ComponentType<any>; color: string; bg: string; border: string; label: string }
> = {
  pending:  { icon: Clock,         color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0', label: 'Pending' },
  running:  { icon: Loader2,       color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', label: 'Running' },
  success:  { icon: CheckCircle2,  color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', label: 'Done' },
  warning:  { icon: AlertTriangle, color: '#b45309', bg: '#fffbeb', border: '#fde68a', label: 'Warn' },
  error:    { icon: XCircle,       color: '#b91c1c', bg: '#fef2f2', border: '#fecaca', label: 'Error' },
  skipped:  { icon: SkipForward,   color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', label: 'Skip' },
};

const logColors: Record<string, { badge: string; text: string; bg: string }> = {
  INFO:    { badge: '#475569', text: '#334155', bg: '#f1f5f9' },
  SUCCESS: { badge: '#15803d', text: '#166534', bg: '#dcfce7' },
  WARNING: { badge: '#b45309', text: '#92400e', bg: '#fef3c7' },
  ERROR:   { badge: '#b91c1c', text: '#991b1b', bg: '#fee2e2' },
};

interface Props {
  section: Section;
  index: number;
  expandSignal?: number;
  collapseSignal?: number;
}

export default function SectionCard({ section, index, expandSignal = 0, collapseSignal = 0 }: Props) {
  const [open, setOpen] = useState(false);
  const Icon = iconMap[section.icon] || Package;
  const st = statusCfg[section.status];
  const StIcon = st.icon;
  const isRunning = section.status === 'running';
  const isSkipped = section.status === 'skipped';
  const hasDetails = section.logs.length > 0 || (section.details && Object.keys(section.details).length > 0);

  useEffect(() => {
    if (isRunning) setOpen(true);
  }, [isRunning]);

  useEffect(() => {
    if (expandSignal > 0 && hasDetails) setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandSignal]);

  useEffect(() => {
    if (collapseSignal > 0) setOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapseSignal]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.25), duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={`
        rounded-2xl overflow-hidden transition-all duration-300 border
        ${isRunning
          ? 'bg-white border-blue-300 shadow-lg shadow-blue-500/10'
          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'
        }
        ${isSkipped ? 'opacity-55 hover:opacity-90' : ''}
      `}
    >
      <button
        onClick={() => hasDetails && setOpen(!open)}
        disabled={!hasDetails}
        aria-expanded={open}
        className={`
          w-full flex items-center gap-3 p-3.5 sm:px-4 text-left
          ${hasDetails ? 'cursor-pointer hover:bg-slate-50/80' : 'cursor-default'}
          transition-colors duration-150 outline-none
        `}
      >
        <span
          className="w-7 h-7 rounded-lg text-[11px] font-bold font-mono flex items-center justify-center shrink-0 border"
          style={{ backgroundColor: st.bg, color: st.color, borderColor: st.border }}
        >
          {section.number}
        </span>

        <span
          className="p-2 rounded-lg shrink-0 border"
          style={{ backgroundColor: st.bg, color: st.color, borderColor: st.border }}
        >
          <Icon size={16} />
        </span>

        <div className="flex-1 min-w-0 pr-2">
          <p title={section.title} className="text-[13.5px] font-bold text-slate-900 truncate">
            {section.title}
          </p>
          <p title={section.description} className="text-[11.5px] text-slate-500 truncate mt-0.5">
            {section.description}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isRunning && (
            <span className="text-xs text-blue-600 font-mono font-bold tabular-nums w-10 text-right">
              {section.progress}%
            </span>
          )}
          {section.duration > 0 && (
            <span className="hidden sm:inline-block text-[11px] text-slate-400 font-mono">
              {section.duration}s
            </span>
          )}
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border"
            style={{ backgroundColor: st.bg, color: st.color, borderColor: st.border }}
          >
            <StIcon size={11} className={isRunning ? 'animate-spin-smooth' : ''} />
            <span className="hidden xs:inline">{st.label}</span>
          </span>
          {hasDetails ? (
            <motion.span
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700"
            >
              <ChevronDown size={16} />
            </motion.span>
          ) : (
            <span className="w-6" />
          )}
        </div>
      </button>

      {isRunning && (
        <div className="px-4 pb-3">
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              animate={{ width: `${section.progress}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="h-full rounded-full progress-stripe relative overflow-hidden"
              style={{ background: 'linear-gradient(90deg, #2563eb, #06b6d4)' }}
            />
          </div>
        </div>
      )}

      {section.result && !isRunning && !open && (
        <div className="px-4 pb-3 flex items-center justify-between gap-2">
          <span
            className="text-[10.5px] font-mono font-semibold px-2 py-0.5 rounded-md inline-block max-w-full truncate border"
            style={{ backgroundColor: st.bg, color: st.color, borderColor: st.border }}
            title={section.result}
          >
            {section.result}
          </span>
          {section.logs.length > 0 && (
            <button
              onClick={() => setOpen(true)}
              className="text-[10.5px] text-blue-600 hover:text-blue-700 font-mono font-semibold underline underline-offset-2 cursor-pointer shrink-0"
            >
              View logs ({section.logs.length})
            </button>
          )}
        </div>
      )}

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-slate-100"
          >
            <div className="p-4 bg-slate-50/60 space-y-3">
              {section.result && (
                <div
                  className="px-3 py-2 rounded-lg text-xs font-mono font-semibold border flex items-center justify-between gap-2"
                  style={{ backgroundColor: st.bg, color: st.color, borderColor: st.border }}
                >
                  <span className="truncate">{section.result}</span>
                  {section.duration > 0 && (
                    <span className="text-[10px] opacity-80 shrink-0">Duration: {section.duration}s</span>
                  )}
                </div>
              )}

              {section.details && Object.keys(section.details).length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(section.details).map(([k, v]) => (
                    <div key={k} className="p-2.5 rounded-lg bg-white border border-slate-200 min-w-0">
                      <p className="text-[10px] uppercase font-bold text-slate-400 truncate">{k}</p>
                      <p className="text-xs font-mono font-bold text-slate-800 truncate mt-0.5">{v}</p>
                    </div>
                  ))}
                </div>
              )}

              {section.logs.length > 0 && (
                <div className="rounded-lg bg-white border border-slate-200 p-3 max-h-52 overflow-y-auto font-mono text-[11px] space-y-1.5">
                  {section.logs.map((l, i) => {
                    const col = logColors[l.level] || logColors.INFO;
                    return (
                      <div key={i} className="flex items-baseline gap-2 leading-relaxed">
                        <span className="text-slate-300 shrink-0 text-[10px] tabular-nums">
                          {l.time ? `[${l.time}]` : '·'}
                        </span>
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 inline-flex items-center"
                          style={{ backgroundColor: col.bg, color: col.badge }}
                        >
                          {l.level}
                        </span>
                        <span className="break-word-safe flex-1 text-[11px]" style={{ color: col.text }}>
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
