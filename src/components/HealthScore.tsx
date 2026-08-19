import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';

interface Props {
  score: number;
  size?: number;
}

export default function HealthScore({ score, size = 160 }: Props) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number | undefined>(undefined);
  const strokeWidth = 8;
  const r = (size - strokeWidth * 2 - 4) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(score, 100)) / 100) * c;

  const color =
    score >= 90 ? '#22c55e' : score >= 75 ? '#06b6d4' : score >= 60 ? '#eab308' : '#ef4444';
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
    const duration = 1800;

    const animate = (time: number) => {
      const elapsed = time - start;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo for natural deceleration
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplay(Math.round(score * ease));

      if (progress < 1) {
        raf.current = requestAnimationFrame(animate);
      }
    };

    raf.current = requestAnimationFrame(animate);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [score]);

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center gap-3 select-none"
    >
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        {/* Soft dynamic backdrop blur glow */}
        <div
          className="absolute inset-4 rounded-full blur-2xl opacity-20 transition-colors duration-700"
          style={{ backgroundColor: color }}
        />

        {/* SVG Radial Meter */}
        <svg width={size} height={size} className="transform -rotate-90 relative z-10">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgba(255, 255, 255, 0.05)"
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
            transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
            style={{ filter: `drop-shadow(0 0 8px ${color}60)` }}
          />
        </svg>

        {/* Center Score Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
          <span className="text-4xl font-extrabold tracking-tight font-mono tabular-nums text-white">
            {display}
          </span>
          <span className="text-[10px] uppercase font-mono tracking-widest text-[var(--color-text-muted)] mt-0.5">
            / 100 Score
          </span>
        </div>
      </div>

      {/* Grade and Subtitle */}
      <div className="text-center">
        <span
          className="inline-block px-3 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border shadow-sm"
          style={{
            color,
            backgroundColor: `${color}15`,
            borderColor: `${color}35`,
          }}
        >
          {grade}
        </span>
        <p className="text-[11px] text-[var(--color-text-muted)] mt-1 font-medium">
          Overall System Health Index
        </p>
      </div>
    </motion.div>
  );
}

