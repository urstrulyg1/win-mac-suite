import { motion } from 'framer-motion';
import { progressTween } from '../../motion';

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
        <span className="text-[13px] font-semibold" style={{ color: 'var(--color-ink-2)' }}>{label}</span>
        <span className="text-[13px] font-bold tabular-nums" style={{ color: 'var(--color-ink)' }}>{display}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-surface-2)' }}>
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: pct / 100 }}
          transition={{ ...progressTween, delay }}
          className="h-full rounded-full origin-left"
          style={{
            background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          }}
        />
      </div>
    </div>
  );
}
