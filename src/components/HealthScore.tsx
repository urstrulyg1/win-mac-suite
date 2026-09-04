import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { easeOut } from '../motion';

interface Props { score: number | null; size?: number; }

export default function HealthScore({ score, size = 170 }: Props) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number | undefined>(undefined);
  const strokeWidth = 10;
  const r = (size - strokeWidth * 2 - 4) / 2;
  const c = 2 * Math.PI * r;
  const observed = Number.isFinite(score);
  const safeScore = observed ? Math.max(0, Math.min(score as number, 100)) : 0;
  const offset = c - (safeScore / 100) * c;
  const color = !observed ? '#64748b' : safeScore >= 90 ? '#16a34a' : safeScore >= 75 ? '#0891b2' : safeScore >= 60 ? '#d97706' : '#dc2626';
  const grade = !observed ? 'UNAVAILABLE' : safeScore >= 95 ? 'Excellent' : safeScore >= 90 ? 'Very Good' : safeScore >= 75 ? 'Good' : safeScore >= 60 ? 'Fair' : 'Attention Required';

  useEffect(() => {
    if (!observed) { setDisplay(0); return; }
    const start = performance.now();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setDisplay(Math.round(safeScore)); return; }
    const duration = 900;
    const animate = (time: number) => {
      const progress = Math.min((time - start) / duration, 1);
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplay(Math.round(safeScore * ease));
      if (progress < 1) raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [observed, safeScore]);

  return (
    <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4, ease: easeOut }} className="flex flex-col items-center gap-3 select-none">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <div className="absolute inset-4 rounded-full blur-2xl opacity-20" style={{ backgroundColor: color }} />
        <svg width={size} height={size} className="transform -rotate-90 relative z-10">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-surface-2)" strokeWidth={strokeWidth} />
          {observed && <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: offset }} transition={{ duration: 1.1, ease: easeOut, delay: 0.06 }} />}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
          <span className="text-4xl font-extrabold tracking-tight font-mono tabular-nums" style={{ color: 'var(--color-ink)' }}>{observed ? display : 'N/A'}</span>
          <span className="text-[10px] uppercase font-mono tracking-widest mt-0.5" style={{ color: 'var(--color-ink-4)' }}>{observed ? '/ 100 Score' : 'NOT MEASURED'}</span>
        </div>
      </div>
      <div className="text-center">
        <span className="inline-block px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border" style={{ color, backgroundColor: `${color}14`, borderColor: `${color}40` }}>{grade}</span>
        <p className="text-[11px] mt-1 font-medium" style={{ color: 'var(--color-ink-4)' }}>{observed ? 'Derived from observed maintenance results' : 'No verified health score was produced'}</p>
      </div>
    </motion.div>
  );
}
