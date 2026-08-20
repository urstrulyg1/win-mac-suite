import { useState } from 'react';
import { motion } from 'framer-motion';
import { easeOut, progressTween } from '../motion';
import { Monitor, Cpu, HardDrive, Wifi, WifiOff, Clock, MemoryStick, Activity, Apple } from 'lucide-react';
import type { SystemInfo, RunMode } from '../types';
import { usePlatform } from '../platform';
import InspectorModal, { type InspectorData } from './InspectorModal';

interface Props {
  systemInfo: SystemInfo;
  selectedMode?: RunMode;
  live?: boolean;
}

function Bar({
  label, value, max, unit, color, delay = 0, onClick,
}: { label: string; value: number; max: number; unit: string; color: string; delay?: number; onClick?: () => void }) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);
  return (
    <button onClick={onClick} className="w-full space-y-1.5 text-left cursor-pointer transition-opacity hover:opacity-85">
      <div className="flex items-center justify-between gap-2 text-[12px]">
        <span className="font-semibold truncate" style={{ color: 'var(--color-ink-2)' }}>{label}</span>
        <span className="font-mono font-bold tabular-nums shrink-0" style={{ color: 'var(--color-ink)' }}>{value}{unit}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-surface-2)' }}>
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: pct / 100 }}
          transition={{ ...progressTween, delay }}
          className="h-full rounded-full origin-left"
          style={{ background: `linear-gradient(90deg, ${color}, ${color}bb)` }}
        />
      </div>
    </button>
  );
}

export default function SystemInfoPanel({ systemInfo, selectedMode, live = false }: Props) {
  const { config, isMac } = usePlatform();
  const [inspectItem, setInspectItem] = useState<InspectorData | null>(null);

  const rows = [
    {
      icon: isMac ? Apple : Monitor,
      k: 'Host',
      v: systemInfo.hostName || 'Local Host',
      onInspect: () =>
        setInspectItem({
          title: systemInfo.hostName || 'Local Host',
          category: 'System Host',
          badge: systemInfo.os,
          subtitle: `Operating System: ${systemInfo.os} (Build ${systemInfo.build || 'Darwin'})`,
          details: [
            { label: 'Hostname', value: systemInfo.hostName },
            { label: 'OS Distribution', value: systemInfo.os },
            { label: 'Active User', value: systemInfo.user },
          ],
          command: 'uname -a',
        }),
    },
    {
      icon: Cpu,
      k: isMac ? 'Apple Silicon' : 'Processor',
      v: systemInfo.processor || 'System CPU',
      onInspect: () =>
        setInspectItem({
          title: systemInfo.processor || 'Processor',
          category: 'CPU Hardware',
          badge: `${systemInfo.cpuUsage}% Active`,
          subtitle: 'Multi-core hardware processor telemetry.',
          details: [
            { label: 'Processor Name', value: systemInfo.processor },
            { label: 'Current Core Load', value: `${systemInfo.cpuUsage}%` },
            { label: 'Architecture', value: isMac ? 'arm64' : 'x64' },
          ],
          command: isMac ? 'sysctl -n machdep.cpu.brand_string' : 'Get-CimInstance Win32_Processor',
        }),
    },
    {
      icon: MemoryStick,
      k: 'Memory',
      v: systemInfo.ramGB > 0 ? `${systemInfo.ramGB} GB RAM` : '—',
      onInspect: () =>
        setInspectItem({
          title: 'System Memory',
          category: 'Unified RAM',
          badge: `${systemInfo.memoryUsage}% In Use`,
          subtitle: 'Physical system memory allocation.',
          details: [
            { label: 'Total Capacity', value: `${systemInfo.ramGB} GB` },
            { label: 'Utilization Level', value: `${systemInfo.memoryUsage}%` },
          ],
          command: isMac ? 'vm_stat' : 'Get-CimInstance Win32_OperatingSystem',
        }),
    },
    {
      icon: HardDrive,
      k: 'Storage',
      v: systemInfo.totalDiskGB > 0 ? `${systemInfo.freeDiskGB} GB free / ${systemInfo.totalDiskGB} GB` : '—',
      onInspect: () =>
        setInspectItem({
          title: 'Boot Storage Volume',
          category: 'APFS Container',
          badge: `${systemInfo.freeDiskGB} GB Free`,
          subtitle: 'Local root partition capacity.',
          details: [
            { label: 'Total Capacity', value: `${systemInfo.totalDiskGB} GB` },
            { label: 'Available Free', value: `${systemInfo.freeDiskGB} GB` },
          ],
          command: isMac ? 'df -h /System/Volumes/Data' : 'Get-PSDrive C',
        }),
    },
    {
      icon: Clock,
      k: 'Uptime',
      v: systemInfo.uptime || '—',
      onInspect: () =>
        setInspectItem({
          title: 'System Uptime',
          category: 'Kernel Uptime',
          badge: systemInfo.uptime ? systemInfo.uptime.split(',')[0] : 'Active',
          subtitle: 'Elapsed time since last operating system boot.',
          details: [
            { label: 'Uptime String', value: systemInfo.uptime },
          ],
          command: 'uptime',
        }),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: 0.04, ease: easeOut }}
      className="card p-5 sm:p-6"
    >
      <InspectorModal data={inspectItem} onClose={() => setInspectItem(null)} />

      <div className="flex items-center justify-between pb-4 mb-4 border-b" style={{ borderColor: 'var(--color-line)' }}>
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-blue-500" />
          <h3 className="text-[13px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-ink-2)' }}>
            {config.productName} Telemetry
          </h3>
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

        <button
          onClick={() =>
            setInspectItem({
              title: 'Network Connectivity Subsystem',
              category: 'Network Link',
              badge: systemInfo.isOnline ? 'Online' : 'Offline',
              subtitle: 'Active internet interface and socket status.',
              details: [
                { label: 'Network State', value: systemInfo.isOnline ? 'Connected (Internet Reachable)' : 'Offline' },
              ],
            })
          }
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border cursor-pointer hover:scale-105 transition-transform"
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
        </button>
      </div>

      <div className="space-y-2">
        {rows.map((r, i) => (
          <motion.button
            key={r.k}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 + i * 0.03, duration: 0.24, ease: easeOut }}
            onClick={r.onInspect}
            className="w-full flex items-center gap-3 p-2.5 rounded-xl text-[12.5px] min-w-0 border text-left transition-colors cursor-pointer hover:border-[var(--color-line-strong)]"
            style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
          >
            <div className="p-1.5 rounded-lg text-blue-500 border shrink-0 shadow-sm" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-line)' }}>
              <r.icon size={15} />
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <span className="block text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-ink-4)' }}>{r.k}</span>
              <span className="font-mono font-bold truncate block" style={{ color: 'var(--color-ink)' }}>{r.v}</span>
            </div>
          </motion.button>
        ))}
      </div>

      <div className="mt-5 pt-4 border-t space-y-3" style={{ borderColor: 'var(--color-line)' }}>
        <Bar
          label="CPU Load"
          value={systemInfo.cpuUsage}
          max={100}
          unit="%"
          color="#2563eb"
          onClick={() =>
            setInspectItem({
              title: 'CPU Core Utilization',
              category: 'Processor Health',
              badge: `${systemInfo.cpuUsage}% Active`,
              subtitle: 'Active scheduling load across all hardware CPU cores.',
              details: [
                { label: 'Current Utilization', value: `${systemInfo.cpuUsage}%` },
                { label: 'Processor Model', value: systemInfo.processor },
              ],
            })
          }
        />
        <Bar
          label="Memory Usage"
          value={systemInfo.memoryUsage}
          max={100}
          unit="%"
          color="#7c3aed"
          delay={0.1}
          onClick={() =>
            setInspectItem({
              title: 'Physical Memory Load',
              category: 'RAM Allocation',
              badge: `${systemInfo.memoryUsage}% Active`,
              subtitle: 'Physical unified memory utilization.',
              details: [
                { label: 'Installed Memory', value: `${systemInfo.ramGB} GB` },
                { label: 'Used Memory', value: `${systemInfo.memoryUsage}%` },
              ],
            })
          }
        />
        <Bar
          label="Disk Allocation"
          value={Math.round(((systemInfo.totalDiskGB - systemInfo.freeDiskGB) / Math.max(systemInfo.totalDiskGB, 1)) * 100)}
          max={100}
          unit="%"
          color="#0891b2"
          delay={0.2}
          onClick={() =>
            setInspectItem({
              title: 'Primary Disk Allocation',
              category: 'APFS Volume',
              badge: `${systemInfo.freeDiskGB} GB Free`,
              subtitle: 'Boot volume storage breakdown.',
              details: [
                { label: 'Total Volume Size', value: `${systemInfo.totalDiskGB} GB` },
                { label: 'Free Disk Space', value: `${systemInfo.freeDiskGB} GB` },
              ],
            })
          }
        />
      </div>
    </motion.div>
  );
}
