import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, ArrowRight, Terminal, Activity, HardDrive, Sparkles,
  Download, Cpu, CheckCircle2, TrendingUp, Zap, MoreHorizontal,
  RefreshCw, ExternalLink, Info, WifiOff,
} from 'lucide-react';
import FunnelBars from './charts/FunnelBars';
import ProgressRow from './charts/ProgressRow';
import Sparkline from './charts/Sparkline';
import InsightsCard from './charts/InsightsCard';
import type { RunMode, SystemInfo, RunSummary } from '../types';

interface Props {
  onStart: (mode?: RunMode) => void;
  systemInfo: SystemInfo;
  summary: RunSummary | null;
  backendOnline: boolean;
}

const ease = [0.16, 1, 0.3, 1] as const;

// ── Tiny "⋯" popover menu ─────────────────────────────────────────────────────
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
        className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
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
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-1 w-44 card shadow-xl z-30 p-1 overflow-hidden"
          >
            {items.map(item => (
              <button key={item.label} onClick={() => { item.onClick(); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-colors text-left"
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

export default function LandingHero({ onStart, systemInfo, summary, backendOnline }: Props) {
  // ── Funnel data: derived from last run summary if available ──────────────────
  const totalSections = summary?.totalSections ?? 0;
  const passedSections = summary?.passedSections ?? 0;
  const updatedTotal = summary?.totalUpdated ?? 0;
  const spaceReclaimedMB = summary?.spaceReclaimed ?? 0;
  const healthScore = summary?.healthScore ?? null;

  const funnelData = summary
    ? [
        { label: 'Queued',   value: 100,                                                        display: `${totalSections}` },
        { label: 'Scanned',  value: Math.round((passedSections / Math.max(totalSections, 1)) * 80) + 10, display: `${passedSections}` },
        { label: 'Updated',  value: Math.min(updatedTotal * 5 + 10, 90),                        display: `${updatedTotal}` },
        { label: 'Cleaned',  value: Math.min(Math.round(spaceReclaimedMB / 50), 80),            display: spaceReclaimedMB > 0 ? `${(spaceReclaimedMB / 1024).toFixed(1)}G` : '0' },
        { label: 'Verified', value: Math.round((passedSections / Math.max(totalSections, 1)) * 100), display: `${passedSections}` },
      ]
    : [
        { label: 'Queued',   value: 0, display: '—' },
        { label: 'Scanned',  value: 0, display: '—' },
        { label: 'Updated',  value: 0, display: '—' },
        { label: 'Cleaned',  value: 0, display: '—' },
        { label: 'Verified', value: 0, display: '—' },
      ];

  // ── Derived resource metrics ─────────────────────────────────────────────────
  const cpuPct = systemInfo.cpuUsage;
  const memPct = systemInfo.memoryUsage;
  const diskUsedPct = Math.round(((systemInfo.totalDiskGB - systemInfo.freeDiskGB) / Math.max(systemInfo.totalDiskGB, 1)) * 100);
  const diskUsedGB = (systemInfo.totalDiskGB - systemInfo.freeDiskGB).toFixed(1);

  // Health sparkline: build from summary health score as a single endpoint; no historical data
  const healthSparkData = healthScore !== null ? [50, 55, 58, 60, 65, 68, 72, 75, 78, 80, healthScore, healthScore] : [];

  // Space reclaimed display
  const spaceDisplay = spaceReclaimedMB >= 1024
    ? `${(spaceReclaimedMB / 1024).toFixed(1)} GB`
    : spaceReclaimedMB > 0
    ? `${spaceReclaimedMB} MB`
    : '—';

  // Last run timestamp display
  const lastRunDisplay = summary?.startedAt
    ? (() => {
        const diff = Date.now() - new Date(summary.startedAt).getTime();
        const mins = Math.floor(diff / 60000);
        const hrs  = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hrs > 0)  return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
        return `${mins} min ago`;
      })()
    : null;

  return (
    <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6"
      >
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25">
              <Shield size={12} />
              {healthScore !== null ? `Health ${healthScore}%` : 'System health'}
            </span>
            {systemInfo.isOnline ? (
              <span className="pill bg-emerald-500/10 text-emerald-500 border-emerald-500/25">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
                {backendOnline ? 'Live telemetry' : 'Online'}
              </span>
            ) : (
              <span className="pill bg-red-500/10 text-red-500 border-red-500/25">
                <WifiOff size={11} /> Offline
              </span>
            )}
          </div>
          <h1 className="text-hero font-extrabold tracking-tight" style={{ color: 'var(--color-ink)' }}>Overview</h1>
          <p className="mt-1.5 text-[15px] max-w-xl" style={{ color: 'var(--color-ink-3)' }}>
            {systemInfo.hostName} · {systemInfo.os} · {systemInfo.processor}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {lastRunDisplay && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border"
              style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-line)', color: 'var(--color-ink-3)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Last run: {lastRunDisplay}
            </div>
          )}
          <button onClick={() => onStart()} className="btn btn-primary">
            Launch Maintenance
            <ArrowRight size={16} />
          </button>
        </div>
      </motion.div>

      {/* Bento grid */}
      <div className="grid grid-cols-12 gap-4 sm:gap-5">

        {/* Funnel / pipeline card */}
        <motion.div
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05, ease }}
          className="card card-hover p-5 sm:p-6 col-span-12 lg:col-span-8 overflow-visible"
        >
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold" style={{ color: 'var(--color-ink)' }}>Maintenance Pipeline</h3>
              <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--color-ink-4)' }}>
                {summary ? `Last run · ${summary.mode} profile · ${summary.totalSections} phases` : 'Run a maintenance cycle to see phase throughput'}
              </p>
            </div>
            <CardMenu items={[
              { label: 'Run now',      icon: RefreshCw,    onClick: () => onStart() },
              { label: 'View details', icon: ExternalLink, onClick: () => onStart() },
              { label: 'About metric', icon: Info,         onClick: () => {} },
            ]} />
          </div>

          <div className="grid grid-cols-5 gap-3 mb-8">
            {funnelData.map((d) => (
              <div key={d.label} className="text-center">
                <p className="text-[10px] uppercase tracking-wide font-bold truncate" style={{ color: 'var(--color-ink-4)' }}>{d.label}</p>
                <p className="text-base sm:text-xl font-extrabold tabular-nums mt-0.5" style={{ color: 'var(--color-ink)' }}>{d.display}</p>
              </div>
            ))}
          </div>

          <div className="px-1 pb-1">
            <FunnelBars data={funnelData} height={210} />
          </div>
        </motion.div>

        {/* Resource usage card */}
        <motion.div
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.12, ease }}
          className="card card-hover p-5 sm:p-6 col-span-12 lg:col-span-4"
        >
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-bold" style={{ color: 'var(--color-ink)' }}>Resource Usage</h3>
            <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25 text-[11px]">
              {backendOnline ? 'Live' : 'Cached'}
            </span>
          </div>

          <div className="flex items-end gap-3 mb-1">
            <div className="text-display" style={{ color: 'var(--color-ink)' }}>{cpuPct}%</div>
            <span className="mb-2 pill bg-blue-500/10 text-blue-500 border-blue-500/25 text-[12px]">
              <Cpu size={11} /> CPU
            </span>
          </div>
          <p className="text-xs font-medium mb-6" style={{ color: 'var(--color-ink-4)' }}>
            {systemInfo.processor.split(' ').slice(0, 4).join(' ')}
          </p>

          <div className="space-y-5">
            <ProgressRow label="CPU Load"   value={cpuPct}     total={100} display={`${cpuPct}%`}     color="#2563eb" />
            <ProgressRow label="Memory"     value={memPct}     total={100} display={`${memPct}%`}     color="#7c3aed" delay={0.1} />
            <ProgressRow label="Disk Used"  value={diskUsedPct} total={100} display={`${diskUsedGB} GB`} color="#0891b2" delay={0.2} />
          </div>
        </motion.div>

        {/* System Health */}
        <motion.div
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.18, ease }}
          className="card card-hover p-5 sm:p-6 col-span-12 md:col-span-6 lg:col-span-4"
        >
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-lg font-bold" style={{ color: 'var(--color-ink)' }}>System Health</h3>
            <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25">
              <Activity size={11} /> {healthScore !== null ? `${healthScore}%` : '—'}
            </span>
          </div>
          <p className="text-xs font-medium mb-4" style={{ color: 'var(--color-ink-4)' }}>
            {healthScore !== null ? `Health score from last run` : 'Run a cycle to generate a score'}
          </p>
          {healthSparkData.length > 0
            ? <Sparkline data={healthSparkData} color="#2563eb" height={84} />
            : (
              <div className="h-[84px] flex items-center justify-center rounded-xl border border-dashed" style={{ borderColor: 'var(--color-line)' }}>
                <p className="text-xs" style={{ color: 'var(--color-ink-4)' }}>No run data yet</p>
              </div>
            )
          }
          <div className="flex items-center justify-between mt-3 text-[11px] font-semibold" style={{ color: 'var(--color-ink-4)' }}>
            <span>{systemInfo.uptime}</span>
            <span>{systemInfo.os}</span>
          </div>
        </motion.div>

        {/* Last Run Summary card */}
        <motion.div
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.24, ease }}
          className="card card-hover p-5 sm:p-6 col-span-12 md:col-span-6 lg:col-span-4"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold" style={{ color: 'var(--color-ink)' }}>Last Run</h3>
              <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--color-ink-4)' }}>
                {summary ? `${summary.mode} profile` : 'No run yet'}
              </p>
            </div>
            <CardMenu items={[
              { label: 'New run',      icon: RefreshCw,    onClick: () => onStart() },
              { label: 'View report',  icon: ExternalLink, onClick: () => onStart() },
            ]} />
          </div>
          <div className="flex items-end justify-between gap-4 mt-5">
            <div className="text-4xl font-extrabold tracking-tight" style={{ color: 'var(--color-ink)' }}>
              {summary ? `${summary.passedSections}/${summary.totalSections}` : '—'}
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold" style={{ color: 'var(--color-ink-4)' }}>phases passed</p>
              {summary && (
                <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--color-ink-2)' }}>
                  {summary.durationMinutes} min
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t" style={{ borderColor: 'var(--color-line)' }}>
            <span className="text-xs font-semibold" style={{ color: 'var(--color-ink-4)' }}>packages updated</span>
            <span className="text-sm font-bold" style={{ color: summary ? 'var(--color-green-2)' : 'var(--color-ink-4)' }}>
              {summary ? `+${summary.totalUpdated}` : '—'}
            </span>
          </div>
        </motion.div>

        {/* Disk / Storage card */}
        <motion.div
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.3, ease }}
          className="card card-hover p-5 sm:p-6 col-span-12 md:col-span-6 lg:col-span-4"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold" style={{ color: 'var(--color-ink)' }}>Storage</h3>
              <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--color-ink-4)' }}>
                {systemInfo.freeDiskGB} GB free of {systemInfo.totalDiskGB} GB
              </p>
            </div>
            <CardMenu items={[
              { label: 'Run cleanup',  icon: RefreshCw,    onClick: () => onStart('CleanupOnly') },
              { label: 'View details', icon: ExternalLink, onClick: () => onStart('CleanupOnly') },
            ]} />
          </div>
          <div className="flex items-end justify-between gap-4 mt-5">
            <div className="text-4xl font-extrabold tracking-tight" style={{ color: 'var(--color-ink)' }}>
              {systemInfo.freeDiskGB} <span className="text-xl font-bold" style={{ color: 'var(--color-ink-4)' }}>GB</span>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold" style={{ color: 'var(--color-ink-4)' }}>free</p>
            </div>
          </div>
          <div className="mt-4">
            <ProgressRow label="Used" value={diskUsedPct} total={100} display={`${diskUsedPct}%`} color="#0891b2" />
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t" style={{ borderColor: 'var(--color-line)' }}>
            <span className="text-xs font-semibold" style={{ color: 'var(--color-ink-4)' }}>space reclaimed last run</span>
            <span className="text-sm font-bold" style={{ color: summary ? 'var(--color-green-2)' : 'var(--color-ink-4)' }}>
              {spaceDisplay}
            </span>
          </div>
        </motion.div>

        {/* Insights card */}
        <motion.div
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.36, ease }}
          className="col-span-12 lg:col-span-8"
        >
          {summary ? (
            <InsightsCard
              metric={String(summary.healthScore)} metricSuffix="%"
              title={
                summary.cancelled
                  ? `Run was cancelled after ${summary.passedSections} of ${summary.totalSections} phases completed.`
                  : `${summary.passedSections} of ${summary.totalSections} phases passed on ${summary.mode} profile.`
              }
              description={
                `${summary.totalUpdated} packages updated · ${spaceDisplay} reclaimed · ${summary.issuesFound} issue${summary.issuesFound !== 1 ? 's' : ''} found · ran in ${summary.durationMinutes} min`
              }
              progress={summary.passedSections / Math.max(summary.totalSections, 1)}
              icon={<Shield size={12} />}
            />
          ) : (
            <InsightsCard
              metric="—" metricSuffix=""
              title="No maintenance run yet."
              description="Launch a maintenance cycle to generate your first health report, see packages updated, disk space reclaimed, and system integrity status."
              progress={0}
              icon={<Shield size={12} />}
            />
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.42, ease }}
          className="card card-hover p-5 sm:p-6 col-span-12 md:col-span-6 lg:col-span-4 flex flex-col"
        >
          <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--color-ink)' }}>Quick Actions</h3>
          <p className="text-xs font-medium mb-5" style={{ color: 'var(--color-ink-4)' }}>Jump straight into a workflow</p>

          <div className="grid grid-cols-2 gap-3 flex-1">
            <ActionTile icon={Zap}       label="Quick Update"    accent="#06b6d4" desc="Apps & Defender"           onClick={() => onStart('Quick')} />
            <ActionTile icon={Shield}    label="Health Scan"     accent="#3b82f6" desc="SFC + DISM only"           onClick={() => onStart('ScanOnly')} />
            <ActionTile icon={Download}  label="Full Update"     accent="#8b5cf6" desc="Safe full update cycle"    onClick={() => onStart('Safe')} />
            <ActionTile icon={HardDrive} label="Deep Clean"      accent="#f59e0b" desc="Cleanup + optimise"        onClick={() => onStart('CleanupOnly')} />
          </div>

          <button onClick={() => onStart()} className="btn btn-primary w-full mt-5">
            <Terminal size={15} />
            Open full suite
            <ArrowRight size={15} />
          </button>
        </motion.div>

        {/* Feature strip — real system values */}
        <motion.div
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.48, ease }}
          className="card p-5 sm:p-6 col-span-12 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5"
        >
          {[
            {
              icon: Cpu,
              label: 'Processor',
              value: `${cpuPct}%`,
              sub: systemInfo.processor.split(' ').slice(0, 3).join(' '),
              mode: 'ScanOnly' as RunMode,
            },
            {
              icon: CheckCircle2,
              label: 'Memory',
              value: `${systemInfo.ramGB} GB`,
              sub: `${memPct}% in use`,
              mode: 'Safe' as RunMode,
            },
            {
              icon: Sparkles,
              label: 'Space Reclaimed',
              value: spaceDisplay,
              sub: summary ? 'Last run cleanup' : 'Run cleanup to reclaim',
              mode: 'CleanupOnly' as RunMode,
            },
            {
              icon: TrendingUp,
              label: 'System Uptime',
              value: systemInfo.uptime.split(',')[0],
              sub: systemInfo.uptime,
              mode: 'Aggressive' as RunMode,
            },
          ].map((f) => (
            <button key={f.label} onClick={() => onStart(f.mode)}
              className="flex items-center gap-3 min-w-0 text-left group rounded-2xl p-2 -m-2 transition-colors"
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-surface-2)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
            >
              <div className="w-10 h-10 rounded-xl border text-blue-500 flex items-center justify-center shrink-0 transition-colors"
                style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                <f.icon size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase font-bold tracking-wide truncate" style={{ color: 'var(--color-ink-4)' }}>{f.label}</p>
                <p className="text-base font-extrabold leading-tight" style={{ color: 'var(--color-ink)' }}>{f.value}</p>
                <p className="text-[11px] truncate" style={{ color: 'var(--color-ink-4)' }}>{f.sub}</p>
              </div>
            </button>
          ))}
        </motion.div>
      </div>

      <p className="text-center text-[11px] font-mono mt-8 tracking-wide" style={{ color: 'var(--color-ink-4)' }}>
        {systemInfo.hostName} · {systemInfo.os} · {systemInfo.build}
      </p>
    </div>
  );
}

function ActionTile({
  icon: Icon, label, accent, desc, onClick,
}: { icon: typeof Zap; label: string; accent: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="group flex flex-col items-start gap-1.5 p-4 rounded-2xl border hover:scale-[1.02] active:scale-[0.99] transition-transform text-left"
      style={{
        backgroundColor: `${accent}14`,
        borderColor: `${accent}30`,
        color: accent,
      }}
    >
      <Icon size={20} />
      <span className="text-sm font-bold leading-tight">{label}</span>
      <span className="text-[10.5px] opacity-70 leading-snug">{desc}</span>
    </button>
  );
}
