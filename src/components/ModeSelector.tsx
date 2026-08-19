import { motion } from 'framer-motion';
import { Shield, Zap, Flame, Search, Trash2, Check } from 'lucide-react';
import type { RunMode } from '../types';
import { MODE_DESCRIPTIONS } from '../data';

interface Props {
  selectedMode: RunMode;
  onSelect: (mode: RunMode) => void;
}

const iconMap: Record<string, React.ComponentType<any>> = { Shield, Zap, Flame, Search, Trash2 };

const tones: Record<string, { ring: string; soft: string; text: string; solid: string }> = {
  blue:   { ring: '#2563eb', soft: 'rgba(37,99,235,0.10)',  text: '#2563eb', solid: '#2563eb' },
  cyan:   { ring: '#0891b2', soft: 'rgba(8,145,178,0.10)',  text: '#0891b2', solid: '#06b6d4' },
  orange: { ring: '#ea580c', soft: 'rgba(234,88,12,0.10)',  text: '#ea580c', solid: '#f97316' },
  purple: { ring: '#7c3aed', soft: 'rgba(124,58,237,0.10)', text: '#7c3aed', solid: '#8b5cf6' },
  green:  { ring: '#16a34a', soft: 'rgba(22,163,74,0.10)',  text: '#16a34a', solid: '#22c55e' },
};

export default function ModeSelector({ selectedMode, onSelect }: Props) {
  const modes = Object.entries(MODE_DESCRIPTIONS) as [RunMode, (typeof MODE_DESCRIPTIONS)[RunMode]][];

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Maintenance Profile</h3>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Choose how aggressively the suite runs</p>
        </div>
        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
          {modes.length} presets
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {modes.map(([mode, info], i) => {
          const Icon = iconMap[info.icon] || Shield;
          const tone = tones[info.color] || tones.blue;
          const sel = selectedMode === mode;

          return (
            <motion.button
              key={mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onSelect(mode)}
              className={`relative text-left p-4 rounded-2xl border-2 transition-all cursor-pointer overflow-hidden flex flex-col ${
                sel ? 'bg-white shadow-lg' : 'bg-slate-50/60 hover:bg-white border-transparent'
              }`}
              style={{
                borderColor: sel ? tone.ring : 'transparent',
                boxShadow: sel ? `0 12px 28px -14px ${tone.ring}66` : undefined,
              }}
            >
              {sel && (
                <motion.div
                  layoutId="mode-check"
                  className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0"
                  style={{ backgroundColor: tone.solid }}
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                >
                  <Check size={13} strokeWidth={3} />
                </motion.div>
              )}

              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 shrink-0"
                style={{ backgroundColor: tone.soft, color: tone.text }}
              >
                <Icon size={20} />
              </div>

              <div className="flex items-center gap-2 pr-8 mb-1.5">
                <p className="text-[14px] font-bold text-slate-900 leading-tight">{info.label}</p>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed pr-8 flex-1">{info.description}</p>

              {mode === 'Safe' && (
                <span className="inline-block mt-3 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 self-start">
                  Recommended
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
