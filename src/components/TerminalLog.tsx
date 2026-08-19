import { useRef, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Minus, Plus, Copy, Check, Trash2, Download, Search, ArrowDownToLine } from 'lucide-react';
import type { LogEntry } from '../types';

const logColors: Record<string, { badge: string; text: string; bg: string }> = {
  INFO:    { badge: '#475569', text: '#334155', bg: '#f1f5f9' },
  SUCCESS: { badge: '#15803d', text: '#166534', bg: '#dcfce7' },
  WARNING: { badge: '#b45309', text: '#92400e', bg: '#fef3c7' },
  ERROR:   { badge: '#b91c1c', text: '#991b1b', bg: '#fee2e2' },
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
  const [showFilters, setShowFilters] = useState(false);
  const stickToBottomRef = useRef(true);
  const [atBottom, setAtBottom] = useState(true);

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

  const handleScroll = () => {
    const el = ref.current;
    if (!el) return;
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    stickToBottomRef.current = bottom;
    setAtBottom(bottom);
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

  return (
    <div className="card overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200 gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0" aria-hidden="true">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <Terminal size={13} className="text-blue-600 shrink-0" />
            <span className="text-xs text-slate-600 font-mono font-semibold truncate">
              PowerShell 5.1 — UpdateAll v5.0
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {logs.length > 0 && (
            <>
              <IconBtn title="Copy logs" onClick={copyLogs}>
                {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
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
              <IconBtn title="Search & filter" onClick={() => setShowFilters((v) => !v)} active={showFilters}>
                <Search size={12} />
              </IconBtn>
            </>
          )}
          <IconBtn title={collapsed ? 'Expand' : 'Minimize'} onClick={() => setCollapsed((c) => !c)}>
            {collapsed ? <Plus size={13} /> : <Minus size={13} />}
          </IconBtn>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {showFilters && !collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-b border-slate-200 bg-white"
          >
            <div className="p-3 space-y-2.5">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter log output..."
                  className="field pl-8 py-1.5 text-xs font-mono"
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
                      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border transition-colors cursor-pointer ${
                        active
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: col ? col.badge : '#64748b' }} />
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

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 260 }}
            exit={{ height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden relative bg-white"
          >
            <div
              ref={ref}
              onScroll={handleScroll}
              className="h-[260px] overflow-y-auto px-4 py-3 font-mono text-[11.5px] leading-relaxed space-y-1.5"
            >
              {logs.length === 0 && (
                <div className="flex items-center gap-2 text-slate-400 py-1">
                  <span className="text-emerald-600 font-bold">PS C:\&gt;</span>
                  <span>Session ready. Awaiting trigger...</span>
                  <span className="animate-terminal-blink text-emerald-600">▋</span>
                </div>
              )}

              {logs.length > 0 && visible.length === 0 && (
                <div className="flex items-center justify-center h-full text-slate-400 text-xs">
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
                    className="flex items-baseline gap-2 min-w-0"
                  >
                    <span className="text-slate-300 shrink-0 text-[10px] select-none tabular-nums">
                      {l.time ? `[${l.time}]` : ''}
                    </span>
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 select-none inline-flex items-center"
                      style={{ backgroundColor: col.bg, color: col.badge }}
                    >
                      {l.level}
                    </span>
                    <span className="break-word-safe flex-1 text-[11.5px]" style={{ color: col.text }}>
                      {l.message}
                    </span>
                  </motion.div>
                );
              })}

              {isRunning && logs.length > 0 && (
                <div className="flex items-center gap-2 text-emerald-600 pt-1">
                  <span className="font-bold">PS C:\&gt;</span>
                  <span className="animate-terminal-blink">▋</span>
                </div>
              )}
            </div>

            {isRunning && !atBottom && (
              <button
                onClick={() => {
                  stickToBottomRef.current = true;
                  setAtBottom(true);
                  if (ref.current) ref.current.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' });
                }}
                title="Jump to latest"
                className="absolute bottom-3 right-3 p-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg cursor-pointer"
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
      className={`p-1.5 rounded-md transition-colors cursor-pointer outline-none ${
        active ? 'bg-slate-200 text-slate-700' : 'text-slate-400 hover:bg-slate-200/70 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  );
}
