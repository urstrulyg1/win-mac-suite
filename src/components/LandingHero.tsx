import { useState } from 'react';
import { Activity, ArrowRight, CheckCircle2, ChevronRight, Cpu, Download, HardDrive, Play, RefreshCw, Shield, Sparkles, Terminal, Thermometer, Wifi, Wrench } from 'lucide-react';
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

function valueOrUnavailable(value: unknown, suffix = ''): string {
  if (value === null || value === undefined || value === '' || (typeof value === 'number' && !Number.isFinite(value))) return 'UNAVAILABLE';
  return `${value}${suffix}`;
}

export default function LandingHero({ onStart, systemInfo, summary, lastRunTimestamp, backendOnline, onNavigateTab }: Props) {
  const { config, isMac } = usePlatform();
  const [inspectItem, setInspectItem] = useState<InspectorData | null>(null);

  const cpu = Number.isFinite(systemInfo.cpuUsage) ? systemInfo.cpuUsage : null;
  const memory = Number.isFinite(systemInfo.memoryUsage) ? systemInfo.memoryUsage : null;
  const totalDisk = Number.isFinite(systemInfo.totalDiskGB) ? systemInfo.totalDiskGB : null;
  const freeDisk = Number.isFinite(systemInfo.freeDiskGB) ? systemInfo.freeDiskGB : null;
  const diskUsed = totalDisk !== null && freeDisk !== null && totalDisk > 0 ? Math.max(0, Math.min(100, Math.round(((totalDisk - freeDisk) / totalDisk) * 100))) : null;
  const reclaimed = summary?.spaceReclaimed;
  const health = summary?.healthScore;

  const inspect = (data: InspectorData) => setInspectItem(data);
  const showTelemetry = (title: string, category: string, details: { label: string; value: unknown }[], action?: { label: string; onClick: () => void }) => {
    inspect({
      title,
      category,
      badge: backendOnline ? 'Live' : 'Unavailable',
      subtitle: backendOnline ? 'Observed from the local telemetry service.' : 'The local telemetry service is not currently reachable.',
      dataSource: '/api/sysinfo',
      evidenceQuality: backendOnline ? 'Observed' : 'Unavailable',
      freshness: backendOnline ? 'Live' : 'Unavailable',
      details: details.map((d) => ({ label: d.label, value: valueOrUnavailable(d.value) })),
      actionButton: action,
    });
  };

  const healthDetails = [
    { label: 'Health score', value: health === null || health === undefined ? 'Not measured' : `${health}%` },
    { label: 'CPU', value: valueOrUnavailable(cpu, '%') },
    { label: 'Memory', value: valueOrUnavailable(memory, '%') },
    { label: 'Disk used', value: valueOrUnavailable(diskUsed, '%') },
    { label: 'Last run', value: lastRunTimestamp ? new Date(lastRunTimestamp).toLocaleString() : 'No completed run' },
  ];

  const quickActions = config.quickActions || [];

  return (
    <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <InspectorModal data={inspectItem} onClose={() => setInspectItem(null)} />

      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-center gap-4 min-w-0">
          <img src="/logo.png" alt="Win/Mac Suite" className="w-16 h-16 sm:w-20 sm:h-20 object-contain shrink-0" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <button
                type="button"
                onClick={() => showTelemetry('System Health', 'Health Diagnostics', healthDetails, { label: 'Run health scan', onClick: () => onStart('ScanOnly') })}
                className="pill bg-blue-500/10 text-blue-500 border-blue-500/25 cursor-pointer hover:scale-105 transition-transform"
              >
                <Shield size={12} /> {health === null || health === undefined ? 'Health not measured' : `Health ${health}%`}
              </button>
              <button
                type="button"
                onClick={() => showTelemetry('Telemetry Service', 'Connection Status', [
                  { label: 'API', value: '/api/sysinfo' },
                  { label: 'Platform', value: systemInfo.os },
                  { label: 'Host', value: systemInfo.hostName },
                  { label: 'Connectivity', value: systemInfo.isOnline ? 'Online' : 'Offline' },
                ])}
                className={`pill cursor-pointer hover:scale-105 transition-transform ${backendOnline ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25' : 'bg-amber-500/10 text-amber-500 border-amber-500/25'}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${backendOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                {backendOnline ? 'Live telemetry' : 'Telemetry unavailable'}
              </button>
            </div>
            <h1 className="text-hero font-extrabold tracking-tight truncate" style={{ color: 'var(--color-ink)' }}>{config.productName}</h1>
            <p className="mt-0.5 text-[14px] truncate" style={{ color: 'var(--color-ink-3)' }}>{config.tagline} for <span className="font-semibold text-blue-500">{systemInfo.os || 'your system'}</span>.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          {onNavigateTab && (
            <button type="button" onClick={() => onNavigateTab('graph')} className="btn btn-secondary text-xs flex items-center gap-1.5 cursor-pointer">
              <Activity size={14} /> Graphical View
            </button>
          )}
          <button type="button" onClick={() => onStart('Safe')} className="btn btn-primary cursor-pointer">
            <Terminal size={15} /> Launch Maintenance
          </button>
        </div>
      </header>

      {summary && (
        <section className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-blue-500/20">
          <button type="button" onClick={() => onNavigateTab?.('reports')} className="flex items-center gap-3 text-left min-w-0 cursor-pointer group">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0"><CheckCircle2 size={20} /></div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-blue-400">Previous run</p>
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-ink)' }}>{summary.passedSections ?? 0} of {summary.totalSections ?? 0} phases passed · {summary.totalUpdated ?? 0} updates</p>
              <p className="text-[11px]" style={{ color: 'var(--color-ink-4)' }}>{lastRunTimestamp ? new Date(lastRunTimestamp).toLocaleString() : 'Completed run retained locally'}</p>
            </div>
          </button>
          <div className="flex gap-2 shrink-0">
            {onNavigateTab && <button type="button" onClick={() => onNavigateTab('reports')} className="btn btn-secondary text-xs cursor-pointer">View report <ArrowRight size={13} /></button>}
            <button type="button" onClick={() => onStart('Safe')} className="btn btn-primary text-xs cursor-pointer"><RefreshCw size={12} /> Run again</button>
          </div>
        </section>
      )}

      <div className="grid grid-cols-12 gap-4 sm:gap-5">
        <button
          type="button"
          onClick={() => showTelemetry('System Health', 'Health Diagnostics', healthDetails, { label: 'Run health scan', onClick: () => onStart('ScanOnly') })}
          className="card card-hover p-5 sm:p-6 col-span-12 lg:col-span-4 text-left cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4"><div><h2 className="text-lg font-bold" style={{ color: 'var(--color-ink)' }}>System Health</h2><p className="text-xs" style={{ color: 'var(--color-ink-4)' }}>Observed live telemetry</p></div><Shield size={20} className="text-blue-500" /></div>
          <div className="text-4xl font-extrabold" style={{ color: 'var(--color-ink)' }}>{health === null || health === undefined ? '—' : health}<span className="text-lg ml-1" style={{ color: 'var(--color-ink-4)' }}>{health === null || health === undefined ? '' : '/100'}</span></div>
          <div className="mt-4 space-y-2">
            <Metric label="CPU" value={cpu} suffix="%" />
            <Metric label="Memory" value={memory} suffix="%" />
            <Metric label="Disk used" value={diskUsed} suffix="%" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => showTelemetry('Resource Utilization', 'Hardware Telemetry', [
            { label: 'Processor', value: systemInfo.processor },
            { label: 'CPU load', value: valueOrUnavailable(cpu, '%') },
            { label: 'CPU temperature', value: systemInfo.cpuTempFormatted || (systemInfo.cpuTemp == null ? 'UNAVAILABLE' : `${systemInfo.cpuTemp}°C`) },
            { label: 'RAM', value: `${valueOrUnavailable(systemInfo.ramGB)} GB` },
          ], { label: 'Open performance', onClick: () => onNavigateTab?.('performance') })}
          className="card card-hover p-5 sm:p-6 col-span-12 lg:col-span-4 text-left cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4"><div><h2 className="text-lg font-bold" style={{ color: 'var(--color-ink)' }}>Resources</h2><p className="text-xs" style={{ color: 'var(--color-ink-4)' }}>CPU, memory and thermal state</p></div><Cpu size={20} className="text-violet-400" /></div>
          <div className="text-3xl font-extrabold" style={{ color: 'var(--color-ink)' }}>{valueOrUnavailable(cpu, '%')} <span className="text-sm font-bold" style={{ color: 'var(--color-ink-4)' }}>CPU</span></div>
          <div className="mt-4 grid grid-cols-2 gap-2"><Stat label="Memory" value={valueOrUnavailable(memory, '%')} /><Stat label="Temperature" value={systemInfo.cpuTempFormatted || 'UNAVAILABLE'} /><Stat label="RAM" value={valueOrUnavailable(systemInfo.ramGB, ' GB')} /><Stat label="Uptime" value={systemInfo.uptime || 'UNAVAILABLE'} /></div>
        </button>

        <button
          type="button"
          onClick={() => showTelemetry('Storage Volume', 'Filesystem Telemetry', [
            { label: 'Free space', value: freeDisk === null ? null : `${freeDisk} GB` },
            { label: 'Total capacity', value: totalDisk === null ? null : `${totalDisk} GB` },
            { label: 'Used', value: diskUsed === null ? null : `${diskUsed}%` },
            { label: 'Reclaimed last run', value: reclaimed === undefined ? 'Not measured' : `${reclaimed} MB` },
          ], { label: 'Open storage', onClick: () => onNavigateTab?.('storage') })}
          className="card card-hover p-5 sm:p-6 col-span-12 lg:col-span-4 text-left cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4"><div><h2 className="text-lg font-bold" style={{ color: 'var(--color-ink)' }}>Storage</h2><p className="text-xs" style={{ color: 'var(--color-ink-4)' }}>Observed filesystem capacity</p></div><HardDrive size={20} className="text-cyan-400" /></div>
          <div className="text-3xl font-extrabold" style={{ color: 'var(--color-ink)' }}>{freeDisk === null ? '—' : `${freeDisk} GB`} <span className="text-sm font-bold" style={{ color: 'var(--color-ink-4)' }}>free</span></div>
          <div className="mt-4"><Metric label="Used" value={diskUsed} suffix="%" /></div>
          <p className="text-[11px] mt-3" style={{ color: 'var(--color-ink-4)' }}>{reclaimed === undefined ? 'No cleanup result yet' : `${reclaimed} MB verified reclaimed in last run`}</p>
        </button>

        <section className="card p-5 sm:p-6 col-span-12 lg:col-span-8">
          <div className="flex items-center justify-between mb-4"><div><h2 className="text-lg font-bold" style={{ color: 'var(--color-ink)' }}>Quick Actions</h2><p className="text-xs" style={{ color: 'var(--color-ink-4)' }}>Every action opens the real maintenance workflow.</p></div><Wrench size={20} className="text-amber-400" /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {quickActions.map((qa) => (
              <button key={qa.id} type="button" onClick={() => onStart(qa.mode)} className="group rounded-2xl border p-4 text-left cursor-pointer hover:scale-[1.02] transition-transform" style={{ borderColor: `${qa.accent}40`, backgroundColor: `${qa.accent}12`, color: qa.accent }}>
                <Sparkles size={17} />
                <p className="font-bold text-sm mt-2">{qa.label}</p>
                <p className="text-[11px] opacity-75 mt-1">{qa.desc}</p>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold mt-3">Open <ChevronRight size={12} /></span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <button type="button" onClick={() => onStart('ScanOnly')} className="btn btn-secondary text-xs cursor-pointer"><Play size={13} /> Health scan</button>
            <button type="button" onClick={() => onStart('CleanupOnly')} className="btn btn-secondary text-xs cursor-pointer"><HardDrive size={13} /> Storage cleanup</button>
            {onNavigateTab && <button type="button" onClick={() => onNavigateTab('reports')} className="btn btn-ghost text-xs cursor-pointer"><Download size={13} /> Reports</button>}
          </div>
        </section>

        <button
          type="button"
          onClick={() => showTelemetry('Network Status', 'Network Diagnostics', [
            { label: 'Connectivity', value: systemInfo.isOnline ? 'Online' : 'Offline' },
            { label: 'Host', value: systemInfo.hostName },
            { label: 'Platform', value: systemInfo.os },
          ], { label: 'Open network diagnostics', onClick: () => onNavigateTab?.('network') })}
          className="card card-hover p-5 sm:p-6 col-span-12 md:col-span-6 lg:col-span-4 text-left cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3"><h2 className="text-lg font-bold" style={{ color: 'var(--color-ink)' }}>Network</h2><Wifi size={20} className="text-cyan-400" /></div>
          <p className="text-2xl font-extrabold" style={{ color: 'var(--color-ink)' }}>{systemInfo.isOnline ? 'Online' : 'Offline'}</p>
          <p className="text-xs mt-2" style={{ color: 'var(--color-ink-4)' }}>Click for diagnostics, interfaces, DNS and listening ports.</p>
        </button>

        <button
          type="button"
          onClick={() => showTelemetry('Platform Capabilities', 'System Capabilities', [
            { label: 'OS', value: systemInfo.os },
            { label: 'Architecture', value: systemInfo.arch },
            { label: 'Host', value: systemInfo.hostName },
            { label: 'Mode', value: isMac ? 'macOS native tools' : 'Windows native tools' },
          ], { label: isMac ? 'Open macOS & Sync' : 'Open Windows Center', onClick: () => onNavigateTab?.(isMac ? 'apple' : 'windows') })}
          className="card card-hover p-5 sm:p-6 col-span-12 md:col-span-6 lg:col-span-4 text-left cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3"><h2 className="text-lg font-bold" style={{ color: 'var(--color-ink)' }}>Platform Tools</h2><Terminal size={20} className="text-blue-400" /></div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-ink-2)' }}>{isMac ? 'macOS native tooling' : 'Windows native tooling'}</p>
          <p className="text-xs mt-2" style={{ color: 'var(--color-ink-4)' }}>Open platform-specific diagnostics and repair operations.</p>
        </button>

        <button
          type="button"
          onClick={() => showTelemetry('Last Diagnostics', 'Run Results', [
            { label: 'Profile', value: summary?.mode || 'None' },
            { label: 'Phases passed', value: summary ? `${summary.passedSections} / ${summary.totalSections}` : 'No completed run' },
            { label: 'Issues fixed', value: summary?.issuesFixed ?? 'Not measured' },
            { label: 'Space reclaimed', value: reclaimed === undefined ? 'Not measured' : `${reclaimed} MB` },
          ], { label: 'Open reports', onClick: () => onNavigateTab?.('reports') })}
          className="card card-hover p-5 sm:p-6 col-span-12 md:col-span-6 lg:col-span-4 text-left cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3"><h2 className="text-lg font-bold" style={{ color: 'var(--color-ink)' }}>Last Diagnostics</h2><RefreshCw size={20} className="text-emerald-400" /></div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-ink-2)' }}>{summary ? `${summary.passedSections} / ${summary.totalSections} phases passed` : 'No completed run'}</p>
          <p className="text-xs mt-2" style={{ color: 'var(--color-ink-4)' }}>{summary ? `${summary.totalUpdated} updates · ${summary.issuesFixed} issues fixed` : 'Run a health scan to collect measured results.'}</p>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab?.('developer')}
          className="card card-hover p-5 sm:p-6 col-span-12 md:col-span-6 lg:col-span-4 text-left cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3"><h2 className="text-lg font-bold" style={{ color: 'var(--color-ink)' }}>Developer Health</h2><Activity size={20} className="text-yellow-400" /></div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-ink-2)' }}>Inspect developer environment</p>
          <p className="text-xs mt-2" style={{ color: 'var(--color-ink-4)' }}>Toolchains, package managers, SDKs and development diagnostics.</p>
        </button>
      </div>

      <p className="text-center text-[11px] font-mono tracking-wide" style={{ color: 'var(--color-ink-4)' }}>
        {config.productName} · {systemInfo.hostName || 'Local host'} · {systemInfo.os || 'OS unavailable'} {systemInfo.build ? `(${systemInfo.build})` : ''}
      </p>
    </div>
  );
}

function Metric({ label, value, suffix = '' }: { label: string; value: number | null; suffix?: string }) {
  return <div className="flex items-center justify-between gap-3"><span className="text-xs font-medium" style={{ color: 'var(--color-ink-4)' }}>{label}</span><span className="text-xs font-bold tabular-nums" style={{ color: 'var(--color-ink-2)' }}>{value === null ? 'UNAVAILABLE' : `${value}${suffix}`}</span></div>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border p-2.5" style={{ borderColor: 'var(--color-line)', backgroundColor: 'var(--color-surface-2)' }}><p className="text-[10px] uppercase font-bold" style={{ color: 'var(--color-ink-4)' }}>{label}</p><p className="text-xs font-bold mt-1 truncate" style={{ color: 'var(--color-ink-2)' }}>{value}</p></div>;
}
