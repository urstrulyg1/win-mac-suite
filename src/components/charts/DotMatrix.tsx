import { motion } from 'framer-motion';
import { easeOut } from '../../motion';

interface Props {
  values: number[]; // 0..1 intensities
  columns?: number;
  rows?: number;
  color?: string;
  peakLabel?: string;
}

/**
 * A week-rhythm style dot matrix: columns of dots whose height/size reflects
 * intensity, with the peak column emphasized — mirrors Transactions/Customers.
 */
export default function DotMatrix({
  values, columns = 14, rows = 5, color = '#22c55e', peakLabel,
}: Props) {
  // Normalize into a grid of `columns` columns, each `rows` tall
  const cols: number[][] = [];
  const colLen = Math.ceil(values.length / columns);
  for (let c = 0; c < columns; c++) {
    const slice = values.slice(c * colLen, c * colLen + colLen);
    const avg = slice.length ? slice.reduce((a, b) => a + b, 0) / slice.length : 0;
    const filledRows = Math.round(avg * rows);
    cols.push(Array.from({ length: rows }, (_, r) => (r < filledRows ? 1 : 0)));
  }

  const peakCol = cols.reduce(
    (best, col, i) => (col.reduce((a, b) => a + b, 0) > cols[best].reduce((a, b) => a + b, 0) ? i : best),
    0,
  );

  return (
    <div className="relative">
      {peakLabel && (
        <div
          className="absolute -top-5 px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm border"
          style={{ left: `calc(${(peakCol / Math.max(columns - 1, 1)) * 100}% - 28px)`, backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-line)', color: 'var(--color-ink-2)' }}
        >
          {peakLabel}
        </div>
      )}
      <div className="flex items-end justify-between gap-[3px] h-10">
        {cols.map((col, ci) => {
          const isPeak = ci === peakCol;
          return (
            <div key={ci} className="flex flex-col-reverse gap-[3px] flex-1 items-center">
              {col.map((on, ri) => (
                <motion.div
                  key={ri}
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{
                    opacity: on ? (isPeak ? 1 : 0.85) : 0.18,
                    scale: 1,
                  }}
                  transition={{ delay: ci * 0.015 + ri * 0.015, duration: 0.22, ease: easeOut }}
                  className="w-full max-w-[7px] aspect-square rounded-full"
                  style={{
                    backgroundColor: on ? (isPeak ? color : `${color}cc`) : 'var(--color-surface-3)',
                  }}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
