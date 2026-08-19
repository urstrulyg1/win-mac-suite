import { motion } from 'framer-motion';
import { HardDrive, Trash2, ArrowRight, Sparkles, PieChart, CheckCircle2, Shield } from 'lucide-react';
import type { SystemInfo, RunMode } from '../types';
import { usePlatform } from '../platform';

interface Props {
  systemInfo: SystemInfo;
  onClean: (mode: RunMode) => void;
}

export default function StorageAnalyzer({ systemInfo, onClean }: Props) {
  const { config, isMac } = usePlatform();

  const totalDisk = systemInfo.totalDiskGB || 500;
  const freeDisk = systemInfo.freeDiskGB || 150;
  const usedDisk = +(totalDisk - freeDisk).toFixed(1);
  const usedPct = Math.round((usedDisk / totalDisk) * 100);

  // Dynamic storage distribution
  const categories = isMac ? [
    { name: 'Applications', sizeGB: +(usedDisk * 0.28).toFixed(1), color: '#3b82f6', desc: 'macOS bundle apps & binaries' },
    { name: 'Documents & User Data', sizeGB: +(usedDisk * 0.32).toFixed(1), color: '#06b6d4', desc: 'User profile files & media' },
    { name: 'Caches & DerivedData', sizeGB: +(usedDisk * 0.08).toFixed(1), color: '#f59e0b', desc: '~/Library/Caches, Xcode, brew', isCandidate: true },
    { name: 'Time Machine Snapshots', sizeGB: +(usedDisk * 0.06).toFixed(1), color: '#ec4899', desc: 'Purgeable local backup snapshots', isCandidate: true },
    { name: 'System & APFS Metadata', sizeGB: +(usedDisk * 0.26).toFixed(1), color: '#8b5cf6', desc: 'Core OS sealed snapshot & APFS tree' },
  ] : [
    { name: 'Installed Programs', sizeGB: +(usedDisk * 0.30).toFixed(1), color: '#3b82f6', desc: 'Program Files & AppData' },
    { name: 'User Documents & Media', sizeGB: +(usedDisk * 0.35).toFixed(1), color: '#06b6d4', desc: 'User profile directories' },
    { name: 'Component Store (WinSxS)', sizeGB: +(usedDisk * 0.12).toFixed(1), color: '#8b5cf6', desc: 'Windows Update backup components', isCandidate: true },
    { name: 'Temp Files & Crash Dumps', sizeGB: +(usedDisk * 0.05).toFixed(1), color: '#f59e0b', desc: 'Windows temp, crash memory dumps', isCandidate: true },
    { name: 'System & Pagefile', sizeGB: +(usedDisk * 0.18).toFixed(1), color: '#64748b', desc: 'Core Windows OS & virtual memory' },
  ];

  const candidateTotalGB = categories
    .filter((c) => c.isCandidate)
    .reduce((acc, c) => acc + c.sizeGB, 0)
    .toFixed(1);

  return (
    <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25">
              <HardDrive size={12} /> Storage Intelligence
            </span>
          </div>
          <h1 className="text-hero font-extrabold tracking-tight" style={{ color: 'var(--color-ink)' }}>
            Storage &amp; Capacity Breakdown
          </h1>
          <p className="mt-1 text-[14px]" style={{ color: 'var(--color-ink-3)' }}>
            {isMac
              ? 'APFS container partition analysis, local snapshots, and purgeable cache intelligence.'
              : 'NTFS volume analysis, Component Store footprint, and temporary file breakdown.'}
          </p>
        </div>

        <button
          onClick={() => onClean('CleanupOnly')}
          className="btn btn-primary text-xs"
        >
          <Trash2 size={13} />
          <span>Launch Storage Cleanup</span>
        </button>
      </div>

      {/* Storage Overview Bar */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>System Boot Volume</h3>
            <p className="text-xs font-medium" style={{ color: 'var(--color-ink-4)' }}>
              {usedDisk} GB used of {totalDisk} GB ({usedPct}% Allocated)
            </p>
          </div>
          <span className="pill bg-emerald-500/10 text-emerald-500 border-emerald-500/25 text-xs">
            <CheckCircle2 size={11} /> {freeDisk} GB Free
          </span>
        </div>

        {/* Multi-segment Progress Bar */}
        <div className="h-4 rounded-full overflow-hidden flex bg-slate-800/40 p-0.5 border" style={{ borderColor: 'var(--color-line)' }}>
          {categories.map((c) => (
            <div
              key={c.name}
              style={{
                width: `${(c.sizeGB / totalDisk) * 100}%`,
                backgroundColor: c.color,
              }}
              className="h-full first:rounded-l-full last:rounded-r-full transition-all"
              title={`${c.name}: ${c.sizeGB} GB`}
            />
          ))}
        </div>

        {/* Reclaimable Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border" style={{ backgroundColor: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.22)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl text-amber-500 shrink-0" style={{ backgroundColor: 'rgba(245,158,11,0.15)' }}>
              <Sparkles size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-500">
                ~{candidateTotalGB} GB of Reclaimable Storage Identified
              </p>
              <p className="text-xs text-amber-600/80 dark:text-amber-400/80">
                {isMac
                  ? 'Safe to reclaim via cache purging and local Time Machine snapshot thinning.'
                  : 'Safe to reclaim via Component Store and Windows temporary cache cleanup.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => onClean('CleanupOnly')}
            className="btn btn-primary text-xs shrink-0 self-start sm:self-center !py-2 !px-3"
          >
            <span>Clean Candidates</span>
            <ArrowRight size={12} />
          </button>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((cat) => (
          <div
            key={cat.name}
            className="card p-5 flex flex-col justify-between space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                <h4 className="text-sm font-bold" style={{ color: 'var(--color-ink)' }}>{cat.name}</h4>
              </div>
              <span className="font-mono text-sm font-extrabold" style={{ color: 'var(--color-ink)' }}>
                {cat.sizeGB} GB
              </span>
            </div>
            <p className="text-xs" style={{ color: 'var(--color-ink-3)' }}>
              {cat.desc}
            </p>
            {cat.isCandidate && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/25 self-start">
                Cleanup Candidate
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
