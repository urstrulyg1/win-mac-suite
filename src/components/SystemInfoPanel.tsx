import { motion } from 'framer-motion';
import { Monitor, Cpu, HardDrive, Wifi, WifiOff, Clock, MemoryStick, Activity, Sparkles } from 'lucide-react';
import type { SystemInfo, RunMode } from '../types';

interface Props {
  systemInfo: SystemInfo;
  selectedMode?: RunMode;
  live?: boolean;
}

function Bar({
  label, value, max, unit, color, delay = 0,
}: {
  label: string;
  value: number;
  max: number;
  unit: string;
  color: string;
  delay?: number;
}) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-xs sm:text-[13px]">
        <span className="text-slate-300 font-semibold">{label}</span>
        <span className="text-white font-mono font-bold tabular-nums">
          {value}{unit}
        </span>
      </div>
      <div className="h-2.5 bg-black/50 rounded-full overflow-hidden p-[1px] border border-white/[0.08]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: delay + 0.1 }}
          className="h-full rounded-full shadow-md"
          style={{ background: color }}
        />
      </div>
    </div>
  );
}

export default function SystemInfoPanel({ systemInfo, selectedMode, live = false }: Props) {
  const rows = [
    { icon: Monitor, k: 'Host Computer', v: systemInfo.hostName },
    { icon: Cpu, k: 'CPU Processor', v: systemInfo.processor },
    { icon: MemoryStick, k: 'System Memory', v: `${systemInfo.ramGB} GB DDR5 RAM` },
    { icon: HardDrive, k: 'Local Storage', v: `${systemInfo.freeDiskGB} GB Free / ${systemInfo.totalDiskGB} GB Total` },
    { icon: Clock, k: 'System Uptime', v: systemInfo.uptime },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="glass rounded-2xl p-5 sm:p-6 space-y-5 border border-white/[0.08] shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
        <div className="flex items-center gap-2.5">
          <Activity size={16} className="text-cyan-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            System Telemetry &amp; Specs
          </h3>
          {live && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-cyan-300 bg-cyan-500/10 border border-cyan-500/25">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-400" />
              </span>
              Live
            </span>
          )}
        </div>

        {/* Live Network Beacon */}
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border shadow-sm"
          style={{
            backgroundColor: systemInfo.isOnline ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            color: systemInfo.isOnline ? '#4ade80' : '#f87171',
            borderColor: systemInfo.isOnline ? 'rgba(34, 197, 94, 0.35)' : 'rgba(239, 68, 68, 0.35)',
          }}
        >
          <span className="relative flex h-2 w-2">
            {systemInfo.isOnline && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            )}
            <span
              className="relative inline-flex rounded-full h-2 w-2"
              style={{ backgroundColor: systemInfo.isOnline ? '#22c55e' : '#ef4444' }}
            />
          </span>
          <span>{systemInfo.isOnline ? 'Online' : 'Offline'}</span>
          {systemInfo.isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
        </div>
      </div>

      {/* Hardware Telemetry List */}
      <div className="space-y-3">
        {rows.map((r, i) => (
          <motion.div
            key={r.k}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.04, duration: 0.3 }}
            className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs sm:text-[13px] min-w-0"
          >
            <div className="p-2 rounded-lg bg-blue-500/10 text-cyan-400 shrink-0">
              <r.icon size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{r.k}</p>
              <p title={r.v} className="text-white font-medium truncate mt-0.5">
                {r.v}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Realtime Resource Utilization Meters */}
      <div className="space-y-4 pt-4 border-t border-white/[0.08]">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Resource Utilization
        </h4>
        <Bar
          label="Processor Load"
          value={systemInfo.cpuUsage}
          max={100}
          unit="%"
          color="linear-gradient(90deg, #3b82f6, #60a5fa)"
          delay={0}
        />
        <Bar
          label="Physical RAM Allocated"
          value={systemInfo.memoryUsage}
          max={100}
          unit="%"
          color="linear-gradient(90deg, #8b5cf6, #c084fc)"
          delay={0.06}
        />
        <Bar
          label="Primary Storage Volume"
          value={Math.round(((systemInfo.totalDiskGB - systemInfo.freeDiskGB) / systemInfo.totalDiskGB) * 100)}
          max={100}
          unit="%"
          color="linear-gradient(90deg, #06b6d4, #38bdf8)"
          delay={0.12}
        />
      </div>

      {/* Profile Insights Banner */}
      {selectedMode && (
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/25 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
            <Sparkles size={14} />
            <span>Profile Scope: {selectedMode}</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {selectedMode === 'Safe' && 'Applies full security & software updates with standard component verification.'}
            {selectedMode === 'Quick' && 'Fast-track update for apps, Store, and Defender. Skips deep integrity scans.'}
            {selectedMode === 'Aggressive' && 'Deep component cleanup with ResetBase compaction, Prefetch flush, and Storage Sense.'}
            {selectedMode === 'ScanOnly' && 'Performs non-destructive hardware diagnostics, SFC integrity, and DISM checks.'}
            {selectedMode === 'CleanupOnly' && 'Reclaims gigabytes of temporary update caches, crash dumps, and system files.'}
          </p>
        </div>
      )}
    </motion.div>
  );
}


