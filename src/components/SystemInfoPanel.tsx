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
      <div className="flex items-center justify-between gap-2 text-[12px]">
        <span className="font-semibold truncate" style={{ color: 'var(--color-ink-2)' }}>{label}</span>
        <span className="font-mono font-bold tabular-nums shrink-0" style={{ color: 'var(--color-ink)' }}>{value}{unit}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-surface-2)' }}>
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
    { icon: Monitor, k: 'Host', v: systemInfo.hostName || 'Local Host' },
    { icon: Cpu, k: 'Processor', v: systemInfo.processor || 'System CPU' },
    { icon: MemoryStick, k: 'Memory', v: systemInfo.ramGB > 0 ? `${systemInfo.ramGB} GB RAM` : '—' },
    { icon: HardDrive, k: 'Storage', v: systemInfo.totalDiskGB > 0 ? `${systemInfo.freeDiskGB} GB free / ${systemInfo.totalDiskGB} GB` : '—' },
    { icon: Clock, k: 'Uptime', v: systemInfo.uptime || '—' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="card p-5 sm:p-6"
    >
      <div className="flex items-center justify-between pb-4 mb-4 border-b" style={{ borderColor: 'var(--color-line)' }}>
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-blue-500" />
          <h3 className="text-[13px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-ink-2)' }}>System Telemetry</h3>
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
            className="flex items-center gap-3 p-2.5 rounded-xl text-[12.5px] min-w-0 border"
            style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
          >
            <div className="p-1.5 rounded-lg text-blue-500 border shrink-0 shadow-sm" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-line)' }}>
              <r.icon size={15} />
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="text-[10px] font-bold uppercase tracking-wider leading-none mb-0.5" style={{ color: 'var(--color-ink-4)' }}>{r.k}</p>
              <p title={r.v} className="font-semibold truncate leading-snug" style={{ color: 'var(--color-ink)' }}>{r.v}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="space-y-3.5 pt-4 mt-4 border-t" style={{ borderColor: 'var(--color-line)' }}>
        <h4 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-ink-4)' }}>Resource Utilization</h4>
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
        <div className="mt-5 p-3.5 rounded-xl border" style={{ backgroundColor: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.20)' }}>
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider mb-1 text-blue-500">
            <Sparkles size={12} />
            <span>Profile: {selectedMode}</span>
          </div>
          <p className="text-[11.5px] leading-relaxed" style={{ color: 'var(--color-ink-2)' }}>
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
