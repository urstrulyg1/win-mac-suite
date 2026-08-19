import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Search, Bell, RotateCw, ArrowLeft, X,
  User, CheckCircle2, AlertTriangle, Info, Moon, Sun, Monitor,
  Activity, Sparkles, HardDrive, FileText, Layers, Lock,
} from 'lucide-react';
import type { AppPhase, RunSummary, SystemInfo } from '../types';
import { usePlatform } from '../platform';

interface Props {
  phase: AppPhase;
  activeTab: string;
  isRunning: boolean;
  dark: boolean;
  onToggleDark: () => void;
  onHome: () => void;
  onReset: () => void;
  onBack?: () => void;
  onNavTab: (tab: string) => void;
  summary: RunSummary | null;
  systemInfo: SystemInfo;
}

const navTabs = [
  { id: 'overview',     label: 'Overview',     icon: Monitor },
  { id: 'diagnostics',  label: 'Diagnostics',  icon: Activity },
  { id: 'utilities',    label: 'Toolbox',      icon: Sparkles },
  { id: 'maintenance',  label: 'Maintenance',  icon: Shield },
  { id: 'security',     label: 'Security',     icon: Lock },
  { id: 'storage',      label: 'Storage',      icon: HardDrive },
  { id: 'system',       label: 'System',       icon: Layers },
  { id: 'reports',      label: 'Reports',      icon: FileText },
];

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}d ago`;
  if (hrs > 0)  return `${hrs}h ago`;
  return `${mins}m ago`;
}

export default function TopNav({
  phase, activeTab, isRunning, dark, onToggleDark, onHome, onReset, onBack, onNavTab, summary, systemInfo,
}: Props) {
  const { config, isMac } = usePlatform();
  const active = activeTab;

  const notifications = useMemo(() => {
    const items: { id: number; icon: typeof Info; color: string; title: string; body: string; time: string; unread: boolean }[] = [];

    if (summary && !summary.cancelled) {
      const spaceGB = summary.spaceReclaimed >= 1024
        ? `${(summary.spaceReclaimed / 1024).toFixed(1)} GB`
        : summary.spaceReclaimed > 0 ? `${summary.spaceReclaimed} MB` : null;
      items.push({
        id: 1,
        icon: CheckCircle2,
        color: 'text-emerald-500 bg-emerald-500/10',
        title: 'Maintenance completed',
        body: `${summary.mode} profile — ${summary.totalUpdated} packages updated${spaceGB ? `, ${spaceGB} space reclaimed` : ''}. Health score: ${summary.healthScore}%.`,
        time: summary.startedAt ? relTime(summary.startedAt) : 'Just now',
        unread: true,
      });
    }

    if (!systemInfo.isOnline) {
      items.push({
        id: 2,
        icon: AlertTriangle,
        color: 'text-red-500 bg-red-500/10',
        title: 'Network offline',
        body: 'System is running offline. Remote package upgrades will be skipped.',
        time: 'Now',
        unread: true,
      });
    }

    return items;
  }, [summary, systemInfo]);

  const [showSearch,  setShowSearch]  = useState(false);
  const [showBell,    setShowBell]    = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchVal,   setSearchVal]   = useState('');
  const [unreadCount, setUnreadCount] = useState(notifications.filter(n => n.unread).length);

  useEffect(() => {
    setUnreadCount(notifications.filter(n => n.unread).length);
  }, [notifications]);

  const bellRef    = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current    && !bellRef.current.contains(e.target as Node))    setShowBell(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
      if (searchRef.current  && !searchRef.current.contains(e.target as Node))  { setShowSearch(false); setSearchVal(''); }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = () => setUnreadCount(0);

  const brandName = config.productName;
  const brandPrefix = brandName.slice(0, 3);
  const brandSuffix = brandName.slice(3);

  return (
    <header className="sticky top-0 z-40 px-3 sm:px-6 pt-2.5 sm:pt-4">
      <div className="max-w-[1600px] mx-auto card px-3 sm:px-5 h-16 grid grid-cols-[auto_1fr_auto] items-center gap-2 lg:gap-4 rounded-2xl overflow-hidden min-w-0">

        {/* Brand (Left aligned) */}
        <button onClick={onHome} className="flex items-center gap-2.5 shrink-0 group outline-none cursor-pointer justify-self-start" aria-label="Go to overview">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md border border-white/30 group-hover:scale-105 transition-transform shrink-0"
            style={{
              background: isMac
                ? 'linear-gradient(135deg, #06b6d4, #3b82f6)'
                : 'linear-gradient(135deg, #2563eb, #6366f1)',
            }}
          >
            <Shield size={18} className="text-white" />
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-lg sm:text-xl font-extrabold tracking-tight leading-none" style={{ color: 'var(--color-ink)' }}>
              {brandPrefix}<span style={{ color: config.accentColor }}>{brandSuffix}</span>
            </span>
            <span className="text-[10px] font-mono tracking-wider opacity-60" style={{ color: 'var(--color-ink-3)' }}>
              {config.osFamily} Suite
            </span>
          </div>
        </button>

        {/* Workspaces Nav pills (Centered) */}
        <div className="flex items-center justify-center min-w-0 w-full overflow-hidden px-1">
          <nav
            className="hidden md:flex items-center gap-0.5 p-1 rounded-2xl border max-w-full overflow-x-auto no-scrollbar shrink-0"
            style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
          >
            {navTabs.map((t) => {
              const isActive = t.id === active;
              return (
                <button
                  key={t.id}
                  onClick={() => onNavTab(t.id)}
                  className="relative inline-flex items-center justify-center px-2.5 lg:px-3 py-1.5 rounded-xl text-[12px] lg:text-[12.5px] font-semibold transition-colors outline-none whitespace-nowrap cursor-pointer shrink-0"
                  style={{ color: isActive ? '#fff' : 'var(--color-ink-2)' }}
                >
                  {isActive && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-xl shadow-md"
                      style={{ backgroundColor: config.accentColor }}
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <t.icon size={13} className={isActive ? 'text-white' : 'opacity-60'} />
                    {t.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Actions (Right aligned) */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 justify-self-end">
          {phase !== 'landing' && onBack && phase === 'configuring' && (
            <button onClick={onBack} className="btn btn-ghost !p-2 sm:!p-2.5" title="Back" aria-label="Back"><ArrowLeft size={15} /></button>
          )}
          {phase !== 'landing' && (
            <button onClick={onReset} className="btn btn-ghost !p-2 sm:!p-2.5" title="Reset / new run" aria-label="Reset"><RotateCw size={15} /></button>
          )}

          {/* Dark mode toggle */}
          <button
            onClick={onToggleDark}
            className="btn btn-ghost !p-2 sm:!p-2.5 cursor-pointer"
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
          >
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Search Toggle */}
          <div className="relative" ref={searchRef}>
            <button
              onClick={() => setShowSearch((v) => !v)}
              className="btn btn-ghost !p-2 sm:!p-2.5 cursor-pointer"
              title="Search phases & diagnostics"
              aria-label="Search"
            >
              <Search size={15} />
            </button>

            <AnimatePresence>
              {showSearch && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-72 card p-3 shadow-xl z-50"
                >
                  <div className="flex items-center gap-2">
                    <Search size={14} className="text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={searchVal}
                      onChange={(e) => setSearchVal(e.target.value)}
                      placeholder="Quick navigation..."
                      className="field py-1.5 text-xs flex-1"
                      autoFocus
                    />
                    <button onClick={() => setShowSearch(false)} className="text-slate-400 hover:text-slate-200">
                      <X size={14} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Notification Bell */}
          <div className="relative" ref={bellRef}>
            <button
              onClick={() => {
                setShowBell((v) => !v);
                markAllRead();
              }}
              className="btn btn-ghost !p-2 sm:!p-2.5 relative cursor-pointer"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell size={15} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              )}
            </button>

            <AnimatePresence>
              {showBell && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-80 card shadow-xl z-50 overflow-hidden"
                >
                  <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-line)' }}>
                    <span className="text-xs font-bold" style={{ color: 'var(--color-ink)' }}>System Notifications</span>
                    <span className="text-[10px] font-mono opacity-60">{notifications.length} entries</span>
                  </div>
                  <div className="divide-y max-h-72 overflow-y-auto" style={{ borderColor: 'var(--color-line)' }}>
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-xs opacity-60">No new alerts.</div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className="p-3 space-y-1 hover:bg-slate-500/5 transition-colors">
                          <div className="flex items-center gap-2">
                            <span className={`p-1 rounded-md ${n.color}`}><n.icon size={11} /></span>
                            <span className="text-xs font-bold flex-1 truncate" style={{ color: 'var(--color-ink)' }}>{n.title}</span>
                            <span className="text-[10px] font-mono opacity-50">{n.time}</span>
                          </div>
                          <p className="text-[11.5px] leading-relaxed" style={{ color: 'var(--color-ink-3)' }}>{n.body}</p>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User Profile / Status pill */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setShowProfile((v) => !v)}
              className="flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1 rounded-xl border transition-colors cursor-pointer"
              style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
              title="System Profile &amp; User"
            >
              <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-[10px] font-mono shrink-0">
                <User size={12} />
              </div>
              <div className="hidden xl:flex flex-col text-left leading-tight">
                <span className="text-[11px] font-bold truncate max-w-[80px]" style={{ color: 'var(--color-ink)' }}>
                  {systemInfo.user || 'User'}
                </span>
                <span className="text-[9px] font-mono opacity-60 truncate">
                  {systemInfo.hostName ? systemInfo.hostName.split('.')[0] : config.osFamily}
                </span>
              </div>
            </button>

            <AnimatePresence>
              {showProfile && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-56 card shadow-xl z-50 overflow-hidden"
                >
                  <div className="p-3 border-b space-y-0.5" style={{ borderColor: 'var(--color-line)' }}>
                    <p className="text-xs font-bold" style={{ color: 'var(--color-ink)' }}>{systemInfo.user || 'Active User'}</p>
                    <p className="text-[10px] font-mono opacity-60 truncate">{systemInfo.hostName || 'Local Host'}</p>
                  </div>
                  <div className="p-2 space-y-1 text-xs">
                    <div className="p-2 rounded-lg flex items-center justify-between text-[11.5px]" style={{ backgroundColor: 'var(--color-surface-2)' }}>
                      <span className="opacity-70">Architecture</span>
                      <span className="font-mono font-bold text-blue-500">{isMac ? 'arm64' : 'x64'}</span>
                    </div>
                    <div className="p-2 rounded-lg flex items-center justify-between text-[11.5px]" style={{ backgroundColor: 'var(--color-surface-2)' }}>
                      <span className="opacity-70">OS Version</span>
                      <span className="font-mono font-bold">{systemInfo.os ? systemInfo.os.split(' ')[1] || '14.0' : 'macOS'}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
