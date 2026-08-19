import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ShieldAlert, X, ArrowRight } from 'lucide-react';
import type { RiskLevel } from '../platform/types';

interface Props {
  open: boolean;
  title: string;
  description: string;
  riskLevel: RiskLevel;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmationModal({
  open,
  title,
  description,
  riskLevel,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;

  const isAdvanced = riskLevel === 'advanced';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md card p-6 shadow-2xl border z-10 space-y-4"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-line)' }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                style={
                  isAdvanced
                    ? { backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444', borderColor: 'rgba(239,68,68,0.25)' }
                    : { backgroundColor: 'rgba(245,158,11,0.12)', color: '#f59e0b', borderColor: 'rgba(245,158,11,0.25)' }
                }
              >
                {isAdvanced ? <ShieldAlert size={20} /> : <AlertTriangle size={20} />}
              </div>
              <div>
                <span
                  className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border mb-1"
                  style={
                    isAdvanced
                      ? { backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444', borderColor: 'rgba(239,68,68,0.25)' }
                      : { backgroundColor: 'rgba(245,158,11,0.12)', color: '#f59e0b', borderColor: 'rgba(245,158,11,0.25)' }
                  }
                >
                  {isAdvanced ? 'Advanced Operation' : 'Confirmation Required'}
                </span>
                <h3 className="text-base font-bold leading-snug" style={{ color: 'var(--color-ink)' }}>{title}</h3>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-3)' }}>
            {description}
          </p>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t" style={{ borderColor: 'var(--color-line)' }}>
            <button onClick={onCancel} className="btn btn-ghost text-xs !py-2 !px-3.5">
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className={`btn ${isAdvanced ? 'btn-danger' : 'btn-primary'} text-xs !py-2 !px-4`}
            >
              <span>Proceed</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
