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

// Status configs: light / dark pairs
const statusCfgLight: Record<
  SectionStatus,
  { icon: React.ComponentType<any>; color: string; bg: string; border: string; label: string }
> = {
  pending:  { icon: Clock,         color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0', label: 'Pending' },
  running:  { icon: Loader2,       color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', label: 'Running' },
  success:  { icon: CheckCircle2,  color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', label: 'Done' },
  warning:  { icon: AlertTriangle, color: '#b45309', bg: '#fffbeb', border: '#fde68a', label: 'Warn' },
  error:    { icon: XCircle,       color: '#b91c1c', bg: '#fef2f2', border: '#fecaca', label: 'Error' },
  skipped:  { icon: SkipForward,   color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', label: 'Skip' },
  unavailable: { icon: XCircle,    color: '#94a3b8', bg: '#f1f5f9', border: '#e2e8f0', label: 'Unavailable' },
  'permission-required': { icon: AlertTriangle, color: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'Permission Required' },
};

const statusCfgDark: Record<
  SectionStatus,
  { icon: React.ComponentType<any>; color: string; bg: string; border: string; label: string }
> = {
  pending:  { icon: Clock,         color: '#94a3b8', bg: 'rgba(100,116,139,0.15)', border: 'rgba(100,116,139,0.25)', label: 'Pending' },
  running:  { icon: Loader2,       color: '#60a5fa', bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.30)',  label: 'Running' },
  success:  { icon: CheckCircle2,  color: '#4ade80', bg: 'rgba(34,197,94,0.15)',   border: 'rgba(34,197,94,0.30)',   label: 'Done' },
  warning:  { icon: AlertTriangle, color: '#fbbf24', bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.30)',  label: 'Warn' },
  error:    { icon: XCircle,       color: '#f87171', bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.30)',   label: 'Error' },
  skipped:  { icon: SkipForward,   color: '#64748b', bg: 'rgba(100,116,139,0.10)', border: 'rgba(100,116,139,0.20)', label: 'Skip' },
  unavailable: { icon: XCircle,    color: '#64748b', bg: 'rgba(100,116,139,0.10)', border: 'rgba(100,116,139,0.20)', label: 'Unavailable' },
  'permission-required': { icon: AlertTriangle, color: '#fbbf24', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.30)', label: 'Permission' },
};

const logColorsLight: Record<string, { badge: string; text: string; bg: string }> = {
  INFO:    { badge: '#475569', text: '#334155', bg: '#f1f5f9' },
  SUCCESS: { badge: '#15803d', text: '#166534', bg: '#dcfce7' },
  WARNING: { badge: '#b45309', text: '#92400e', bg: '#fef3c7' },
  ERROR:   { badge: '#b91c1c', text: '#991b1b', bg: '#fee2e2' },
};

const logColorsDark: Record<string, { badge: string; text: string; bg: string }> = {
  INFO:    { badge: '#94a3b8', text: '#cbd5e1', bg: 'rgba(71,85,105,0.18)' },
  SUCCESS: { badge: '#4ade80', text: '#86efac', bg: 'rgba(34,197,94,0.15)' },
  WARNING: { badge: '#fbbf24', text: '#fde68a', bg: 'rgba(245,158,11,0.15)' },
  ERROR:   { badge: '#f87171', text: '#fca5a5', bg: 'rgba(239,68,68,0.15)' },
};

interface Props {
  section: Section;
  index: number;
  expandSignal?: number;
  collapseSignal?: number;
}

export default function SectionCard({ section, index, expandSignal = 0, collapseSignal = 0 }: Props) {
  const [open, setOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const statusCfg = isDark ? statusCfgDark : statusCfgLight;
  const logColors = isDark ? logColorsDark : logColorsLight;

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
      className={`rounded-2xl overflow-hidden transition-all duration-300 border ${isSkipped ? 'opacity-55 hover:opacity-90' : ''}`}
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: isRunning ? (isDark ? '#3b82f6' : '#93c5fd') : 'var(--color-line)',
        boxShadow: isRunning ? `0 8px 24px -8px rgba(59,130,246,0.20)` : undefined,
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 p-3.5 sm:px-4 text-left transition-colors duration-150 outline-none cursor-pointer"
        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-surface-2)'; }}
        onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; }}
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
          <p title={section.title} className="text-[13.5px] font-bold truncate" style={{ color: 'var(--color-ink)' }}>
            {section.title}
          </p>
          <p title={section.description} className="text-[11.5px] truncate mt-0.5" style={{ color: 'var(--color-ink-3)' }}>
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
            <span className="hidden sm:inline-block text-[11px] font-mono" style={{ color: 'var(--color-ink-4)' }}>
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
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="p-1 rounded-md"
            style={{ color: 'var(--color-ink-4)' }}
          >
            <ChevronDown size={16} />
          </motion.span>
        </div>
      </button>

      {isRunning && (
        <div className="px-4 pb-3">
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-surface-2)' }}>
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
          <button
            onClick={() => setOpen(true)}
            className="text-[10.5px] text-blue-600 hover:text-blue-700 font-mono font-semibold underline underline-offset-2 cursor-pointer shrink-0"
          >
            {section.logs.length > 0 ? `View logs (${section.logs.length})` : 'View phase info'}
          </button>
        </div>
      )}

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t"
            style={{ borderColor: 'var(--color-line)' }}
          >
            <div className="p-4 space-y-3" style={{ backgroundColor: 'var(--color-surface-2)' }}>
              {section.result ? (
                <div
                  className="px-3 py-2 rounded-lg text-xs font-mono font-semibold border flex items-center justify-between gap-2"
                  style={{ backgroundColor: st.bg, color: st.color, borderColor: st.border }}
                >
                  <span className="truncate">{section.result}</span>
                  {section.duration > 0 && (
                    <span className="text-[10px] opacity-80 shrink-0">Duration: {section.duration}s</span>
                  )}
                </div>
              ) : (
                <div
                  className="px-3 py-2 rounded-lg text-xs font-medium border flex items-center justify-between gap-2"
                  style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-line)', color: 'var(--color-ink-3)' }}
                >
                  <span>Phase {section.number}: {section.description}</span>
                  <span className="text-[10px] font-bold font-mono uppercase px-2 py-0.5 rounded border" style={{ backgroundColor: st.bg, color: st.color, borderColor: st.border }}>
                    {st.label}
                  </span>
                </div>
              )}

              {section.details && Object.keys(section.details).length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(section.details).map(([k, v]) => (
                    <div key={k} className="p-2.5 rounded-lg min-w-0 border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-line)' }}>
                      <p className="text-[10px] uppercase font-bold truncate" style={{ color: 'var(--color-ink-4)' }}>{k}</p>
                      <p className="text-xs font-mono font-bold truncate mt-0.5" style={{ color: 'var(--color-ink)' }}>{v}</p>
                    </div>
                  ))}
                </div>
              )}

              {section.logs.length > 0 ? (
                <div className="rounded-lg p-3 max-h-52 overflow-y-auto font-mono text-[11px] space-y-1.5 border"
                  style={{ backgroundColor: isDark ? '#0b1017' : '#ffffff', borderColor: 'var(--color-line)' }}>
                  {section.logs.map((l, i) => {
                    const col = logColors[l.level] || logColors.INFO;
                    return (
                      <div key={i} className="flex items-baseline gap-2 leading-relaxed">
                        <span className="shrink-0 text-[10px] tabular-nums" style={{ color: isDark ? '#3d4f6a' : '#cbd5e1' }}>
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
              ) : (
                <div className="p-3 rounded-lg border text-center font-mono text-xs" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-line)', color: 'var(--color-ink-4)' }}>
                  No execution logs yet. Logs will stream live once Phase {section.number} runs.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
