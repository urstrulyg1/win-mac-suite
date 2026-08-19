import { motion, AnimatePresence } from 'framer-motion';
import { X, Terminal, Copy } from 'lucide-react';
import { useState } from 'react';

export interface InspectorData {
  title: string;
  category?: string;
  badge?: string;
  badgeType?: 'success' | 'warning' | 'info' | 'error';
  subtitle?: string;
  details: { label: string; value: string | number; isCode?: boolean }[];
  command?: string;
  output?: string;
  actionButton?: {
    label: string;
    onClick: () => void;
    icon?: any;
    danger?: boolean;
  };
}

interface Props {
  data: InspectorData | null;
  onClose: () => void;
}

export default function InspectorModal({ data, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  if (!data) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-xl card p-5 sm:p-6 shadow-2xl border z-10 space-y-4 max-h-[85vh] overflow-y-auto overflow-x-hidden"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-line)' }}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 min-w-0">
            <div className="space-y-1 min-w-0 flex-1 overflow-hidden">
              <div className="flex items-center gap-2 flex-wrap">
                {data.category && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border truncate" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)', color: 'var(--color-ink-3)' }}>
                    {data.category}
                  </span>
                )}
                {data.badge && (
                  <span className={`pill text-[10px] truncate ${
                    data.badgeType === 'warning' ? 'bg-amber-500/10 text-amber-500 border-amber-500/25' :
                    data.badgeType === 'error' ? 'bg-red-500/10 text-red-500 border-red-500/25' :
                    'bg-emerald-500/10 text-emerald-500 border-emerald-500/25'
                  }`}>
                    {data.badge}
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-extrabold break-words" style={{ color: 'var(--color-ink)' }}>
                {data.title}
              </h3>
              {data.subtitle && (
                <p className="text-xs break-words leading-relaxed" style={{ color: 'var(--color-ink-3)' }}>
                  {data.subtitle}
                </p>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer shrink-0"
              aria-label="Close modal"
            >
              <X size={16} />
            </button>
          </div>

          {/* Details Table */}
          <div className="rounded-2xl border overflow-hidden divide-y text-xs min-w-0" style={{ borderColor: 'var(--color-line)' }}>
            {data.details.map((d, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-1 min-w-0" style={{ backgroundColor: 'var(--color-surface-2)' }}>
                <span className="font-semibold opacity-75 shrink-0" style={{ color: 'var(--color-ink-3)' }}>
                  {d.label}
                </span>
                <span className={`font-mono font-bold break-all text-left sm:text-right min-w-0 ${d.isCode ? 'text-blue-500' : ''}`} style={{ color: d.isCode ? '#3b82f6' : 'var(--color-ink)' }}>
                  {d.value}
                </span>
              </div>
            ))}
          </div>

          {/* Terminal Command & Output */}
          {data.command && (
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--color-ink-4)' }}>
                  <Terminal size={12} /> Execution &amp; Verification Probe
                </span>
                <button
                  onClick={() => handleCopy(data.command!)}
                  className="text-[11px] font-bold text-blue-500 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Copy size={11} /> {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-xs overflow-x-auto break-all">
                $ {data.command}
              </div>
            </div>
          )}

          {data.output && (
            <div className="space-y-1.5 min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-60" style={{ color: 'var(--color-ink-4)' }}>
                Diagnostic Output
              </span>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[11px] whitespace-pre-wrap break-all max-h-36 overflow-y-auto">
                {data.output}
              </div>
            </div>
          )}

          {/* Action Button */}
          {data.actionButton && (
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => {
                  data.actionButton!.onClick();
                  onClose();
                }}
                className={`btn text-xs !py-2.5 !px-4 ${data.actionButton.danger ? 'btn-danger' : 'btn-primary'} cursor-pointer flex items-center gap-1.5`}
              >
                {data.actionButton.icon && <data.actionButton.icon size={13} />}
                <span>{data.actionButton.label}</span>
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
