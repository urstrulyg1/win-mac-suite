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
}: { label: string; value: number; max: number; unit: string; color: string; delay?: number }) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-[12px]">
        <span className="text-slate-600 font-semibold">{label}</span>
        <span className="text-slate-900 font-mono font-bold tabular-nums">{value}{unit}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}, ${color}bb)` }}
        />
      </div>
    </div>
  );
}

export default function SystemInfoPanel({ systemInfo, selectedMode, live = false }: Props) {
  const rows = [
    { icon: Monitor, k: 'Host', v: systemInfo.hostName },
    { icon: Cpu, k: 'Processor', v: systemInfo.processor },
    { icon: MemoryStick, k: 'Memory', v: `${systemInfo.ramGB} GB DDR5` },
    { icon: HardDrive, k: 'Storage', v: `${systemInfo.freeDiskGB} GB free / ${systemInfo.totalDiskGB} GB` },
    { icon: Clock, k: 'Uptime', v: systemInfo.uptime },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="card p-5 sm:p-6"
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-blue-600" />
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-700">System Telemetry</h3>
          {live && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-cyan-700 bg-cyan-50 border border-cyan-100">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-500" />
              </span>
              Live
            </span>
          )}
        </div>

        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border"
          style={{
            backgroundColor: systemInfo.isOnline ? 'rgba(22,163,74,0.10)' : 'rgba(220,38,38,0.10)',
            color: systemInfo.isOnline ? '#15803d' : '#b91c1c',
            borderColor: systemInfo.isOnline ? 'rgba(22,163,74,0.25)' : 'rgba(220,38,38,0.25)',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: systemInfo.isOnline ? '#16a34a' : '#dc2626' }}
          />
          {systemInfo.isOnline ? 'Online' : 'Offline'}
          {systemInfo.isOnline ? <Wifi size={11} /> : <WifiOff size={11} />}
        </div>
      </div>

      <div className="space-y-2">
        {rows.map((r, i) => (
          <motion.div
            key={r.k}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.04, duration: 0.3 }}
            className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 text-[12.5px] min-w-0"
          >
            <div className="p-1.5 rounded-lg bg-white text-blue-600 border border-slate-100 shrink-0 shadow-sm">
              <r.icon size={15} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{r.k}</p>
              <p title={r.v} className="text-slate-800 font-semibold truncate mt-px">{r.v}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="space-y-3.5 pt-4 mt-4 border-t border-slate-100">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Resource Utilization</h4>
        <Bar label="CPU" value={systemInfo.cpuUsage} max={100} unit="%" color="#2563eb" />
        <Bar label="Memory" value={systemInfo.memoryUsage} max={100} unit="%" color="#7c3aed" />
        <Bar
          label="Disk"
          value={Math.round(((systemInfo.totalDiskGB - systemInfo.freeDiskGB) / systemInfo.totalDiskGB) * 100)}
          max={100}
          unit="%"
          color="#0891b2"
        />
      </div>

      {selectedMode && (
        <div className="mt-5 p-3.5 rounded-xl bg-blue-50 border border-blue-100">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-1">
            <Sparkles size={12} />
            <span>Profile: {selectedMode}</span>
          </div>
          <p className="text-[11.5px] text-slate-600 leading-relaxed">
            {selectedMode === 'Safe' && 'Full security & software updates with standard component verification.'}
            {selectedMode === 'Quick' && 'Fast-track updates for apps, Store and Defender. Skips deep integrity scans.'}
            {selectedMode === 'Aggressive' && 'Deep component cleanup with ResetBase, Prefetch flush and Storage Sense.'}
            {selectedMode === 'ScanOnly' && 'Non-destructive hardware diagnostics plus SFC & DISM integrity checks.'}
            {selectedMode === 'CleanupOnly' && 'Reclaims temporary update caches, crash dumps and system files.'}
          </p>
        </div>
      )}
    </motion.div>
  );
}
