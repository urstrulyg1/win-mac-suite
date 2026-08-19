import { motion } from 'framer-motion';
import {
  Shield, ArrowRight, Terminal, Activity, HardDrive, Sparkles,
  Download, Cpu, CheckCircle2, TrendingUp, Zap,
} from 'lucide-react';
import FunnelBars from './charts/FunnelBars';
import ProgressRow from './charts/ProgressRow';
import Sparkline from './charts/Sparkline';
import DotMatrix from './charts/DotMatrix';
import InsightsCard from './charts/InsightsCard';

interface Props {
  onStart: () => void;
}

const ease = [0.16, 1, 0.3, 1] as const;

const funnelData = [
  { label: 'Scan', value: 65, display: '65.2k' },
  { label: 'Identify', value: 54, display: '54.8k' },
  { label: 'Download', value: 48, display: '48.6k' },
  { label: 'Install', value: 38, display: '38.3k' },
  { label: 'Verified', value: 32, display: '32.9k' },
];

const sparkHealth = [62, 64, 63, 68, 70, 69, 74, 76, 75, 80, 84, 88];
const rhythm = [0.2, 0.4, 0.6, 0.9, 0.7, 0.5, 0.3, 0.6, 1, 0.8, 0.5, 0.4, 0.6, 0.9, 0.7, 0.5, 0.3, 0.4, 0.6, 0.5];

export default function LandingHero({ onStart }: Props) {
  return (
    <div className="relative z-10 max-w-[1400px] mx-auto px-3 sm:px-6 py-6 sm:py-8">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6"
      >
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="pill bg-blue-50 text-blue-700 border-blue-200">
              <Shield size={12} /> System health
            </span>
            <span className="pill bg-emerald-50 text-emerald-700 border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" /> Online
            </span>
          </div>
          <h1 className="text-hero font-extrabold text-slate-900 tracking-tight">
            Overview
          </h1>
          <p className="text-slate-500 mt-1.5 text-[15px] max-w-xl">
            A unified command center for Windows updates, security signatures, driver diagnostics,
            and deep system maintenance — all in one dashboard.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Last scan: 2 days ago
          </div>
          <button onClick={onStart} className="btn btn-primary">
            Launch Maintenance
            <ArrowRight size={16} />
          </button>
        </div>
      </motion.div>

      {/* Bento grid */}
      <div className="grid grid-cols-12 gap-4 sm:gap-5">
        {/* Funnel card */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05, ease }}
          className="card card-hover p-5 sm:p-6 col-span-12 lg:col-span-8"
        >
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Maintenance Pipeline</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Phase throughput across a full system run
              </p>
            </div>
            <button className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 flex items-center justify-center transition-colors">
              <span className="text-lg leading-none">⋯</span>
            </button>
          </div>

          <div className="grid grid-cols-5 gap-3 mb-8">
            {funnelData.map((d) => (
              <div key={d.label} className="text-center">
                <p className="text-[10px] uppercase tracking-wide font-bold text-slate-400 truncate">{d.label}</p>
                <p className="text-base sm:text-xl font-extrabold text-slate-900 tabular-nums mt-0.5">{d.display}</p>
              </div>
            ))}
          </div>

          <div className="px-1">
            <FunnelBars data={funnelData} height={210} />
          </div>
        </motion.div>

        {/* Gross volume / updates card */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.12, ease }}
          className="card card-hover p-5 sm:p-6 col-span-12 lg:col-span-4"
        >
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">Updates Applied</h3>
            <button className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 flex items-center justify-center transition-colors">
              <span className="text-lg leading-none">⋯</span>
            </button>
          </div>

          <div className="flex items-end gap-3 mb-1">
            <div className="text-display text-slate-900">15</div>
            <span className="mb-2 pill bg-emerald-50 text-emerald-700 border-emerald-200 text-[12px]">
              <TrendingUp size={12} /> +12%
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium mb-6">Packages patched this run</p>

          <div className="space-y-5">
            <ProgressRow label="Winget / Apps" value={8} total={15} display="8" color="#2563eb" delay={0.1} />
            <ProgressRow label="Windows Update" value={3} total={15} display="3" color="#16a34a" delay={0.2} />
            <ProgressRow label="Defender / Store" value={4} total={15} display="4" color="#ec4899" delay={0.3} />
          </div>
        </motion.div>

        {/* Retention / Health score */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.18, ease }}
          className="card card-hover p-5 sm:p-6 col-span-12 md:col-span-6 lg:col-span-4"
        >
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-lg font-bold text-slate-900">System Health</h3>
            <span className="pill bg-blue-50 text-blue-700 border-blue-200">
              <Activity size={11} /> 88%
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium mb-4">Health trend · last 12 runs</p>
          <Sparkline data={sparkHealth} color="#2563eb" height={84} />
          <div className="flex items-center justify-between mt-3 text-[11px] font-semibold text-slate-400">
            <span>Jan</span><span>Mar</span><span>Jun</span><span>Today</span>
          </div>
        </motion.div>

        {/* Transactions / Maintenance runs */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.24, ease }}
          className="card card-hover p-5 sm:p-6 col-span-12 md:col-span-6 lg:col-span-4"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Maintenance Runs</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Weekly activity rhythm</p>
            </div>
            <button className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 flex items-center justify-center transition-colors">
              <span className="text-lg leading-none">⋯</span>
            </button>
          </div>

          <div className="flex items-end justify-between gap-4 mt-5">
            <div className="text-4xl font-extrabold text-slate-900 tracking-tight">106</div>
            <div className="flex-1 pt-4">
              <DotMatrix values={rhythm} color="#22c55e" peakLabel="Peak: Wed" />
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-400">vs last period</span>
            <span className="text-sm font-bold text-emerald-600">+34</span>
          </div>
        </motion.div>

        {/* Customers / Drivers audited */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.3, ease }}
          className="card card-hover p-5 sm:p-6 col-span-12 md:col-span-6 lg:col-span-4"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Drivers Audited</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">OEM & 3rd-party packages</p>
            </div>
            <button className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 flex items-center justify-center transition-colors">
              <span className="text-lg leading-none">⋯</span>
            </button>
          </div>

          <div className="flex items-end justify-between gap-4 mt-5">
            <div className="text-4xl font-extrabold text-slate-900 tracking-tight">1,284</div>
            <div className="flex-1 pt-4">
              <DotMatrix values={rhythm.map((v) => v * 0.9).reverse()} color="#3b82f6" peakLabel="High: Thu" />
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-400">vs last period</span>
            <span className="text-sm font-bold text-emerald-600">+320</span>
          </div>
        </motion.div>

        {/* Insights gradient hero */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.36, ease }}
          className="col-span-12 lg:col-span-8"
        >
          <InsightsCard
            metric="75"
            metricSuffix="%"
            title="Authorization & integrity rate improved by 4% this week."
            description="SFC and DISM scans found no integrity violations. 950 potential failures were avoided, with an estimated 3.1 GB of disk space recovered."
            progress={0.8}
            icon={<Shield size={12} />}
          />
        </motion.div>

        {/* Quick actions card */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.42, ease }}
          className="card card-hover p-5 sm:p-6 col-span-12 md:col-span-6 lg:col-span-4 flex flex-col"
        >
          <h3 className="text-lg font-bold text-slate-900 mb-1">Quick Actions</h3>
          <p className="text-xs text-slate-400 font-medium mb-5">Jump straight into a workflow</p>

          <div className="grid grid-cols-2 gap-3 flex-1">
            <ActionTile icon={Zap} label="Quick Update" color="bg-cyan-50 text-cyan-600 border-cyan-100" onClick={onStart} />
            <ActionTile icon={Shield} label="Full Scan" color="bg-blue-50 text-blue-600 border-blue-100" onClick={onStart} />
            <ActionTile icon={Download} label="Install Updates" color="bg-violet-50 text-violet-600 border-violet-100" onClick={onStart} />
            <ActionTile icon={HardDrive} label="Deep Clean" color="bg-amber-50 text-amber-600 border-amber-100" onClick={onStart} />
          </div>

          <button
            onClick={onStart}
            className="btn btn-primary w-full mt-5"
          >
            <Terminal size={15} />
            Open full suite
            <ArrowRight size={15} />
          </button>
        </motion.div>

        {/* Feature strip */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.48, ease }}
          className="card p-5 sm:p-6 col-span-12 grid grid-cols-2 md:grid-cols-4 gap-5"
        >
          {[
            { icon: Cpu, label: 'Driver Diagnostics', value: '42 OEM', sub: 'PnP devices scanned' },
            { icon: CheckCircle2, label: 'Defender Signatures', value: 'Current', sub: 'Synced 2m ago' },
            { icon: Sparkles, label: 'Junk Reclaimed', value: '3.1 GB', sub: 'Temp & cache' },
            { icon: TrendingUp, label: 'Boot Performance', value: '+18%', sub: 'Faster startup' },
          ].map((f) => (
            <div key={f.label} className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 text-blue-600 flex items-center justify-center shrink-0">
                <f.icon size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase font-bold text-slate-400 tracking-wide truncate">{f.label}</p>
                <p className="text-lg font-extrabold text-slate-900 leading-tight">{f.value}</p>
                <p className="text-[11px] text-slate-400 truncate">{f.sub}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      <p className="text-center text-[11px] text-slate-400 font-mono mt-8 tracking-wide">
        #Requires -RunAsAdministrator · Windows 10/11 · PowerShell 5.1+
      </p>
    </div>
  );
}

function ActionTile({
  icon: Icon, label, color, onClick,
}: { icon: typeof Zap; label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`group flex flex-col items-start gap-2 p-4 rounded-2xl border ${color} hover:scale-[1.02] transition-transform text-left`}
    >
      <Icon size={20} />
      <span className="text-sm font-bold">{label}</span>
    </button>
  );
}
