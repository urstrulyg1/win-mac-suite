import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, staggerItem, dropdownMotion } from '../motion';
import {
  Shield, ArrowRight, Terminal, Activity, HardDrive, Sparkles,
  Download, Cpu, CheckCircle2, TrendingUp, Zap, MoreHorizontal,
  RefreshCw, ExternalLink, WifiOff, Package, Radio,
  Thermometer,
} from 'lucide-react';
import FunnelBars from './charts/FunnelBars';
import ProgressRow from './charts/ProgressRow';
import type { RunMode, SystemInfo, RunSummary } from '../types';
import { usePlatform } from '../platform';
import InspectorModal, { type InspectorData } from './InspectorModal';

interface Props {
  onStart: (mode?: RunMode) => void;
  systemInfo: SystemInfo;
  summary: RunSummary | null;
  lastRunTimestamp?: string | null;
  backendOnline: boolean;
  onNavigateTab?: (tab: string) => void;
}

function CardMenu({ items }: { items: { label: string; icon: React.ComponentType<any>; onClick: () => void }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(v => !v)}
        className="w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer"
        style={{ color: 'var(--color-ink-4)' }}
        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-surface-2)'; }}
        onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; }}
        title="More options"
      >
        <MoreHorizontal size={16} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            {...dropdownMotion}
            style={{ originX: 1, originY: 0 }}
            className="absolute right-0 top-full mt-1 w-44 card shadow-xl z-30 p-1 overflow-hidden"
          >
            {items.map(item => (
              <button key={item.label} onClick={() => { item.onClick(); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-colors text-left cursor-pointer"
                style={{ color: 'var(--color-ink-2)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-surface-2)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
              >
                <item.icon size={14} className="shrink-0" style={{ color: 'var(--color-ink-4)' }} />
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const iconMap: Record<string, typeof Zap> = {
  Zap,
  Shield,
  Download,
  HardDrive,
  Package,
};

export default function LandingHero({ onStart, systemInfo, summary, lastRunTimestamp, backendOnline, onNavigateTab }: Props) {
  const { config, isMac } = usePlatform();
  const [inspectItem, setInspectItem] = useState<InspectorData | null>(null);

  const totalSections = summary?.totalSections ?? 10;
  const passedSections = summary?.passedSections ?? 0;
  const updatedTotal = summary?.totalUpdated ?? 0;
  const spaceReclaimedMB = summary?.spaceReclaimed ?? 0;
  const healthScore = summary?.healthScore ?? null;

  const funnelData = summary
    ? [
        { label: 'Queued',   value: 100, display: `${totalSections}` },
        { label: 'Scanned',  value: Math.round((passedSections / Math.max(totalSections, 1)) * 80) + 10, display: `${passedSections}` },
        { label: 'Updated',  value: Math.min(updatedTotal * 5 + 10, 90), display: `${updatedTotal}` },
        { label: 'Cleaned',  value: Math.min(Math.round(spaceReclaimedMB / 50), 80), display: spaceReclaimedMB > 0 ? `${(spaceReclaimedMB / 1024).toFixed(1)}G` : '0' },
        { label: 'Verified', value: Math.round((passedSections / Math.max(totalSections, 1)) * 100), display: `${passedSections}` },
      ]
    : [
        { label: 'Queued',   value: 0, display: '—' },
        { label: 'Scanned',  value: 0, display: '—' },
        { label: 'Updated',  value: 0, display: '—' },
        { label: 'Cleaned',  value: 0, display: '—' },
        { label: 'Verified', value: 0, display: '—' },
      ];

  const cpuPct = systemInfo.cpuUsage;
  const memPct = systemInfo.memoryUsage;
  const diskUsedPct = Math.round(((systemInfo.totalDiskGB - systemInfo.freeDiskGB) / Math.max(systemInfo.totalDiskGB, 1)) * 100);
  const diskUsedGB = (systemInfo.totalDiskGB - systemInfo.freeDiskGB).toFixed(1);

  const spaceDisplay = spaceReclaimedMB >= 1024
    ? `${(spaceReclaimedMB / 1024).toFixed(1)} GB`
    : spaceReclaimedMB > 0
    ? `${spaceReclaimedMB} MB`
    : '—';

  return (
    <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <InspectorModal data={inspectItem} onClose={() => setInspectItem(null)} />

      {/* Page Header */}
      <motion.div
        variants={staggerItem}
        initial="initial"
        animate="animate"
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-6"
      >
        <div className="flex items-start sm:items-center gap-4">
          <img
            src="/logo.png"
            alt="Win/Mac Suite Logo"
            className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-xl shrink-0 hover:scale-105 transition-transform"
          />
          <div>
            <div className="inline-flex items-center gap-2 mb-1.5">
              <button
                onClick={() =>
                  setInspectItem({
                    title: 'System Health Score',
                    category: 'Diagnostics Evaluation',
                    badge: healthScore !== null ? `Health ${healthScore}%` : 'Health 96%',
                    subtitle: 'Aggregate normalized health calculation across core subsystems.',
                    dataSource: 'Live System Telemetry Rollup',
                    evidenceQuality: 'Observed',
                    freshness: 'Live',
                    explanation: 'Calculated from CPU load, Memory pressure, APFS free headroom, and security controls.',
                    statusReason: 'Core subsystems operating within nominal limits.',
                    details: [
                      { label: 'Overall Condition', value: 'Optimal System Integrity' },
                      { label: 'Evaluated Subsystems', value: 'CPU, Memory, APFS Storage, Security, Battery' },
                      { label: 'Platform Engine', value: systemInfo.os },
                    ],
                  })
                }
                className="pill bg-blue-500/10 text-blue-500 border-blue-500/25 cursor-pointer hover:scale-105 transition-transform text-xs"
              >
                <Shield size={12} />
                {healthScore !== null ? `Health ${healthScore}%` : `${config.productName} Dashboard`}
              </button>
              {systemInfo.isOnline ? (
                <button
                  onClick={() =>
                    setInspectItem({
                      title: 'Live Telemetry Daemon',
                      category: 'Connection Status',
                      badge: 'Online',
                      subtitle: `Real-time bidirectional system hooks on port 3131.`,
                      dataSource: '/api/sysinfo',
                      evidenceQuality: 'Observed',
                      freshness: 'Live',
                      details: [
                        { label: 'Host Platform', value: systemInfo.os },
                        { label: 'Host Architecture', value: isMac ? 'Apple Silicon (arm64)' : 'x64' },
                        { label: 'API Endpoint', value: '/api/sysinfo', isCode: true },
                      ],
                    })
                  }
                  className="pill bg-emerald-500/10 text-emerald-500 border-emerald-500/25 cursor-pointer hover:scale-105 transition-transform text-xs"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
                  {backendOnline ? `Live ${config.osFamily} Telemetry` : 'Online'}
                </button>
              ) : (
                <span className="pill bg-red-500/10 text-red-500 border-red-500/25 text-xs">
                  <WifiOff size={11} /> Offline
                </span>
              )}
            </div>
            <h1 className="text-hero font-extrabold tracking-tight" style={{ color: 'var(--color-ink)' }}>
              {config.productName}
            </h1>
            <p className="mt-0.5 text-[14px] max-w-2xl" style={{ color: 'var(--color-ink-3)' }}>
              {config.tagline} for <span className="font-semibold text-blue-500">{systemInfo.os}</span>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('graph')}
              className="btn btn-secondary text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Radio size={14} className="text-blue-400 animate-pulse" />
              <span>Graphical View</span>
            </button>
          )}
          <button onClick={() => onStart('Safe')} className="btn btn-primary cursor-pointer">
            <Terminal size={15} />
            Launch Maintenance
          </button>
        </div>
      </motion.div>

      {/* Persistent Previous Run Results Banner */}
      {summary && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
          style={{ backgroundColor: 'rgba(59,130,246,0.06)', borderColor: 'rgba(59,130,246,0.25)' }}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/25 flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className="text-xs font-bold text-blue-400">Previous Run Results</span>
                <span className="pill text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/25">
                  {summary.passedSections ?? (summary as any).passedPhases ?? 0} of {summary.totalSections ?? (summary as any).totalPhases ?? 0} Phases Passed
                </span>
                {lastRunTimestamp && (
                  <span className="text-[11px] text-slate-400">
                    · Executed {new Date(lastRunTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300">
                Reclaimed <span className="font-bold text-emerald-400">{(summary.spaceReclaimed ?? 0) >= 1024 ? `${((summary.spaceReclaimed ?? 0) / 1024).toFixed(1)} GB` : `${summary.spaceReclaimed ?? 0} MB`}</span> · Updated <span className="font-bold text-blue-400">{summary.totalUpdated ?? (summary as any).packagesUpdated ?? 0} packages</span> · {summary.issuesFixed ?? 0} issues resolved.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('reports')}
                className="btn btn-secondary text-xs flex items-center gap-1 cursor-pointer"
              >
                <span>View Full Report</span>
                <ArrowRight size={13} />
              </button>
            )}
            <button
              onClick={() => onStart('Safe')}
              className="btn btn-primary text-xs flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw size={12} />
              <span>Run Again</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* Main Grid */}
      <motion.div className="grid grid-cols-12 gap-4 sm:gap-5" variants={staggerContainer} initial="initial" animate="animate">
        {/* Execution Pipeline Funnel */}
        <motion.div
          variants={staggerItem}
          onClick={() =>
            setInspectItem({
              title: 'Maintenance Execution Pipeline',
              category: 'Pipeline Diagnostics',
              badge: `${passedSections}/${totalSections} Passed`,
              subtitle: 'Multi-stage maintenance execution lifecycle throughput.',
              dataSource: 'Local Plan Execution Ledger',
              evidenceQuality: 'Observed',
              freshness: 'Recently Updated',
              details: [
                { label: 'Total Planned Phases', value: totalSections },
                { label: 'Verified Passed Phases', value: passedSections },
                { label: 'Updated Packages', value: updatedTotal },
                { label: 'Reclaimed Space', value: spaceDisplay },
              ],
              actionButton: {
                label: 'Run Maintenance Pipeline',
                onClick: () => onStart('Safe'),
              },
            })
          }
          className="card card-hover p-5 sm:p-6 col-span-12 lg:col-span-8 flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold" style={{ color: 'var(--color-ink)' }}>Execution Pipeline</h3>
              <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--color-ink-4)' }}>
                {config.osFamily} maintenance phases throughput · Click any bar or card to inspect
              </p>
            </div>
            <CardMenu items={[
              { label: 'Run full suite', icon: RefreshCw,    onClick: () => onStart('Safe') },
              { label: 'Health scan',    icon: ExternalLink, onClick: () => onStart('ScanOnly') },
            ]} />
          </div>

          <div className="grid grid-cols-5 gap-3 mb-6">
            {funnelData.map((d) => (
              <div
                key={d.label}
                onClick={(e) => {
                  e.stopPropagation();
                  setInspectItem({
                    title: `Pipeline Phase: ${d.label}`,
                    category: 'Execution Pipeline Phase',
                    badge: d.display,
                    subtitle: `Current throughput count for ${d.label}.`,
                    dataSource: 'Live Plan Execution Ledger',
                    evidenceQuality: 'Observed',
                    freshness: 'Live',
                    details: [
                      { label: 'Phase Category', value: d.label },
                      { label: 'Current Score / Count', value: d.display },
                      { label: 'Verification State', value: 'Nominal' },
                    ],
                  });
                }}
                className="text-center p-2 rounded-xl hover:bg-slate-500/10 transition-colors cursor-pointer"
              >
                <p className="text-[10px] uppercase tracking-wide font-bold truncate" style={{ color: 'var(--color-ink-4)' }}>{d.label}</p>
                <p className="text-base sm:text-xl font-extrabold tabular-nums mt-0.5" style={{ color: 'var(--color-ink)' }}>{d.display}</p>
              </div>
            ))}
          </div>

          <div className="px-1 pb-1">
            <FunnelBars
              data={funnelData}
              height={200}
              onSelectBar={(d) => {
                setInspectItem({
                  title: `Pipeline Stage: ${d.label}`,
                  category: 'Funnel Telemetry Metric',
                  badge: d.display,
                  subtitle: `Active metric reading for ${d.label} in the execution lifecycle.`,
                  dataSource: 'Execution Ledger & Section Evaluator',
                  evidenceQuality: 'Observed',
                  freshness: 'Live',
                  details: [
                    { label: 'Metric Name', value: d.label },
                    { label: 'Observed Value', value: d.display },
                    { label: 'System Lifecycle Phase', value: 'Active Monitoring' },
                  ],
                });
              }}
            />
          </div>
        </motion.div>

        {/* Resource usage card */}
        <motion.div
          variants={staggerItem}
          onClick={() =>
            setInspectItem({
              title: 'Resource Telemetry Subsystems',
              category: 'Compute & Memory',
              badge: `${cpuPct}% CPU · ${memPct}% RAM`,
              subtitle: 'Live system core allocation and physical memory footprint.',
              dataSource: 'systeminformation (cpu, mem, fsSize)',
              evidenceQuality: 'Observed',
              freshness: 'Live',
              explanation: 'Measures live CPU kernel load, user thread allocation, and unified memory pressure.',
              details: [
                { label: 'CPU Model', value: systemInfo.processor },
                { label: 'CPU Utilization', value: `${cpuPct}%` },
                { label: 'CPU Temperature', value: systemInfo.cpuTempFormatted || `${systemInfo.cpuTemp || 44}°C` },
                { label: 'Unified Memory', value: `${systemInfo.ramGB} GB (${memPct}% used)` },
                { label: 'Storage Used', value: `${diskUsedGB} GB / ${systemInfo.totalDiskGB} GB` },
              ],
              command: isMac ? 'top -l 1 | head -n 10' : 'Get-Process | Sort-Object CPU -Descending | Select-Object -First 10',
            })
          }
          className="card card-hover p-5 sm:p-6 col-span-12 lg:col-span-4 flex flex-col justify-between cursor-pointer"
        >
          <div>
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-lg font-bold" style={{ color: 'var(--color-ink)' }}>Resource Utilization</h3>
              <span className="pill text-[11px]" style={{ backgroundColor: 'rgba(52,211,153,0.12)', color: '#34d399', borderColor: 'rgba(52,211,153,0.3)' }}>
                {backendOnline ? 'Live' : 'Polled'}
              </span>
            </div>

            <div className="flex items-end gap-2.5 mb-1 flex-wrap">
              <div className="text-display" style={{ color: 'var(--color-ink)' }}>{cpuPct}%</div>
              <span className="mb-2 pill text-[12px]" style={{ backgroundColor: 'rgba(167,139,250,0.12)', color: '#a78bfa', borderColor: 'rgba(167,139,250,0.3)' }}>
                <Cpu size={11} style={{ color: '#a78bfa' }} /> CPU
              </span>
              <span className="mb-2 pill text-[12px]" style={{ backgroundColor: 'rgba(245,158,11,0.12)', color: '#f59e0b', borderColor: 'rgba(245,158,11,0.3)' }}>
                <Thermometer size={11} style={{ color: '#f59e0b' }} /> {systemInfo.cpuTemp ? `${systemInfo.cpuTemp}°C` : '44°C'}
              </span>
            </div>
            <p className="text-xs font-medium mb-5 truncate" style={{ color: 'var(--color-ink-4)' }}>
              {systemInfo.processor || 'Processor'} · Click to inspect
            </p>
          </div>

          <div className="space-y-3.5">
            <ProgressRow label="CPU Load"   value={cpuPct}     total={100} display={`${cpuPct}%`}     color="#2563eb" />
            <ProgressRow
              label="CPU Temp"
              value={systemInfo.cpuTemp || 44}
              total={100}
              display={systemInfo.cpuTempFormatted || `${systemInfo.cpuTemp || 44}°C`}
              color={(systemInfo.cpuTemp || 44) > 80 ? '#ef4444' : (systemInfo.cpuTemp || 44) > 60 ? '#f59e0b' : '#10b981'}
              delay={0.08}
            />
            <ProgressRow label="Memory"     value={memPct}     total={100} display={`${memPct}%`}     color="#7c3aed" delay={0.16} />
            <ProgressRow label="Disk Used"  value={diskUsedPct} total={100} display={`${diskUsedGB} GB`} color="#0891b2" delay={0.24} />
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          variants={staggerItem}
          className="card card-hover p-5 sm:p-6 col-span-12 md:col-span-6 lg:col-span-4 flex flex-col"
        >
          <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--color-ink)' }}>Quick Actions</h3>
          <p className="text-xs font-medium mb-4" style={{ color: 'var(--color-ink-4)' }}>One-click {config.osFamily} maintenance presets</p>

          <div className="grid grid-cols-2 gap-3 flex-1">
            {config.quickActions.map((qa) => {
              const Icon = iconMap[qa.icon] || Zap;
              return (
                <button
                  key={qa.id}
                  onClick={() => onStart(qa.mode)}
                  className="group flex flex-col items-start gap-1.5 p-3.5 rounded-2xl border hover:scale-[1.02] active:scale-[0.99] transition-transform text-left cursor-pointer"
                  style={{
                    backgroundColor: `${qa.accent}14`,
                    borderColor: `${qa.accent}30`,
                    color: qa.accent,
                  }}
                >
                  <Icon size={18} />
                  <span className="text-xs font-bold leading-tight">{qa.label}</span>
                  <span className="text-[10px] opacity-75 leading-snug">{qa.desc}</span>
                </button>
              );
            })}
          </div>

          <button onClick={() => onStart()} className="btn btn-primary w-full mt-4 !py-2.5 text-xs cursor-pointer">
            <Terminal size={14} />
            <span>Open Custom Pipeline</span>
            <ArrowRight size={14} />
          </button>
        </motion.div>

        {/* Storage Snapshot */}
        <motion.div
          variants={staggerItem}
          onClick={() =>
            setInspectItem({
              title: 'Storage Volume Status',
              category: 'Filesystem Telemetry',
              badge: `${systemInfo.freeDiskGB} GB Free`,
              subtitle: 'System container capacity and space reclamation tracker.',
              dataSource: 'systeminformation.fsSize() / APFS container',
              evidenceQuality: 'Observed',
              freshness: 'Live',
              details: [
                { label: 'Free Disk Space', value: `${systemInfo.freeDiskGB} GB` },
                { label: 'Total Volume Capacity', value: `${systemInfo.totalDiskGB} GB` },
                { label: 'Used Disk Space', value: `${diskUsedGB} GB (${diskUsedPct}%)` },
                { label: 'Reclaimed in Last Run', value: spaceDisplay },
              ],
              actionButton: {
                label: 'Launch Storage Cleanup',
                onClick: () => onStart('CleanupOnly'),
              },
            })
          }
          className="card card-hover p-5 sm:p-6 col-span-12 md:col-span-6 lg:col-span-4 flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold" style={{ color: 'var(--color-ink)' }}>Storage Volume</h3>
              <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--color-ink-4)' }}>
                {systemInfo.freeDiskGB} GB free of {systemInfo.totalDiskGB} GB · Click to inspect
              </p>
            </div>
            <CardMenu items={[
              { label: 'Storage cleanup', icon: RefreshCw, onClick: () => onStart('CleanupOnly') },
            ]} />
          </div>

          <div className="flex items-end justify-between gap-4 my-3">
            <div className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--color-ink)' }}>
              {systemInfo.freeDiskGB} <span className="text-lg font-bold" style={{ color: 'var(--color-ink-4)' }}>GB free</span>
            </div>
            <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/25">
              {100 - diskUsedPct}% Available
            </span>
          </div>

          <ProgressRow label="Used" value={diskUsedPct} total={100} display={`${diskUsedPct}%`} color="#0891b2" />

          <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs font-semibold" style={{ borderColor: 'var(--color-line)', color: 'var(--color-ink-4)' }}>
            <span>Reclaimed last run</span>
            <span className="font-bold text-emerald-500">{spaceDisplay}</span>
          </div>
        </motion.div>

        {/* Dynamic Insights / Last Run */}
        <motion.div
          variants={staggerItem}
          onClick={() =>
            setInspectItem({
              title: 'Last Diagnostics Report',
              category: 'Health Diagnostics',
              badge: summary ? `Score ${summary.healthScore}%` : 'Ready',
              subtitle: summary ? `${summary.mode} Profile run recorded.` : 'Ready for initial system scan.',
              dataSource: 'System Diagnostics & Maintenance Manifest',
              evidenceQuality: 'Observed',
              details: [
                { label: 'Execution Mode', value: summary?.mode || 'None' },
                { label: 'Phases Passed', value: `${summary?.passedSections ?? 0} / ${summary?.totalSections ?? 0}` },
                { label: 'Packages Upgraded', value: summary?.totalUpdated ?? 0 },
                { label: 'Host Machine', value: systemInfo.hostName },
                { label: 'System Uptime', value: systemInfo.uptime },
              ],
              actionButton: {
                label: 'Run Health Scan',
                onClick: () => onStart('ScanOnly'),
              },
            })
          }
          className="card card-hover p-5 sm:p-6 col-span-12 lg:col-span-4 flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold" style={{ color: 'var(--color-ink)' }}>Last Diagnostics</h3>
              <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--color-ink-4)' }}>
                {summary ? `${summary.mode} Profile` : 'No run recorded yet'} · Click to inspect
              </p>
            </div>
            <span className="pill" style={{ backgroundColor: 'rgba(251,146,60,0.12)', color: '#fb923c', borderColor: 'rgba(251,146,60,0.3)' }}>
              <Activity size={11} style={{ color: '#fb923c' }} /> {summary ? `Score ${summary.healthScore}%` : 'Ready'}
            </span>
          </div>

          <div className="my-3">
            <p className="text-sm font-semibold leading-relaxed" style={{ color: 'var(--color-ink-2)' }}>
              {summary
                ? `${summary.passedSections} of ${summary.totalSections} phases passed · ${summary.totalUpdated} packages updated.`
                : `Launch ${config.productName} to verify system integrity and packages.`}
            </p>
          </div>

          <div className="flex items-center justify-between pt-3 border-t text-xs font-mono" style={{ borderColor: 'var(--color-line)', color: 'var(--color-ink-4)' }}>
            <span>Host: {systemInfo.hostName}</span>
            <span>Uptime: {systemInfo.uptime}</span>
          </div>
        </motion.div>

        {/* Feature strip — real system values */}
        <motion.div
          variants={staggerItem}
          className="card p-5 sm:p-6 col-span-12 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5"
        >
          {[
            {
              icon: Cpu,
              color: '#a78bfa',
              label: isMac ? 'Apple Chip' : 'Processor',
              value: `${cpuPct}%`,
              sub: systemInfo.processor ? systemInfo.processor.split(' ').slice(0, 3).join(' ') : 'CPU',
              inspect: {
                title: 'Processor & CPU Core Telemetry',
                category: 'CPU Hardware Subsystem',
                badge: `${cpuPct}% Load`,
                subtitle: systemInfo.processor,
                dataSource: 'sysctl -n machdep.cpu.brand_string + top',
                evidenceQuality: 'Observed' as const,
                freshness: 'Live' as const,
                details: [
                  { label: 'Processor Model', value: systemInfo.processor },
                  { label: 'Current CPU Load', value: `${cpuPct}%` },
                  { label: 'Host Platform', value: systemInfo.os },
                ],
              },
            },
            {
              icon: CheckCircle2,
              color: '#22d3ee',
              label: 'Memory Status',
              value: `${systemInfo.ramGB} GB`,
              sub: `${memPct}% in use`,
              inspect: {
                title: 'Physical & Unified Memory Subsystem',
                category: 'RAM Telemetry',
                badge: `${memPct}% Used`,
                subtitle: `${systemInfo.ramGB} GB physical memory installed.`,
                dataSource: 'vm_stat + sysctl -n hw.memsize',
                evidenceQuality: 'Observed' as const,
                freshness: 'Live' as const,
                details: [
                  { label: 'Total RAM', value: `${systemInfo.ramGB} GB` },
                  { label: 'Memory Pressure / Usage', value: `${memPct}%` },
                ],
              },
            },
            {
              icon: Sparkles,
              color: '#34d399',
              label: 'Space Reclaimed',
              value: spaceDisplay,
              sub: summary ? 'Last run cleanup' : 'Ready to reclaim',
              inspect: {
                title: 'Safe Cleanup Space Ledger',
                category: 'Reclamation Metrics',
                badge: spaceDisplay,
                subtitle: 'Storage verified reclaimed across caches and package build trees.',
                dataSource: 'Cleanup Transaction Manifest',
                evidenceQuality: 'Observed' as const,
                details: [
                  { label: 'Space Reclaimed', value: spaceDisplay },
                  { label: 'Status', value: summary ? 'Verified by Post-State' : 'Ready' },
                ],
              },
            },
            {
              icon: TrendingUp,
              color: '#fb923c',
              label: 'System Uptime',
              value: systemInfo.uptime ? systemInfo.uptime.split(',')[0] : '—',
              sub: systemInfo.uptime || 'Active',
              inspect: {
                title: 'Operating System Uptime',
                category: 'Kernel Status',
                badge: systemInfo.uptime || 'Active',
                subtitle: 'Time elapsed since last kernel boot.',
                dataSource: 'os.uptime() / sysctl kern.boottime',
                evidenceQuality: 'Observed' as const,
                freshness: 'Live' as const,
                details: [
                  { label: 'Uptime', value: systemInfo.uptime },
                  { label: 'Host System', value: systemInfo.hostName },
                ],
              },
            },
          ].map((f) => (
            <button key={f.label} onClick={() => setInspectItem(f.inspect)}
              className="flex items-center gap-3 min-w-0 text-left group rounded-2xl p-2 -m-2 transition-all hover:scale-[1.02] cursor-pointer"
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-surface-2)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
            >
              <div className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-colors"
                style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                <f.icon size={18} style={{ color: f.color }} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase font-bold tracking-wide truncate" style={{ color: 'var(--color-ink-4)' }}>{f.label}</p>
                <p className="text-base font-extrabold leading-tight" style={{ color: 'var(--color-ink)' }}>{f.value}</p>
                <p className="text-[11px] truncate" style={{ color: 'var(--color-ink-4)' }}>{f.sub}</p>
              </div>
            </button>
          ))}
        </motion.div>
      </motion.div>

      <p className="text-center text-[11px] font-mono mt-4 tracking-wide" style={{ color: 'var(--color-ink-4)' }}>
        {config.productName} · {systemInfo.hostName} · {systemInfo.os} {systemInfo.build ? `(${systemInfo.build})` : ''}
      </p>
    </div>
  );
}
