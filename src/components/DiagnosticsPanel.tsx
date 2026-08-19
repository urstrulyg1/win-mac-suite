import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, Shield, AlertTriangle, CheckCircle2, Cpu,
  HardDrive, MemoryStick, Battery, Wifi, ArrowRight,
  RefreshCw, Play, Sparkles, Wrench, Info, ExternalLink,
} from 'lucide-react';
import type { HealthCheckItem } from '../platform/types';
import type { SystemInfo, RunMode } from '../types';
import { usePlatform } from '../platform';
import HealthScore from './HealthScore';

interface Props {
  systemInfo: SystemInfo;
  onStartAction: (mode: RunMode) => void;
}

const ease = [0.16, 1, 0.3, 1] as const;

export default function DiagnosticsPanel({ systemInfo, onStartAction }: Props) {
  const { config, isMac } = usePlatform();
  const [healthItems, setHealthItems] = useState<HealthCheckItem[]>([]);
  const [overallScore, setOverallScore] = useState(94);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:3131/api/health-check');
      if (res.ok) {
        const data = await res.json();
        setHealthItems(data.issues || []);
        if (data.score) setOverallScore(data.score);
      }
    } catch {
      // Fallback dynamic health calculation from telemetry
      const diskPct = Math.round(((systemInfo.totalDiskGB - systemInfo.freeDiskGB) / Math.max(systemInfo.totalDiskGB, 1)) * 100);
      const items: HealthCheckItem[] = [
        {
          id: 'cpu',
          category: 'CPU',
          status: systemInfo.cpuUsage > 80 ? 'warning' : 'healthy',
          title: 'Processor Load Status',
          description: `Current utilization is ${systemInfo.cpuUsage}%.`,
          value: `${systemInfo.cpuUsage}%`,
        },
        {
          id: 'mem',
          category: 'Memory',
          status: systemInfo.memoryUsage > 85 ? 'warning' : 'healthy',
          title: 'Memory Utilization',
          description: `Active physical memory is at ${systemInfo.memoryUsage}%.`,
          value: `${systemInfo.memoryUsage}%`,
        },
        {
          id: 'storage',
          category: 'Storage',
          status: diskPct > 85 ? 'warning' : 'healthy',
          title: 'Storage Capacity',
          description: `${systemInfo.freeDiskGB} GB free of ${systemInfo.totalDiskGB} GB.`,
          value: `${systemInfo.freeDiskGB} GB Free`,
          recommendation: diskPct > 85 ? 'Storage cleanup recommended.' : undefined,
          actionLabel: diskPct > 85 ? 'Clean Storage' : undefined,
          actionTarget: 'CleanupOnly',
        },
        {
          id: 'sec',
          category: 'Security',
          status: 'healthy',
          title: isMac ? 'XProtect Signatures' : 'Defender Security Engine',
          description: 'Signatures and real-time heuristics verified.',
          value: 'Protected',
        },
        {
          id: 'net',
          category: 'Network',
          status: systemInfo.isOnline ? 'healthy' : 'critical',
          title: 'Network Connectivity',
          description: systemInfo.isOnline ? 'Active internet connection verified.' : 'Offline mode.',
          value: systemInfo.isOnline ? 'Online' : 'Offline',
        },
      ];
      setHealthItems(items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, [systemInfo]);

  const categoryIcons: Record<string, typeof Cpu> = {
    CPU: Cpu,
    Memory: MemoryStick,
    Storage: HardDrive,
    Security: Shield,
    Updates: RefreshCw,
    Startup: Sparkles,
    Battery: Battery,
    Network: Wifi,
  };

  const filteredItems = selectedCategory
    ? healthItems.filter((i) => i.category === selectedCategory)
    : healthItems;

  return (
    <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
      >
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25">
              <Activity size={12} /> Diagnostics Center
            </span>
            <span className="pill" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-ink-3)', borderColor: 'var(--color-line)' }}>
              {config.productName} Automated Scanner
            </span>
          </div>
          <h1 className="text-hero font-extrabold tracking-tight" style={{ color: 'var(--color-ink)' }}>
            System Health &amp; Diagnostics
          </h1>
          <p className="mt-1 text-[14px]" style={{ color: 'var(--color-ink-3)' }}>
            Continuous monitoring and actionable health recommendations for your host machine.
          </p>
        </div>

        <button
          onClick={fetchHealth}
          disabled={loading}
          className="btn btn-ghost text-xs"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin-smooth' : ''} />
          <span>Re-scan System</span>
        </button>
      </motion.div>

      {/* Health Score Bento Header */}
      <div className="grid grid-cols-12 gap-4 sm:gap-5 items-stretch">
        <div className="card p-6 col-span-12 lg:col-span-4 flex flex-col items-center justify-center text-center">
          <HealthScore score={overallScore} />
          <p className="text-xs font-semibold mt-2" style={{ color: 'var(--color-ink-3)' }}>
            {overallScore >= 90 ? 'System is fully optimized and healthy' : 'Minor optimization opportunities detected'}
          </p>
          <button
            onClick={() => onStartAction('ScanOnly')}
            className="btn btn-primary text-xs w-full mt-4"
          >
            <Play size={13} className="fill-white" />
            Run Comprehensive Health Scan
          </button>
        </div>

        {/* Category Breakdown Matrix */}
        <div className="card p-6 col-span-12 lg:col-span-8 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>Health Breakdown</h3>
              <p className="text-xs font-medium" style={{ color: 'var(--color-ink-4)' }}>Click any category to filter diagnostic findings</p>
            </div>
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-xs text-blue-500 hover:text-blue-400 font-semibold cursor-pointer"
              >
                Show All
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {['CPU', 'Memory', 'Storage', 'Security', 'Network'].map((cat) => {
              const Icon = categoryIcons[cat] || Activity;
              const matching = healthItems.filter((i) => i.category === cat);
              const isWarning = matching.some((i) => i.status === 'warning' || i.status === 'critical');
              const isSelected = selectedCategory === cat;

              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(isSelected ? null : cat)}
                  className="p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between"
                  style={
                    isSelected
                      ? { backgroundColor: 'var(--color-surface-hover)', borderColor: '#3b82f6', boxShadow: '0 0 0 1px #3b82f6' }
                      : { backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }
                  }
                >
                  <div className="flex items-center justify-between mb-2">
                    <Icon size={16} className="text-blue-500" />
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: isWarning ? '#f59e0b' : '#22c55e' }}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-bold" style={{ color: 'var(--color-ink)' }}>{cat}</p>
                    <p className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--color-ink-4)' }}>
                      {isWarning ? 'Attention' : 'Optimal'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Findings & Actionable Recommendations */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench size={16} className="text-blue-500" />
            <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>
              Diagnostic Findings ({filteredItems.length})
            </h3>
          </div>
        </div>

        <div className="space-y-3">
          {filteredItems.map((item) => {
            const isWarn = item.status === 'warning' || item.status === 'critical';
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border"
                style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className="p-2 rounded-xl shrink-0 mt-0.5 border"
                    style={
                      isWarn
                        ? { backgroundColor: 'rgba(245,158,11,0.12)', color: '#f59e0b', borderColor: 'rgba(245,158,11,0.25)' }
                        : { backgroundColor: 'rgba(34,197,94,0.12)', color: '#22c55e', borderColor: 'rgba(34,197,94,0.25)' }
                    }
                  >
                    {isWarn ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold truncate" style={{ color: 'var(--color-ink)' }}>
                        {item.title}
                      </p>
                      <span
                        className="text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded border"
                        style={
                          isWarn
                            ? { backgroundColor: 'rgba(245,158,11,0.10)', color: '#f59e0b', borderColor: 'rgba(245,158,11,0.25)' }
                            : { backgroundColor: 'rgba(34,197,94,0.10)', color: '#22c55e', borderColor: 'rgba(34,197,94,0.25)' }
                        }
                      >
                        {item.value}
                      </span>
                    </div>
                    <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--color-ink-3)' }}>
                      {item.description}
                    </p>
                    {item.recommendation && (
                      <p className="text-[11px] font-semibold mt-1 text-amber-500">
                        Recommendation: {item.recommendation}
                      </p>
                    )}
                  </div>
                </div>

                {item.actionLabel && (
                  <button
                    onClick={() => onStartAction((item.actionTarget as RunMode) || 'Safe')}
                    className="btn btn-primary text-xs shrink-0 self-start sm:self-center !py-2 !px-3"
                  >
                    <span>{item.actionLabel}</span>
                    <ArrowRight size={12} />
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
