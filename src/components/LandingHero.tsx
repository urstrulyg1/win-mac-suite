import { motion } from 'framer-motion';
import { Shield, ChevronRight, Terminal, Activity, HardDrive, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';

interface Props {
  onStart: () => void;
}

const ease = [0.16, 1, 0.3, 1] as const;

export default function LandingHero({ onStart }: Props) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative px-4 sm:px-6 md:px-8 py-16 overflow-hidden">
      {/* Dynamic ambient backdrop illumination */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-blue-600/15 via-cyan-500/10 to-purple-600/15 rounded-full blur-[160px]" />
        <div className="absolute bottom-10 left-1/4 w-[400px] h-[400px] bg-blue-500/8 rounded-full blur-[140px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease }}
        className="w-full max-w-4xl relative z-10 flex flex-col items-center text-center my-auto"
      >
        {/* Shield Icon with glowing concentric rings */}
        <div className="relative mx-auto w-28 h-28 sm:w-32 sm:h-32 mb-8 flex items-center justify-center">
          {[0, 1].map((i) => (
            <motion.div
              key={i}
              className="absolute inset-0 rounded-3xl border border-blue-500/30"
              animate={{ scale: [1, 1.4 + i * 0.2], opacity: [0.35, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, delay: i * 1.2, ease: "easeOut" }}
            />
          ))}
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.15 }}
            className="relative z-10 w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-[#2563eb] via-[#3b82f6] to-[#7c3aed] flex items-center justify-center shadow-2xl shadow-blue-500/35 border border-white/25"
          >
            <Shield size={48} className="text-white drop-shadow-md" />
            <motion.div
              className="absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full bg-[#22c55e] border-3 border-[#0b0f1a] flex items-center justify-center shadow-lg"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: "spring" }}
            >
              <CheckCircle2 size={16} className="text-white" />
            </motion.div>
          </motion.div>
        </div>

        {/* Category Pill */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5, ease }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 text-xs font-bold uppercase tracking-widest mb-4 shadow-sm"
        >
          <Sparkles size={14} className="text-cyan-400 animate-pulse" />
          <span>Complete Windows System Suite</span>
        </motion.div>

        {/* Main Title */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6, ease }}
          className="text-fluid-hero font-extrabold tracking-tight mb-3 text-balance"
        >
          <span className="text-white">Update &amp; </span>
          <span className="bg-gradient-to-r from-[#3b82f6] via-[#06b6d4] to-[#a855f7] bg-clip-text text-transparent animate-gradient-shift">
            Optimization
          </span>
        </motion.h1>

        {/* Version Badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xs font-mono text-[var(--color-text-muted)] tracking-widest uppercase mb-6 px-3 py-1 rounded-md bg-white/[0.03] border border-white/[0.06]"
        >
          SUITE v5.0.0 · POWERSHELL 5.1+ · WINDOWS 10/11
        </motion.div>

        {/* Subtitle / Description */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5, ease }}
          className="text-[var(--color-text-secondary)] text-fluid-subtitle leading-relaxed max-w-2xl mb-10 text-pretty"
        >
          Multi-engine package updater, hardware diagnostics, Microsoft Defender synchronization,
          system integrity repairs (SFC &amp; DISM), and deep cache optimization in one unified interface.
        </motion.p>

        {/* 4 Distinct Feature Cards with clear layout */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75, duration: 0.5, ease }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4 w-full max-w-3xl mb-10"
        >
          {[
            { icon: Terminal, title: 'PowerShell Engine', desc: 'Winget, Choco, Pip, NPM' },
            { icon: ShieldCheck, title: 'Defender Sync', desc: 'Realtime Signature Refresh' },
            { icon: HardDrive, title: 'Driver Diagnostics', desc: 'PnP Hardware Error Audit' },
            { icon: Activity, title: 'SFC / DISM', desc: 'Integrity Repair & Health' },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + i * 0.06, ease }}
              className="glass p-4 rounded-xl text-left border border-white/[0.06] hover:border-blue-500/30 hover:bg-white/[0.04] transition-all group"
            >
              <f.icon size={20} className="text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-fluid-card-title font-semibold text-white truncate">{f.title}</p>
              <p className="text-fluid-card-desc text-[var(--color-text-muted)] mt-0.5 leading-snug">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA Launch Button with clear spacing */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.95, duration: 0.5, ease }}
          className="w-full sm:w-auto"
        >
          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={onStart}
            className="w-full sm:w-auto relative group inline-flex items-center justify-center gap-3.5 px-10 py-4.5 rounded-2xl bg-gradient-to-r from-[#2563eb] via-[#3b82f6] to-[#8b5cf6] text-white font-bold text-fluid-btn cursor-pointer shadow-2xl shadow-blue-500/30 border border-white/20 overflow-hidden"
          >
            {/* Shimmer effect */}
            <motion.div
              className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none"
              animate={{ x: ['-100%', '250%'] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.2 }}
            />
            <span className="relative z-10 tracking-wide font-semibold">Launch Suite</span>
            <ChevronRight size={20} className="relative z-10 group-hover:translate-x-1 transition-transform duration-200" />
          </motion.button>
        </motion.div>

        {/* Footer Note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.15 }}
          className="text-xs text-[var(--color-text-muted)] font-mono mt-8 tracking-wide"
        >
          #Requires -RunAsAdministrator · Administrator Privilege Required
        </motion.p>
      </motion.div>
    </div>
  );
}


