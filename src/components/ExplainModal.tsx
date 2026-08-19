import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

export interface ExplainData {
  title: string;
  metric: string;
  value: string | number;
  whatIsThis: string;
  isThisBad: string;
  whatShouldIDo: string;
}

interface Props {
  data: ExplainData | null;
  onClose: () => void;
}

export default function ExplainModal({ data, onClose }: Props) {
  if (!data) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="card max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-700/60 relative"
          style={{ backgroundColor: 'var(--color-surface)' }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 cursor-pointer p-1 rounded-lg hover:bg-slate-800"
          >
            <X size={18} />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/25 flex items-center justify-center">
              <HelpCircle size={20} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">EXPLAIN THIS</span>
              <h3 className="text-base font-extrabold" style={{ color: 'var(--color-ink)' }}>
                {data.title} ({data.value})
              </h3>
            </div>
          </div>

          {/* Q&A Sections */}
          <div className="space-y-3.5 text-xs">
            <div className="p-3.5 rounded-xl border space-y-1" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
              <p className="font-bold text-blue-400">What is this?</p>
              <p className="text-slate-300 leading-relaxed">{data.whatIsThis}</p>
            </div>

            <div className="p-3.5 rounded-xl border space-y-1" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
              <p className="font-bold text-amber-400">Is this bad?</p>
              <p className="text-slate-300 leading-relaxed">{data.isThisBad}</p>
            </div>

            <div className="p-3.5 rounded-xl border space-y-1" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
              <p className="font-bold text-emerald-400">What should I do?</p>
              <p className="text-slate-300 leading-relaxed">{data.whatShouldIDo}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full btn btn-primary py-2.5 text-xs font-bold cursor-pointer"
          >
            Got it, thanks!
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
