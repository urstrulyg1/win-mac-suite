import { motion, AnimatePresence } from 'framer-motion';
import { X, Info, CheckCircle2, AlertTriangle, ShieldCheck, Terminal, Copy } from 'lucide-react';
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
          className="relative w-full max-w-xl card p-6 shadow-2xl border z-10 space-y-4 max-h-[85vh] overflow-y-auto"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-line)' }}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {data.category && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)', color: 'var(--color-ink-3)' }}>
                    {data.category}
                  </span>
                )}
                {data.badge && (
                  <span className={`pill text-[10px] ${
                    data.badgeType === 'warning' ? 'bg-amber-500/10 text-amber-500 border-amber-500/25' :
                    data.badgeType === 'error' ? 'bg-red-500/10 text-red-500 border-red-500/25' :
                    'bg-emerald-500/10 text-emerald-500 border-emerald-500/25'
                  }`}>
                    {data.badge}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-extrabold" style={{ color: 'var(--color-ink)' }}>
                {data.title}
              </h3>
              {data.subtitle && (
                <p className="text-xs" style={{ color: 'var(--color-ink-3)' }}>
                  {data.subtitle}
                </p>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Details Table */}
          <div className="rounded-2xl border overflow-hidden divide-y text-xs" style={{ borderColor: 'var(--color-line)' }}>
            {data.details.map((d, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-1" style={{ backgroundColor: 'var(--color-surface-2)' }}>
                <span className="font-semibold opacity-75" style={{ color: 'var(--color-ink-3)' }}>
                  {d.label}
                </span>
                <span className={`font-mono font-bold break-all ${d.isCode ? 'text-blue-500' : ''}`} style={{ color: d.isCode ? '#3b82f6' : 'var(--color-ink)' }}>
                  {d.value}
                </span>
              </div>
            ))}
          </div>

          {/* Terminal Command & Output */}
          {data.command && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--color-ink-4)' }}>
                  <Terminal size={12} /> Execution &amp; Verification Probe
                </span>
                <button
                  onClick={() => handleCopy(data.command!)}
                  className="text-[11px] font-bold text-blue-500 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Copy size={11} /> {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-xs overflow-x-auto">
                $ {data.command}
              </div>
            </div>
          )}

          {data.output && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-60" style={{ color: 'var(--color-ink-4)' }}>
                Diagnostic Output
              </span>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[11px] whitespace-pre-wrap max-h-36 overflow-y-auto">
                {data.output}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--color-line)' }}>
            <button onClick={onClose} className="btn btn-ghost text-xs !py-2 !px-3.5">
              Close
            </button>
            {data.actionButton && (
              <button
                onClick={() => {
                  data.actionButton!.onClick();
                  onClose();
                }}
                className={`btn ${data.actionButton.danger ? 'btn-danger' : 'btn-primary'} text-xs !py-2 !px-4`}
              >
                {data.actionButton.icon && <data.actionButton.icon size={13} />}
                <span>{data.actionButton.label}</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
