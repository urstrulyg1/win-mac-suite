import { motion } from 'framer-motion';
import { Shield, Zap, Flame, Search, Trash2, Check, Sparkles } from 'lucide-react';
import type { RunMode } from '../types';
import { MODE_DESCRIPTIONS } from '../data';

interface Props {
  selectedMode: RunMode;
  onSelect: (mode: RunMode) => void;
}

const iconMap: Record<string, React.ComponentType<any>> = { Shield, Zap, Flame, Search, Trash2 };
const colorMap: Record<string, { solid: string; glow: string; bg: string; border: string }> = {
  blue:   { solid: '#3b82f6', glow: 'rgba(59, 130, 246, 0.3)', bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.4)' },
  cyan:   { solid: '#06b6d4', glow: 'rgba(6, 182, 212, 0.3)', bg: 'rgba(6, 182, 212, 0.15)', border: 'rgba(6, 182, 212, 0.4)' },
  orange: { solid: '#f97316', glow: 'rgba(249, 115, 22, 0.3)', bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.4)' },
  purple: { solid: '#a855f7', glow: 'rgba(168, 85, 247, 0.3)', bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.4)' },
  green:  { solid: '#22c55e', glow: 'rgba(34, 197, 94, 0.3)', bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.4)' },
};

export default function ModeSelector({ selectedMode, onSelect }: Props) {
  const modes = Object.entries(MODE_DESCRIPTIONS) as [RunMode, (typeof MODE_DESCRIPTIONS)[RunMode]][];

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between px-1 pb-1">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Sparkles size={14} className="text-cyan-400" />
          <span>Select Maintenance Profile</span>
        </h3>
        <span className="text-xs text-slate-400 font-mono">
          {modes.length} Presets Available
        </span>
      </div>

      <div className="space-y-3">
        {modes.map(([mode, info], i) => {
          const Icon = iconMap[info.icon] || Shield;
          const color = colorMap[info.color] || colorMap.blue;
          const sel = selectedMode === mode;

          return (
            <motion.button
              key={mode}
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.992 }}
              onClick={() => onSelect(mode)}
              className={`
                w-full relative flex items-center gap-4 p-4 sm:p-4.5 rounded-2xl text-left cursor-pointer
                transition-all duration-200 group overflow-hidden
                ${sel
                  ? 'bg-slate-800/80 border-2 border-blue-500 shadow-xl shadow-blue-500/15'
                  : 'glass border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.12]'
                }
              `}
            >
              {/* Left accent indicator */}
              {sel && (
                <motion.div
                  layoutId="active-mode-bar"
                  className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full"
                  style={{ backgroundColor: color.solid, boxShadow: `0 0 12px ${color.solid}` }}
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}

              {/* Icon */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 duration-200 border"
                style={{
                  backgroundColor: color.bg,
                  color: color.solid,
                  borderColor: sel ? color.border : 'transparent',
                  boxShadow: sel ? `0 0 20px ${color.glow}` : 'none',
                }}
              >
                <Icon size={22} className="stroke-[2.2]" />
              </div>

              {/* Text Information */}
              <div className="flex-1 min-w-0 pr-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-fluid-card-title font-bold text-white group-hover:text-blue-200 transition-colors">
                    {info.label}
                  </span>
                  {mode === 'Safe' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 font-bold border border-blue-500/35 uppercase tracking-wider">
                      Recommended
                    </span>
                  )}
                  {mode === 'Aggressive' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-400 font-bold border border-orange-500/35 uppercase tracking-wider">
                      Deep Clean
                    </span>
                  )}
                  {mode === 'ScanOnly' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-400 font-bold border border-purple-500/35 uppercase tracking-wider">
                      Read Only
                    </span>
                  )}
                </div>
                <p className="text-fluid-card-desc text-slate-300 mt-1 leading-relaxed break-word-safe">
                  {info.description}
                </p>
              </div>

              {/* Radio Indicator */}
              <div className="shrink-0 self-center pl-1">
                {sel ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 450, damping: 22 }}
                    className="w-7 h-7 rounded-full flex items-center justify-center shadow-md"
                    style={{ backgroundColor: color.solid }}
                  >
                    <Check size={16} className="text-white stroke-[3]" />
                  </motion.div>
                ) : (
                  <div className="w-7 h-7 rounded-full border-2 border-white/15 group-hover:border-white/30 transition-colors" />
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}


