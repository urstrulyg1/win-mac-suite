import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, X, Check, AlertTriangle, ArrowRight, Wrench } from 'lucide-react';
import { modalPanel } from '../motion';

export interface RepairPreviewData {
  actionName: string;
  actionDescription: string;
  willChange: string[];
  willNotChange: string[];
  riskLevel: 'Low' | 'Medium' | 'High';
  reversible: boolean;
  onConfirm: () => void;
}

interface Props {
  data: RepairPreviewData | null;
  onClose: () => void;
}

export default function RepairPreviewModal({ data, onClose }: Props) {
  return (
    <AnimatePresence>
      {data && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          {...modalPanel}
          className="card max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-700/60 relative"
          style={{ backgroundColor: 'var(--color-surface)' }}
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 cursor-pointer p-1 rounded-lg hover:bg-slate-800"
          >
            <X size={18} />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/25 flex items-center justify-center">
              <Wrench size={20} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">REPAIR SAFETY PREVIEW</span>
              <h3 className="text-base font-extrabold" style={{ color: 'var(--color-ink)' }}>
                {data.actionName}
              </h3>
            </div>
          </div>

          <p className="text-xs text-slate-300">{data.actionDescription}</p>

          {/* Will Change vs Will NOT Change */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl border space-y-2 bg-amber-500/5 border-amber-500/20">
              <p className="font-bold text-amber-400 flex items-center gap-1.5">
                <AlertTriangle size={13} />
                <span>Will Change</span>
              </p>
              <div className="space-y-1">
                {data.willChange.map((item, idx) => (
                  <p key={idx} className="text-slate-300 text-[11px]">• {item}</p>
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border space-y-2 bg-emerald-500/5 border-emerald-500/20">
              <p className="font-bold text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck size={13} />
                <span>Will NOT Change</span>
              </p>
              <div className="space-y-1">
                {data.willNotChange.map((item, idx) => (
                  <p key={idx} className="text-slate-300 text-[11px]">✓ {item}</p>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--color-line)' }}>
            <span className="pill bg-slate-500/10 text-slate-400 border-slate-500/25 text-[10px]">
              Reversible: {data.reversible ? 'Yes (Manifest Logged)' : 'Irreversible'}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={onClose} className="btn btn-ghost text-xs px-3 py-2 cursor-pointer">
                Cancel
              </button>
              <button
                onClick={() => {
                  data.onConfirm();
                  onClose();
                }}
                className="btn btn-primary text-xs px-4 py-2 flex items-center gap-1.5 cursor-pointer font-bold"
              >
                <span>Authorize &amp; Execute</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}
