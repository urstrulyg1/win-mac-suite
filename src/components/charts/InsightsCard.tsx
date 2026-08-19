import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
  metric: string;
  metricSuffix?: string;
  title: string;
  description: string;
  progress?: number; // 0..1
  icon?: ReactNode;
  className?: string;
}

/**
 * A bold gradient "Insights" card with a giant metric and a segmented progress
 * footer — the signature hero tile from the reference.
 */
export default function InsightsCard({
  metric, metricSuffix, title, description, progress = 0.75,
  icon, className = '',
}: Props) {
  const segments = 5;
  const filled = Math.round(progress * segments);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`relative overflow-hidden rounded-[22px] p-6 text-white flex flex-col justify-between min-h-[260px] ${className}`}
      style={{
        background:
          'linear-gradient(135deg, #1e3a8a 0%, #2563eb 32%, #0ea5e9 52%, #f59e0b 78%, #fb923c 100%)',
      }}
    >
      {/* glossy overlays */}
      <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-white/15 blur-2xl" />
      <div className="absolute -bottom-16 -left-10 w-52 h-52 rounded-full bg-indigo-900/30 blur-3xl" />
      <div
        className="absolute inset-0 opacity-[0.12] mix-blend-overlay"
        style={{
          backgroundImage:
            'radial-gradient(circle at 80% 20%, #fff 0, transparent 40%), radial-gradient(circle at 20% 80%, #fff 0, transparent 35%)',
        }}
      />

      <div className="relative z-10">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/25 text-[11px] font-bold uppercase tracking-wider">
          {icon ?? <Lightbulb size={12} />}
          Insights
        </div>
      </div>

      <div className="relative z-10">
        <div className="text-6xl sm:text-7xl font-extrabold tracking-tighter leading-none drop-shadow-sm">
          {metric}
          {metricSuffix && <span className="text-4xl align-top ml-1">{metricSuffix}</span>}
        </div>

        <p className="mt-5 text-lg font-bold leading-snug text-white drop-shadow">{title}</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-white/85 max-w-sm">{description}</p>

        {/* segmented progress */}
        <div className="mt-5 flex items-center gap-1.5 max-w-[220px]">
          {Array.from({ length: segments }).map((_, i) => (
            <div
              key={i}
              className="h-1.5 flex-1 rounded-full overflow-hidden bg-white/20"
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: i < filled ? '100%' : '0%' }}
                transition={{ duration: 0.6, delay: 0.4 + i * 0.08 }}
                className="h-full bg-white/90 rounded-full"
              />
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
