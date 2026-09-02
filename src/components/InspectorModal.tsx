import { motion, AnimatePresence } from 'framer-motion';
import { modalBackdrop, modalPanel, expandMotion } from '../motion';
import { X, Terminal, Copy, Shield, Database, Clock, HelpCircle, Sparkles, Code2 } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';

export interface InspectorData {
  title: string;
  category?: string;
  badge?: string;
  badgeType?: 'success' | 'warning' | 'info' | 'error';
  subtitle?: string;
  details: { label: string; value: string | number; isCode?: boolean }[];
  dataSource?: string;
  timestamp?: string;
  freshness?: 'Live' | 'Recently Updated' | 'Stale' | 'Unavailable';
  evidenceQuality?: 'Observed' | 'Inferred' | 'Estimated' | 'Stale' | 'Unavailable';
  explanation?: string;
  statusReason?: string;
  requiredPermissions?: string[];
  verificationStatus?: string;
  historyInfo?: string;
  command?: string;
  output?: string;
  rawTelemetry?: any;
  actionButton?: {
    label: string;
    onClick: () => void;
    icon?: any;
    danger?: boolean;
  };
}

interface Props {
  data?: InspectorData | null;
  item?: InspectorData | null;
  onClose: () => void;
}

export default function InspectorModal({ data, item, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const modalData = data || item;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const qualityColor =
    modalData?.evidenceQuality === 'Observed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25' :
    modalData?.evidenceQuality === 'Inferred' ? 'bg-blue-500/10 text-blue-400 border-blue-500/25' :
    modalData?.evidenceQuality === 'Estimated' ? 'bg-amber-500/10 text-amber-500 border-amber-500/25' :
    modalData?.evidenceQuality === 'Unavailable' ? 'bg-red-500/10 text-red-500 border-red-500/25' :
    'bg-slate-500/10 text-slate-400 border-slate-500/25';

  return createPortal(
    <AnimatePresence>
      {modalData && (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop — rendered via portal, covers everything including sticky nav */}
        <motion.div
          {...modalBackdrop}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          {...modalPanel}
          className="relative w-full max-w-2xl card p-5 sm:p-6 shadow-2xl border z-10 space-y-4 max-h-[88vh] overflow-y-auto overflow-x-hidden"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-line)' }}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 min-w-0">
            <div className="space-y-1.5 min-w-0 flex-1 overflow-hidden">
              <div className="flex items-center gap-2 flex-wrap">
                {modalData.category && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border truncate" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)', color: 'var(--color-ink-3)' }}>
                    {modalData.category}
                  </span>
                )}
                {modalData.evidenceQuality && (
                  <span className={`pill text-[10px] font-mono font-bold border ${qualityColor}`}>
                    Evidence: {modalData.evidenceQuality}
                  </span>
                )}
                {modalData.freshness && (
                  <span className="pill text-[10px] font-mono bg-blue-500/10 text-blue-400 border-blue-500/25">
                    <Clock size={10} className="inline mr-1" />
                    {modalData.freshness}
                  </span>
                )}
                {modalData.badge && (
                  <span className={`pill text-[10px] truncate ${
                    modalData.badgeType === 'warning' ? 'bg-amber-500/10 text-amber-500 border-amber-500/25' :
                    modalData.badgeType === 'error' ? 'bg-red-500/10 text-red-500 border-red-500/25' :
                    'bg-emerald-500/10 text-emerald-500 border-emerald-500/25'
                  }`}>
                    {modalData.badge}
                  </span>
                )}
              </div>

              <h3 className="text-base sm:text-lg font-extrabold break-words flex items-center gap-2" style={{ color: 'var(--color-ink)' }}>
                {modalData.title}
              </h3>
              {modalData.subtitle && (
                <p className="text-xs break-words leading-relaxed" style={{ color: 'var(--color-ink-3)' }}>
                  {modalData.subtitle}
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

          {/* Explanation / Status rationale */}
          {(modalData.explanation || modalData.statusReason) && (
            <div className="p-3.5 rounded-xl border text-xs space-y-1.5" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
              {modalData.explanation && (
                <div className="flex items-start gap-2">
                  <HelpCircle size={14} className="text-blue-500 shrink-0 mt-0.5" />
                  <p className="leading-relaxed text-slate-300">
                    <strong className="text-slate-200">What this means:</strong> {modalData.explanation}
                  </p>
                </div>
              )}
              {modalData.statusReason && (
                <div className="flex items-start gap-2 pt-1 border-t border-slate-700/40">
                  <Sparkles size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                  <p className="leading-relaxed text-slate-300">
                    <strong className="text-slate-200">Why this score/status:</strong> {modalData.statusReason}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Details Table */}
          <div className="rounded-2xl border overflow-hidden divide-y text-xs min-w-0" style={{ borderColor: 'var(--color-line)' }}>
            {modalData.details.map((d, i) => (
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

          {/* Data Source & Permissions Traceability */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
            {modalData.dataSource && (
              <div className="p-2.5 rounded-xl border flex items-center gap-2 truncate" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                <Database size={12} className="text-blue-500 shrink-0" />
                <span className="text-slate-400">Source:</span>
                <span className="text-slate-200 font-bold truncate">{modalData.dataSource}</span>
              </div>
            )}
            {modalData.requiredPermissions && modalData.requiredPermissions.length > 0 && (
              <div className="p-2.5 rounded-xl border flex items-center gap-2 truncate" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                <Shield size={12} className="text-amber-500 shrink-0" />
                <span className="text-slate-400">Permissions:</span>
                <span className="text-slate-200 font-bold truncate">{modalData.requiredPermissions.join(', ')}</span>
              </div>
            )}
          </div>

          {/* Terminal Command & Output */}
          {modalData.command && (
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--color-ink-4)' }}>
                  <Terminal size={12} /> Execution &amp; Verification Probe
                </span>
                <button
                  onClick={() => handleCopy(modalData.command!)}
                  className="text-[11px] font-bold text-blue-500 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Copy size={11} /> {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-xs overflow-x-auto break-all">
                $ {modalData.command}
              </div>
            </div>
          )}

          {modalData.output && (
            <div className="space-y-1.5 min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-60" style={{ color: 'var(--color-ink-4)' }}>
                Diagnostic Output
              </span>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[11px] whitespace-pre-wrap break-all max-h-36 overflow-y-auto">
                {modalData.output}
              </div>
            </div>
          )}

          {/* Raw Telemetry Accordion */}
          {modalData.rawTelemetry && (
            <div className="space-y-1.5">
              <button
                onClick={() => setShowRaw((v) => !v)}
                className="text-[11px] font-bold text-blue-500 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Code2 size={12} /> {showRaw ? 'Hide Raw Telemetry Payload' : 'Inspect Raw Telemetry JSON'}
              </button>
              <AnimatePresence initial={false}>
                {showRaw && (
                  <motion.div
                    {...expandMotion}
                    className="overflow-hidden"
                  >
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[10px] whitespace-pre overflow-x-auto max-h-44 overflow-y-auto">
                      {JSON.stringify(modalData.rawTelemetry, null, 2)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Action Button */}
          {modalData.actionButton && (
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => {
                  modalData.actionButton!.onClick();
                  onClose();
                }}
                className={`btn text-xs !py-2.5 !px-4 ${modalData.actionButton.danger ? 'btn-danger' : 'btn-primary'} cursor-pointer flex items-center gap-1.5`}
              >
                {modalData.actionButton.icon && <modalData.actionButton.icon size={13} />}
                <span>{modalData.actionButton.label}</span>
              </button>
            </div>
          )}
        </motion.div>
      </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
