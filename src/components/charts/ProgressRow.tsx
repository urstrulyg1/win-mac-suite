import { motion } from 'framer-motion';

interface Props {
  label: string;
  value: number;
  total: number;
  display: string;
  color?: string;
  delay?: number;
}

/**
 * A labeled horizontal progress row with a colored track and large value —
 * used in the Gross Volume style cards.
 */
export default function ProgressRow({
  label, value, total, display, color = '#2563eb', delay = 0,
}: Props) {
  const pct = Math.min(100, Math.max(0, (value / total) * 100));

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-semibold text-slate-600">{label}</span>
        <span className="text-[13px] font-bold text-slate-900 tabular-nums">{display}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, delay, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          }}
        />
      </div>
    </div>
  );
}
