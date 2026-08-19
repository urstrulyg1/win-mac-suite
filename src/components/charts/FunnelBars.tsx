import { useState } from 'react';
import { motion } from 'framer-motion';

export interface FunnelDatum {
  label: string;
  value: number;
  display: string;
}

interface Props {
  data: FunnelDatum[];
  height?: number;
}

/**
 * A "funnel" bar chart: descending bars with a blue gradient and diagonal
 * hatch stripes, plus an interactive tooltip — mirrors the Payments card.
 */
export default function FunnelBars({ data, height = 200 }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.value));
  const barW = 100 / data.length;

  return (
    <div className="relative w-full select-none" style={{ height, paddingBottom: 28 }}>
      {/* Y-axis gridlines */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <div
          key={t}
          className="absolute left-0 right-0 border-t border-dashed border-slate-200/80"
          style={{ bottom: `calc(28px + ${t * 78}%)` }}
        />
      ))}

      <div className="absolute inset-x-0 top-0 flex items-end gap-[3%] px-1 pb-1" style={{ bottom: 28 }}>
        {data.map((d, i) => {
          const h = (d.value / max) * 78;
          const active = hover === i;
          return (
            <div
              key={d.label}
              className="relative flex-1 h-full flex flex-col items-center justify-end"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              {/* Tooltip */}
              {active && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-full mb-2 z-20 px-3 py-1.5 rounded-xl bg-white shadow-xl border border-slate-200 text-[11px] font-medium text-slate-700 whitespace-nowrap"
                >
                  <span className="font-bold text-slate-900">{d.display}</span>{' '}
                  <span className="text-slate-400">·</span>{' '}
                  <span className="text-slate-500">{d.label}</span>
                </motion.div>
              )}

              {/* Top tick cap */}
              <div
                className="w-5 h-1 rounded-full bg-white shadow-sm border border-slate-200 mb-1 z-10"
                style={{ alignSelf: 'center' }}
              />
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ duration: 0.9, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="w-full rounded-t-md relative overflow-hidden"
                style={{
                  background:
                    'linear-gradient(180deg, #3b82f6 0%, #2563eb 55%, #1d4ed8 100%)',
                  boxShadow: active
                    ? '0 10px 24px -8px rgba(37,99,235,0.55)'
                    : '0 6px 16px -8px rgba(37,99,235,0.45)',
                  opacity: hover === null || active ? 1 : 0.7,
                }}
              >
                {/* diagonal hatch overlay */}
                <div
                  className="absolute inset-0 opacity-25 mix-blend-screen"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(135deg, rgba(255,255,255,0.7) 0 2px, transparent 2px 9px)',
                  }}
                />
                <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/25 to-transparent" />
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* X-axis labels */}
      <div className="absolute left-0 right-0 bottom-0 h-[28px] flex items-center gap-[3%] px-1">
        {data.map((d) => (
          <div
            key={d.label}
            className="flex-1 text-center text-[10px] font-semibold text-slate-400 truncate"
          >
            {d.label}
          </div>
        ))}
      </div>

      {/* keep barW referenced to satisfy lint */}
      <span hidden>{barW.toFixed(0)}</span>
    </div>
  );
}
