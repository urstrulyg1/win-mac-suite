import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Minus, Plus, Copy, Check } from 'lucide-react';
import type { LogEntry } from '../types';

const logColors: Record<string, { badge: string; text: string; bg: string }> = {
  INFO:    { badge: '#94a3b8', text: '#cbd5e1', bg: 'rgba(148, 163, 184, 0.1)' },
  SUCCESS: { badge: '#22c55e', text: '#86efac', bg: 'rgba(34, 197, 94, 0.12)' },
  WARNING: { badge: '#eab308', text: '#fde047', bg: 'rgba(234, 179, 8, 0.12)' },
  ERROR:   { badge: '#ef4444', text: '#fca5a5', bg: 'rgba(239, 68, 68, 0.15)' },
};

interface Props {
  logs: LogEntry[];
  isRunning: boolean;
}

export default function TerminalLog({ logs, isRunning }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTo({
        top: ref.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [logs.length]);

  const copyLogs = () => {
    const text = logs.map((l) => `[${l.time}] [${l.level}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass rounded-xl overflow-hidden border border-white/[0.08] shadow-2xl">
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-black/50 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          {/* Window control dots */}
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444] shadow-sm shadow-red-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#eab308] shadow-sm shadow-yellow-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#22c55e] shadow-sm shadow-green-500/50" />
          </div>

          <div className="flex items-center gap-2">
            <Terminal size={13} className="text-cyan-400" />
            <span className="text-xs text-[var(--color-text-secondary)] font-mono font-medium">
              PowerShell 5.1 — UpdateAll v5.0
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {logs.length > 0 && (
            <button
              onClick={copyLogs}
              title="Copy terminal logs"
              className="p-1.5 rounded-md hover:bg-white/10 text-[var(--color-text-muted)] hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-mono"
            >
              {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand terminal' : 'Minimize terminal'}
            className="p-1.5 rounded-md hover:bg-white/10 text-[var(--color-text-muted)] hover:text-white transition-colors cursor-pointer"
          >
            {collapsed ? <Plus size={13} /> : <Minus size={13} />}
          </button>
        </div>
      </div>

      {/* Terminal Viewport */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 260 }}
            exit={{ height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div
              ref={ref}
              className="h-[260px] overflow-y-auto px-4 py-3 font-mono text-[11px] leading-relaxed bg-[#070b12]/95 selection:bg-blue-500/30 selection:text-white space-y-1"
            >
              {logs.length === 0 && (
                <div className="flex items-center gap-2 text-[var(--color-text-muted)] py-1">
                  <span className="text-[#22c55e] font-bold">PS C:\&gt;</span>
                  <span>Session ready. Awaiting trigger...</span>
                  <span className="animate-terminal-blink text-[#22c55e]">▋</span>
                </div>
              )}

              {logs.map((l, i) => {
                const col = logColors[l.level] || logColors.INFO;
                return (
                  <motion.div
                    key={i}
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
                    <span
                      className="break-word-safe flex-1 text-xs"
                      style={{ color: col.text }}
                    >
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

