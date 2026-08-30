import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { hoverLift, tapPress, easeOut, tabTransition } from '../motion';
import {
  Cpu, HardDrive, Shield, Wifi, Battery, Activity,
  Layers, Sparkles, RefreshCw, Zap, Radio, ArrowRight, Search,
} from 'lucide-react';
import { usePlatform } from '../platform';
import InspectorModal, { InspectorData } from './InspectorModal';

interface Props {
  onNavigateTab?: (tab: string) => void;
  onStartAction?: (mode: string) => void;
}

type NodeId = 'kernel' | 'cpu' | 'memory' | 'storage' | 'battery' | 'security' | 'network';

const LAYOUT: Record<NodeId, { x: number; y: number }> = {
  kernel:   { x: 50, y: 46 },
  cpu:      { x: 16, y: 20 },
  memory:   { x: 14, y: 54 },
  storage:  { x: 84, y: 16 },
  battery:  { x: 88, y: 42 },
  security: { x: 84, y: 68 },
  network:  { x: 50, y: 86 },
};

const EDGES: [NodeId, NodeId][] = [
  ['kernel', 'cpu'],
  ['kernel', 'memory'],
  ['kernel', 'storage'],
  ['kernel', 'battery'],
  ['kernel', 'security'],
  ['kernel', 'network'],
];

const TAB_FOR: Record<NodeId, string> = {
  kernel: 'diagnostics',
  cpu: 'performance',
  memory: 'performance',
  storage: 'storage',
  battery: 'diagnostics',
  security: 'security',
  network: 'network',
};

function isNum(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

function fmtPct(n: unknown): string {
  return isNum(n) ? `${Math.round(n)}%` : '—';
}

function fmtGb(n: unknown): string {
  return isNum(n) && n > 0 ? `${n} GB` : '—';
}

function tone(ok: boolean | null): 'ok' | 'warn' | 'unknown' {
  if (ok === null) return 'unknown';
  return ok ? 'ok' : 'warn';
}

export default function SystemGraphicalView({ onNavigateTab, onStartAction }: Props) {
  const { isMac } = usePlatform();
  const [telemetry, setTelemetry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [inspectItem, setInspectItem] = useState<InspectorData | null>(null);
  const [selected, setSelected] = useState<NodeId>('kernel');
  const [viewMode, setViewMode] = useState<'topology' | 'clusters'>('topology');

  const fetchLiveTelemetry = async () => {
    try {
      const [sysRes, battRes, diskRes, stabRes] = await Promise.all([
        fetch('/api/sysinfo').catch(() => null),
        fetch('/api/battery/intelligence').catch(() => null),
        fetch('/api/diagnostics/disk-health').catch(() => null),
        fetch('/api/diagnostics/system-stability').catch(() => null),
      ]);

      const sysData = sysRes && sysRes.ok ? await sysRes.json() : {};
      const battData = battRes && battRes.ok ? await battRes.json() : {};
      const diskData = diskRes && diskRes.ok ? await diskRes.json() : {};
      const stabData = stabRes && stabRes.ok ? await stabRes.json() : {};

      const gotLive = !!(sysRes && sysRes.ok);
      setLive(gotLive);
      setTelemetry({
        sys: sysData,
        battery: battData,
        disk: diskData,
        stability: stabData,
      });
    } catch {
      setLive(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveTelemetry();
    const interval = setInterval(fetchLiveTelemetry, 4000);
    return () => clearInterval(interval);
  }, []);

  const sys = telemetry?.sys || {};
  const batt = telemetry?.battery || {};
  const disk = telemetry?.disk || {};
  const stab = telemetry?.stability || {};

  const nodes = useMemo(() => {
    const cpuHigh = isNum(sys.cpuUsage) ? sys.cpuUsage > 80 : null;
    const memHigh = isNum(sys.memoryUsage) ? sys.memoryUsage > 85 : null;
    const diskLow = isNum(sys.freeDiskGB) ? sys.freeDiskGB < 20 : null;
    const online = typeof sys.isOnline === 'boolean' ? sys.isOnline : null;

    return [
      {
        id: 'kernel' as NodeId,
        label: isMac ? 'Kernel' : 'NT Kernel',
        title: isMac ? 'macOS Darwin Kernel' : 'Windows NT Kernel',
        sublabel: sys.os || (isMac ? 'Darwin' : 'Windows NT'),
        category: 'Kernel Core',
        icon: Activity,
        color: '#38bdf8',
        status: sys.os ? 'Nominal' : 'Awaiting probe',
        statusTone: sys.os ? 'ok' as const : 'unknown' as const,
        metric: sys.uptime ? String(sys.uptime).split(',')[0] : '—',
        tab: TAB_FOR.kernel,
        inspect: {
          title: 'Core Operating System & Kernel Telemetry',
          category: 'Kernel Subsystem',
          badge: sys.uptime || (live ? 'Active' : 'Unavailable'),
          subtitle: `Kernel architecture ${isMac ? 'Darwin (Mach-O)' : 'NT'} running on ${sys.hostName || 'this host'}.`,
          dataSource: 'os.uptime() / sysctl kern.version',
          evidenceQuality: live ? 'Observed' as const : 'Unavailable' as const,
          freshness: live ? 'Live' as const : 'Unavailable' as const,
          explanation: 'The kernel manages hardware dispatching, memory paging, and process scheduling.',
          details: [
            { label: 'Host System', value: sys.hostName || '—' },
            { label: 'OS Distribution', value: sys.os || '—' },
            { label: 'Build Version', value: sys.build || '—', isCode: true },
            { label: 'System Uptime', value: sys.uptime || '—' },
            { label: 'Kernel Panics', value: isNum(stab.kernelPanics) ? `${stab.kernelPanics} panic events logged` : '—' },
          ],
          command: isMac ? 'uname -a && sysctl kern.version' : 'Get-WmiObject Win32_OperatingSystem',
        },
      },
      {
        id: 'cpu' as NodeId,
        label: 'CPU',
        title: 'CPU Core Clusters',
        sublabel: sys.processor || 'Processor',
        category: 'Compute Subsystem',
        icon: Cpu,
        color: '#3b82f6',
        status: cpuHigh === null ? 'Awaiting probe' : cpuHigh ? 'Heavy Load' : 'Nominal',
        statusTone: tone(cpuHigh === null ? null : !cpuHigh),
        metric: fmtPct(sys.cpuUsage),
        tab: TAB_FOR.cpu,
        inspect: {
          title: 'CPU Compute & Thread Telemetry',
          category: 'Processing Engine',
          badge: isNum(sys.cpuUsage) ? `${Math.round(sys.cpuUsage)}% Load` : 'Unavailable',
          subtitle: sys.processor || 'Host processor',
          dataSource: 'systeminformation.currentLoad() + sysctl machdep.cpu',
          evidenceQuality: live ? 'Observed' as const : 'Unavailable' as const,
          freshness: live ? 'Live' as const : 'Unavailable' as const,
          explanation: 'Real-time CPU execution load sampled across available cores.',
          details: [
            { label: 'Processor Architecture', value: sys.processor || '—' },
            { label: 'Real-Time Load', value: fmtPct(sys.cpuUsage) },
            { label: 'Core State', value: cpuHigh === null ? '—' : cpuHigh ? 'High Compute Pressure' : 'Balanced' },
          ],
          command: isMac ? 'top -l 1 | grep "CPU usage"' : 'Get-Process | Sort-Object CPU -Descending | Select-Object -First 5',
        },
      },
      {
        id: 'memory' as NodeId,
        label: 'Memory',
        title: isMac ? 'Unified Memory' : 'System Memory',
        sublabel: isNum(sys.ramGB) ? `${sys.ramGB} GB installed` : 'Physical RAM',
        category: 'Memory Subsystem',
        icon: Layers,
        color: '#a855f7',
        status: memHigh === null ? 'Awaiting probe' : memHigh ? 'Pressure High' : 'Nominal',
        statusTone: tone(memHigh === null ? null : !memHigh),
        metric: fmtPct(sys.memoryUsage),
        tab: TAB_FOR.memory,
        inspect: {
          title: 'RAM & Virtual Memory Allocation',
          category: 'Physical & Swap Memory',
          badge: isNum(sys.memoryUsage) ? `${Math.round(sys.memoryUsage)}% Used` : 'Unavailable',
          subtitle: isNum(sys.ramGB) ? `${sys.ramGB} GB total memory available to system and applications.` : 'Physical memory capacity from host telemetry.',
          dataSource: 'vm_stat + sysctl hw.memsize',
          evidenceQuality: live ? 'Observed' as const : 'Unavailable' as const,
          freshness: live ? 'Live' as const : 'Unavailable' as const,
          explanation: 'Measures wired memory, app allocations, compressed pages, and dynamic swap.',
          details: [
            { label: 'Total RAM Installed', value: fmtGb(sys.ramGB) },
            { label: 'Memory Allocation', value: fmtPct(sys.memoryUsage) },
            { label: 'Memory Pressure Condition', value: memHigh === null ? '—' : memHigh ? 'Elevated Pressure' : 'Nominal' },
          ],
          command: isMac ? 'vm_stat' : 'Get-Counter "\\Memory\\% Committed Bytes In Use"',
          actionButton: {
            label: 'Perform Memory Optimization',
            icon: Zap,
            onClick: () => onStartAction && onStartAction('Safe'),
          },
        },
      },
      {
        id: 'storage' as NodeId,
        label: 'Storage',
        title: isMac ? 'APFS Container' : 'Boot Volume',
        sublabel: isNum(sys.freeDiskGB) && isNum(sys.totalDiskGB)
          ? `${sys.freeDiskGB} GB free of ${sys.totalDiskGB} GB`
          : 'Filesystem volume',
        category: 'Filesystem Subsystem',
        icon: HardDrive,
        color: '#06b6d4',
        status: diskLow === null ? 'Awaiting probe' : diskLow ? 'Low Space' : 'Nominal',
        statusTone: tone(diskLow === null ? null : !diskLow),
        metric: isNum(sys.freeDiskGB) ? `${sys.freeDiskGB} GB free` : '—',
        tab: TAB_FOR.storage,
        inspect: {
          title: 'Storage Volume Telemetry',
          category: isMac ? 'APFS Container' : 'Filesystem',
          badge: isNum(sys.freeDiskGB) ? `${sys.freeDiskGB} GB Free` : 'Unavailable',
          subtitle: `Mounted root filesystem ${disk.volumeName || '/'} .`,
          dataSource: isMac ? 'diskutil info / + statfs' : 'Get-PSDrive',
          evidenceQuality: live ? 'Observed' as const : 'Unavailable' as const,
          freshness: live ? 'Live' as const : 'Unavailable' as const,
          explanation: 'Monitors volume allocation, free headroom, and hardware SMART status when reported.',
          details: [
            { label: 'Volume Name', value: disk.volumeName || '—' },
            { label: 'Filesystem Type', value: disk.filesystem || (isMac ? 'APFS' : '—') },
            { label: 'Total Volume Capacity', value: fmtGb(sys.totalDiskGB) },
            { label: 'Free Disk Space', value: fmtGb(sys.freeDiskGB) },
            { label: 'SMART Hardware Status', value: disk.smartStatus || '—' },
          ],
          command: isMac ? 'df -h / && diskutil info /' : 'Get-PSDrive C',
          actionButton: {
            label: 'Launch Storage Cleanup',
            icon: Sparkles,
            onClick: () => onStartAction && onStartAction('CleanupOnly'),
          },
        },
      },
      {
        id: 'battery' as NodeId,
        label: 'Power',
        title: 'Power & Thermal',
        sublabel: batt.powerSource || 'Power subsystem',
        category: 'Power Management',
        icon: Battery,
        color: '#10b981',
        status: batt.sleepPrevented ? 'Sleep Assertion' : (batt.powerSource || batt.currentCapacityPct ? 'Optimal' : 'Awaiting probe'),
        statusTone: batt.sleepPrevented ? 'warn' as const : (batt.powerSource || isNum(batt.currentCapacityPct) ? 'ok' as const : 'unknown' as const),
        metric: isNum(batt.currentCapacityPct) ? `${batt.currentCapacityPct}%` : (batt.powerSource || '—'),
        tab: TAB_FOR.battery,
        inspect: {
          title: 'Battery Health & Sleep Drain Intelligence',
          category: 'Power Subsystem',
          badge: isNum(batt.currentCapacityPct) ? `${batt.currentCapacityPct}%` : (batt.powerSource || 'Unavailable'),
          subtitle: `Cycle count: ${batt.cycleCount ?? '—'} · Condition: ${batt.condition || '—'}`,
          dataSource: isMac ? 'pmset -g batt + ioreg -r -c AppleSmartBattery' : 'powercfg /batteryreport',
          evidenceQuality: live ? 'Observed' as const : 'Unavailable' as const,
          freshness: live ? 'Live' as const : 'Unavailable' as const,
          explanation: 'Tracks battery state, discharge during sleep, and background power assertions.',
          details: [
            { label: 'Power Source', value: batt.powerSource || '—' },
            { label: 'Charge Percentage', value: isNum(batt.currentCapacityPct) ? `${batt.currentCapacityPct}%` : '—' },
            { label: 'Health Condition', value: batt.condition || '—' },
            { label: 'Cycle Count', value: batt.cycleCount != null ? `${batt.cycleCount} Cycles` : '—' },
            { label: 'Sleep Assertions', value: batt.sleepPrevented ? 'Apps preventing sleep' : (batt.powerSource ? 'None active' : '—') },
          ],
          command: isMac ? 'pmset -g assertions && pmset -g batt' : 'powercfg /batteryreport',
        },
      },
      {
        id: 'security' as NodeId,
        label: 'Security',
        title: isMac ? 'SIP & Gatekeeper' : 'Security Controls',
        sublabel: isMac ? 'Integrity enforcement' : 'OS protection layers',
        category: 'Security Subsystem',
        icon: Shield,
        color: '#f59e0b',
        status: live ? 'Protected' : 'Awaiting probe',
        statusTone: live ? 'ok' as const : 'unknown' as const,
        metric: isMac ? 'SIP' : 'Defender',
        tab: TAB_FOR.security,
        inspect: {
          title: isMac ? 'macOS Security Architecture' : 'Windows Security Status',
          category: 'System Integrity',
          badge: live ? 'Enforced' : 'Unavailable',
          subtitle: isMac
            ? 'System Integrity Protection (SIP), Gatekeeper, and TCC security layers.'
            : 'Platform security controls reported by the host.',
          dataSource: isMac ? '/usr/bin/csrutil status && spctl --status' : 'Get-MpComputerStatus',
          evidenceQuality: live ? 'Observed' as const : 'Unavailable' as const,
          freshness: live ? 'Live' as const : 'Unavailable' as const,
          explanation: isMac
            ? 'Enforces kernel signature integrity and validates developer code signatures.'
            : 'Reports the state of built-in OS security services.',
          details: [
            { label: isMac ? 'System Integrity Protection (SIP)' : 'Platform Protection', value: live ? 'Enabled' : '—' },
            { label: isMac ? 'Gatekeeper Assessment' : 'Realtime Protection', value: live ? 'Active' : '—' },
          ],
          command: isMac ? 'csrutil status && spctl --status' : 'Get-MpComputerStatus',
        },
      },
      {
        id: 'network' as NodeId,
        label: 'Network',
        title: 'Network Stack',
        sublabel: 'Interfaces & sockets',
        category: 'Networking Subsystem',
        icon: Wifi,
        color: '#6366f1',
        status: online === null ? 'Awaiting probe' : online ? 'Online' : 'Offline',
        statusTone: tone(online),
        metric: online === null ? '—' : online ? 'Connected' : 'Disconnected',
        tab: TAB_FOR.network,
        inspect: {
          title: 'Network Interfaces & Socket Telemetry',
          category: 'Network Protocol Engine',
          badge: online === null ? 'Unavailable' : online ? 'Connected' : 'Offline',
          subtitle: 'Gateway route, DNS resolution, and TCP/UDP socket dispatch.',
          dataSource: isMac ? 'scutil --dns + netstat -rn' : 'Get-NetIPAddress',
          evidenceQuality: live ? 'Observed' as const : 'Unavailable' as const,
          freshness: live ? 'Live' as const : 'Unavailable' as const,
          explanation: 'Routes packets across physical interfaces and monitors reachability.',
          details: [
            { label: 'Internet Connectivity', value: online === null ? '—' : online ? 'Reachable' : 'Offline' },
            { label: 'Primary Interface', value: isMac ? 'en0 (Wi-Fi / Ethernet)' : 'Ethernet / Wi-Fi' },
          ],
          command: isMac ? 'ifconfig && netstat -rn' : 'Get-NetIPAddress',
        },
      },
    ];
  }, [isMac, sys, batt, disk, stab, live, onStartAction]);

  const selectedNode = nodes.find((n) => n.id === selected) || nodes[0];
  const SelectedIcon = selectedNode.icon;

  const openNode = (id: NodeId) => {
    setSelected(id);
  };

  const inspectSelected = () => {
    const node = nodes.find((n) => n.id === selected);
    if (node) setInspectItem(node.inspect);
  };

  const statusColor = (t: 'ok' | 'warn' | 'unknown') =>
    t === 'ok' ? '#22c55e' : t === 'warn' ? '#f59e0b' : 'var(--color-ink-4)';

  return (
    <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25 text-xs">
              <Radio size={12} /> Subsystem Topology
            </span>
            <span
              className="pill text-xs"
              style={{
                backgroundColor: live ? 'rgba(16,185,129,0.12)' : 'var(--color-surface-2)',
                color: live ? '#10b981' : 'var(--color-ink-3)',
                borderColor: live ? 'rgba(16,185,129,0.28)' : 'var(--color-line)',
              }}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-emerald-500 animate-pulse-dot' : ''}`}
                style={{ backgroundColor: live ? undefined : 'var(--color-ink-4)' }}
              />
              {live ? 'Live telemetry' : loading ? 'Connecting…' : 'Telemetry offline — graph still interactive'}
            </span>
          </div>
          <h1 className="text-hero font-extrabold tracking-tight" style={{ color: 'var(--color-ink)' }}>
            System Graphical Architecture
          </h1>
          <p className="text-[14px] mt-0.5" style={{ color: 'var(--color-ink-3)' }}>
            Hub-and-spoke map of kernel, compute, memory, storage, power, security, and network. Click a node to inspect it.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setViewMode(viewMode === 'topology' ? 'clusters' : 'topology')}
            className="btn btn-ghost text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Layers size={13} />
            <span>{viewMode === 'topology' ? 'Cluster View' : 'Topology Graph'}</span>
          </button>
          <button
            onClick={() => { setLoading(true); fetchLiveTelemetry(); }}
            className="btn btn-ghost text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin-smooth' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {viewMode === 'topology' ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          <div
            className="card xl:col-span-8 p-3 sm:p-4 relative overflow-hidden"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-line)' }}
          >
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.45]"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 50% 46%, rgba(56,189,248,0.10), transparent 42%), radial-gradient(circle at 1px 1px, var(--color-line-strong) 1px, transparent 0)',
                backgroundSize: 'auto, 22px 22px',
              }}
            />

            <div className="relative w-full min-h-[420px] sm:min-h-[520px] h-[min(62vh,620px)]">
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="xMidYMid meet"
                className="absolute inset-0 w-full h-full pointer-events-none"
                aria-hidden="true"
              >
                {EDGES.map(([from, to]) => {
                  const a = LAYOUT[from];
                  const b = LAYOUT[to];
                  const active = selected === from || selected === to;
                  const color = nodes.find((n) => n.id === to)?.color || '#3b82f6';
                  return (
                    <g key={`${from}-${to}`}>
                      <line
                        x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                        className={`graph-edge ${live ? 'graph-edge-live' : ''}`}
                        stroke={color}
                        style={{ opacity: active ? 0.95 : 0.42, strokeWidth: active ? 2.2 : 1.5 }}
                      />
                      <circle r="1.15" fill={color} opacity={active ? 1 : 0.7}>
                        {live && (
                          <animateMotion dur="2.8s" repeatCount="indefinite" path={`M ${a.x},${a.y} L ${b.x},${b.y}`} />
                        )}
                      </circle>
                    </g>
                  );
                })}
                <circle cx={LAYOUT.kernel.x} cy={LAYOUT.kernel.y} r="11" fill="rgba(56,189,248,0.08)" stroke="rgba(56,189,248,0.25)" strokeWidth="0.4" />
              </svg>

              {nodes.map((node) => {
                const pos = LAYOUT[node.id];
                const isHub = node.id === 'kernel';
                const isSel = selected === node.id;
                const Icon = node.icon;
                return (
                  <motion.button
                    key={node.id}
                    type="button"
                    onClick={() => openNode(node.id)}
                    onDoubleClick={() => setInspectItem(node.inspect)}
                    whileHover={hoverLift}
                    whileTap={tapPress}
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.28, ease: easeOut }}
                    className="-translate-x-1/2 -translate-y-1/2 text-left cursor-pointer z-10"
                    style={{ position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`, width: isHub ? 168 : 148 }}
                    aria-pressed={isSel}
                    aria-label={`${node.title}, ${node.status}`}
                  >
                    <div
                      className="rounded-2xl border px-3 py-2.5 shadow-lg"
                      style={{
                        backgroundColor: 'var(--color-surface)',
                        borderColor: isSel ? node.color : 'var(--color-line-strong)',
                        boxShadow: isSel
                          ? `0 10px 28px -12px ${node.color}99, 0 0 0 2px ${node.color}55`
                          : '0 8px 20px -14px rgba(15,23,42,0.35)',
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="shrink-0 rounded-xl flex items-center justify-center"
                          style={{
                            width: isHub ? 36 : 30,
                            height: isHub ? 36 : 30,
                            backgroundColor: `${node.color}22`,
                            color: node.color,
                          }}
                        >
                          <Icon size={isHub ? 18 : 15} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-extrabold truncate" style={{ color: 'var(--color-ink)' }}>
                              {isHub ? node.title : node.label}
                            </span>
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: statusColor(node.statusTone) }}
                            />
                          </div>
                          <div className="text-[10px] font-mono font-bold truncate" style={{ color: node.color }}>
                            {node.metric}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.aside
              key={selectedNode.id}
              {...tabTransition}
              className="card xl:col-span-4 p-5 space-y-4 xl:sticky xl:top-24"
              style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-line)' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${selectedNode.color}20`, color: selectedNode.color }}
                  >
                    <SelectedIcon size={22} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-ink-4)' }}>
                      {selectedNode.category}
                    </p>
                    <h2 className="text-base font-extrabold leading-tight" style={{ color: 'var(--color-ink)' }}>
                      {selectedNode.title}
                    </h2>
                  </div>
                </div>
                <span
                  className="pill text-[10px] font-bold shrink-0"
                  style={{
                    backgroundColor: `${selectedNode.color}18`,
                    color: selectedNode.color,
                    borderColor: `${selectedNode.color}40`,
                  }}
                >
                  {selectedNode.status}
                </span>
              </div>

              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-3)' }}>
                {selectedNode.inspect.explanation}
              </p>

              <div className="rounded-2xl border overflow-hidden divide-y text-xs" style={{ borderColor: 'var(--color-line)' }}>
                {selectedNode.inspect.details.map((d) => (
                  <div key={d.label} className="flex items-start justify-between gap-3 px-3 py-2.5" style={{ backgroundColor: 'var(--color-surface-2)' }}>
                    <span className="font-semibold shrink-0" style={{ color: 'var(--color-ink-3)' }}>{d.label}</span>
                    <span className={`font-mono font-bold text-right break-all ${d.isCode ? 'text-blue-500' : ''}`} style={{ color: d.isCode ? undefined : 'var(--color-ink)' }}>
                      {d.value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button onClick={inspectSelected} className="btn btn-primary text-xs cursor-pointer flex-1">
                  <Search size={13} />
                  <span>Full inspector</span>
                </button>
                {onNavigateTab && (
                  <button
                    onClick={() => onNavigateTab(selectedNode.tab)}
                    className="btn btn-ghost text-xs cursor-pointer"
                  >
                    <span>Open hub</span>
                    <ArrowRight size={13} />
                  </button>
                )}
              </div>
            </motion.aside>
          </AnimatePresence>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {nodes.map((node) => {
            const Icon = node.icon;
            const isSel = selected === node.id;
            return (
              <motion.button
                key={node.id}
                type="button"
                whileHover={hoverLift}
                whileTap={tapPress}
                onClick={() => {
                  openNode(node.id);
                  setInspectItem(node.inspect);
                }}
                className="card card-hover p-5 rounded-2xl border cursor-pointer text-left flex flex-col justify-between min-h-[180px]"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: isSel ? node.color : 'var(--color-line)',
                }}
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center"
                      style={{ backgroundColor: `${node.color}20`, color: node.color }}
                    >
                      <Icon size={24} />
                    </div>
                    <span
                      className="pill text-xs font-bold"
                      style={{ backgroundColor: `${node.color}15`, color: node.color, borderColor: `${node.color}30` }}
                    >
                      {node.status}
                    </span>
                  </div>
                  <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>{node.title}</h3>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-ink-3)' }}>{node.sublabel}</p>
                </div>
                <div className="mt-5 pt-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--color-line)' }}>
                  <span className="text-xs font-mono font-bold" style={{ color: node.color }}>{node.metric}</span>
                  <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-ink-4)' }}>
                    Inspect <ArrowRight size={12} />
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      <p className="text-center text-[11px] font-mono" style={{ color: 'var(--color-ink-4)' }}>
        Host: {sys.hostName || '—'} · {sys.os || '—'} {sys.build ? `(${sys.build})` : ''} · CPU {sys.processor || '—'}
      </p>

      <InspectorModal item={inspectItem} onClose={() => setInspectItem(null)} />
    </div>
  );
}
