import { useRef, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Minus, Plus, Copy, Check, Trash2, Download, Search, ArrowDownToLine } from 'lucide-react';
import type { LogEntry } from '../types';

const logColors: Record<string, { badge: string; text: string; bg: string }> = {
  INFO:    { badge: '#94a3b8', text: '#cbd5e1', bg: 'rgba(148, 163, 184, 0.1)' },
  SUCCESS: { badge: '#22c55e', text: '#86efac', bg: 'rgba(34, 197, 94, 0.12)' },
  WARNING: { badge: '#eab308', text: '#fde047', bg: 'rgba(234, 179, 8, 0.12)' },
  ERROR:   { badge: '#ef4444', text: '#fca5a5', bg: 'rgba(239, 68, 68, 0.15)' },
};

type LevelFilter = 'ALL' | 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
const LEVELS: LevelFilter[] = ['ALL', 'INFO', 'SUCCESS', 'WARNING', 'ERROR'];

interface Props {
  logs: LogEntry[];
  isRunning: boolean;
  onClear?: () => void;
  onExport?: () => void;
}

export default function TerminalLog({ logs, isRunning, onClear, onExport }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState<LevelFilter>('ALL');
  const [autoscroll, setAutoscroll] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const stickToBottomRef = useRef(true);

  const levelCounts = useMemo(() => {
    const c: Record<string, number> = { INFO: 0, SUCCESS: 0, WARNING: 0, ERROR: 0 };
    for (const l of logs) c[l.level] = (c[l.level] ?? 0) + 1;
    return c;
  }, [logs]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (level !== 'ALL' && l.level !== level) return false;
      if (q && !`${l.message} ${l.level} ${l.time}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [logs, level, search]);

  // Track whether the user has scrolled away from the bottom
  const handleScroll = () => {
    const el = ref.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setAutoscroll(stickToBottomRef.current);
  };

  useEffect(() => {
    if (ref.current && stickToBottomRef.current) {
      ref.current.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' });
    }
  }, [visible.length]);

  const copyLogs = () => {
    const text = visible.map((l) => `[${l.time}] [${l.level}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleCollapse = () => setCollapsed((c) => !c);

  return (
    <div className="glass rounded-xl overflow-hidden border border-white/[0.08] shadow-2xl">
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-black/50 border-b border-white/[0.06] gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0" aria-hidden="true">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444] shadow-sm shadow-red-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#eab308] shadow-sm shadow-yellow-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#22c55e] shadow-sm shadow-green-500/50" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <Terminal size={13} className="text-cyan-400 shrink-0" />
            <span className="text-xs text-[var(--color-text-secondary)] font-mono font-medium truncate">
              PowerShell 5.1 — UpdateAll v5.0
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {logs.length > 0 && (
            <>
              <IconBtn title="Copy visible logs" onClick={copyLogs}>
                {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
              </IconBtn>
              {onExport && (
                <IconBtn title="Download report" onClick={onExport}>
                  <Download size={12} />
                </IconBtn>
              )}
              {onClear && (
                <IconBtn title="Clear terminal" onClick={onClear}>
                  <Trash2 size={12} />
                </IconBtn>
              )}
              <IconBtn
                title={showFilters ? 'Hide filters' : 'Search & filter'}
                onClick={() => setShowFilters((v) => !v)}
                active={showFilters}
              >
                <Search size={12} />
              </IconBtn>
            </>
          )}
          <IconBtn title={collapsed ? 'Expand' : 'Minimize'} onClick={toggleCollapse}>
            {collapsed ? <Plus size={13} /> : <Minus size={13} />}
          </IconBtn>
        </div>
      </div>

      {/* Search / level filters */}
      <AnimatePresence initial={false}>
        {showFilters && !collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-b border-white/[0.06] bg-black/30"
          >
            <div className="p-3 space-y-2.5">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter log output..."
                  className="glass-input w-full pl-8 pr-3 py-2 rounded-lg text-xs text-white placeholder-slate-500 font-mono focus-visible:ring-2 focus-visible:ring-blue-500/60 outline-none"
                  aria-label="Filter logs"
                />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {LEVELS.map((lv) => {
                  const active = level === lv;
                  const count = lv === 'ALL' ? logs.length : levelCounts[lv] ?? 0;
                  const col = lv === 'ALL' ? null : logColors[lv];
                  return (
                    <button
                      key={lv}
                      onClick={() => setLevel(lv)}
                      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500/60 outline-none ${
                        active
                          ? 'bg-white/10 text-white border-white/25'
                          : 'bg-white/[0.02] text-slate-400 border-white/[0.07] hover:text-white hover:bg-white/[0.05]'
                      }`}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: col ? col.badge : '#94a3b8' }}
                      />
                      {lv}
                      <span className="tabular-nums opacity-60">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Viewport */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 260 }}
            exit={{ height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden relative"
          >
            <div
              ref={ref}
              onScroll={handleScroll}
              className="h-[260px] overflow-y-auto px-4 py-3 font-mono text-[11px] leading-relaxed bg-[#070b12]/95 selection:bg-blue-500/30 selection:text-white space-y-1"
            >
              {logs.length === 0 && (
                <div className="flex items-center gap-2 text-[var(--color-text-muted)] py-1">
                  <span className="text-[#22c55e] font-bold">PS C:\&gt;</span>
                  <span>Session ready. Awaiting trigger...</span>
                  <span className="animate-terminal-blink text-[#22c55e]">▋</span>
                </div>
              )}

              {logs.length > 0 && visible.length === 0 && (
                <div className="flex items-center justify-center h-full text-[var(--color-text-muted)] text-xs">
                  No log lines match the current filter.
                </div>
              )}

              {visible.map((l, i) => {
                const col = logColors[l.level] || logColors.INFO;
                return (
                  <motion.div
                    key={`${l.time}-${i}`}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-start gap-2 min-w-0"
                  >
                    <span className="text-[var(--color-text-muted)] opacity-50 shrink-0 text-[10px] select-none pt-0.5">
                      {l.time ? `[${l.time}]` : ''}
                    </span>
                    <span
                      className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase shrink-0 select-none mt-0.5"
                      style={{ backgroundColor: col.bg, color: col.badge }}
                    >
                      {l.level}
                    </span>
                    <span className="break-word-safe flex-1 text-xs" style={{ color: col.text }}>
                      {l.message}
                    </span>
                  </motion.div>
                );
              })}

              {isRunning && logs.length > 0 && (
                <div className="flex items-center gap-2 text-[#22c55e] pt-1">
                  <span className="font-bold">PS C:\&gt;</span>
                  <span className="animate-terminal-blink">▋</span>
                </div>
              )}
            </div>

            {/* Jump-to-bottom button when scrolled away during a run */}
            {isRunning && !autoscroll && (
              <button
                onClick={() => {
                  stickToBottomRef.current = true;
                  setAutoscroll(true);
                  if (ref.current) ref.current.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' });
                }}
                title="Jump to latest output"
                className="absolute bottom-3 right-3 p-2 rounded-full bg-blue-500/80 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/40 border border-white/20 cursor-pointer transition-colors"
                aria-label="Jump to latest log"
              >
                <ArrowDownToLine size={14} />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function IconBtn({
  children, onClick, title, active,
}: { children: React.ReactNode; onClick: () => void; title: string; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`p-1.5 rounded-md transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 ${
        active ? 'bg-white/15 text-white' : 'text-[var(--color-text-muted)] hover:bg-white/10 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}
