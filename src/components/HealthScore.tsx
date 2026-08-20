import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { easeOut } from '../motion';

interface Props {
  score: number;
  size?: number;
}

export default function HealthScore({ score, size = 170 }: Props) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number | undefined>(undefined);
  const strokeWidth = 10;
  const r = (size - strokeWidth * 2 - 4) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(score, 100)) / 100) * c;

  const color =
    score >= 90 ? '#16a34a' : score >= 75 ? '#0891b2' : score >= 60 ? '#d97706' : '#dc2626';
  const grade =
    score >= 95
      ? 'Optimal State'
      : score >= 90
      ? 'Very Good'
      : score >= 75
      ? 'Good Condition'
      : score >= 60
      ? 'Fair'
      : 'Attention Required';

  useEffect(() => {
    const start = performance.now();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setDisplay(Math.round(score));
      return;
    }
    const duration = 1100;
    const animate = (time: number) => {
      const progress = Math.min((time - start) / duration, 1);
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplay(Math.round(score * ease));
      if (progress < 1) raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [score]);

  return (
    <motion.div
      initial={{ scale: 0.96, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.4, ease: easeOut }}
      className="flex flex-col items-center gap-3 select-none"
    >
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <div
          className="absolute inset-4 rounded-full blur-2xl opacity-20"
          style={{ backgroundColor: color }}
        />
        <svg width={size} height={size} className="transform -rotate-90 relative z-10">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--color-surface-2)"
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.1, ease: easeOut, delay: 0.06 }}
            style={{ filter: `drop-shadow(0 4px 8px ${color}40)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
          <span className="text-5xl font-extrabold tracking-tight font-mono tabular-nums" style={{ color: 'var(--color-ink)' }}>
            {display}
          </span>
          <span className="text-[10px] uppercase font-mono tracking-widest mt-0.5" style={{ color: 'var(--color-ink-4)' }}>
            / 100 Score
          </span>
        </div>
      </div>
      <div className="text-center">
        <span
          className="inline-block px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border"
          style={{ color, backgroundColor: `${color}14`, borderColor: `${color}40` }}
        >
          {grade}
        </span>
        <p className="text-[11px] mt-1 font-medium" style={{ color: 'var(--color-ink-4)' }}>Overall System Health Index</p>
      </div>
    </motion.div>
  );
}
