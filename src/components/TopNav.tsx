import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Search, Bell, RotateCw, ArrowLeft, X, Settings,
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
  { id: 'overview',     label: 'Overview',            icon: Monitor },
  { id: 'diagnostics',  label: 'Diagnostics',         icon: Activity },
  { id: 'maintenance',  label: 'Maintenance',         icon: Shield },
  { id: 'security',     label: 'Security & Privacy',  icon: Lock },
  { id: 'storage',      label: 'Storage & Cleanup',   icon: HardDrive },
  { id: 'system',       label: 'System & Apps',       icon: Layers },
  { id: 'reports',      label: 'Reports & History',   icon: FileText },
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
    <header className="sticky top-0 z-40 px-4 sm:px-6 pt-3 sm:pt-4">
      <div className="max-w-[1600px] mx-auto card px-4 sm:px-6 h-16 flex items-center justify-between gap-3 rounded-2xl">

        {/* Brand */}
        <button onClick={onHome} className="flex items-center gap-2.5 shrink-0 group outline-none cursor-pointer" aria-label="Go to overview">
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
            <span className="text-xl font-extrabold tracking-tight leading-none" style={{ color: 'var(--color-ink)' }}>
              {brandPrefix}<span style={{ color: config.accentColor }}>{brandSuffix}</span>
            </span>
            <span className="text-[10px] font-mono tracking-wider opacity-60" style={{ color: 'var(--color-ink-3)' }}>
              {config.osFamily} Suite
            </span>
          </div>
        </button>

        {/* 7 Workspaces Nav pills */}
        <nav className="hidden xl:flex items-center gap-0.5 p-1 rounded-2xl border"
          style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
          {navTabs.map((t) => {
            const isActive = t.id === active;
            return (
              <button
                key={t.id}
                onClick={() => onNavTab(t.id)}
                className="relative inline-flex items-center justify-center px-3 py-1.5 rounded-xl text-[12.5px] font-semibold transition-colors outline-none whitespace-nowrap cursor-pointer"
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

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {phase !== 'landing' && onBack && phase === 'configuring' && (
            <button onClick={onBack} className="btn btn-ghost !p-2.5" title="Back" aria-label="Back"><ArrowLeft size={16} /></button>
          )}
          {phase !== 'landing' && (
            <button onClick={onReset} className="btn btn-ghost !p-2.5" title="Reset / new run" aria-label="Reset"><RotateCw size={16} /></button>
          )}

          {/* Dark mode toggle */}
          <button
            onClick={onToggleDark}
            className="btn btn-ghost !p-2.5"
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Search */}
          <div ref={searchRef} className="relative">
            <button onClick={() => setShowSearch(v => !v)} className="btn btn-ghost !p-2.5 hidden sm:inline-flex" title="Search" aria-label="Search">
              <Search size={16} />
            </button>
            <AnimatePresence>
              {showSearch && (
                <motion.div initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-72 card p-3 shadow-xl z-50"
                >
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-ink-4)' }} />
                    <input autoFocus value={searchVal} onChange={e => setSearchVal(e.target.value)}
                      placeholder="Search tools, workspaces…"
                      className="field pl-9 py-2 text-sm"
                    />
                    {searchVal && <button onClick={() => setSearchVal('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-ink-4)' }}><X size={13} /></button>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Notifications */}
          <div ref={bellRef} className="relative">
            <button onClick={() => { setShowBell(v => !v); if (!showBell) markAllRead(); }} className="btn btn-ghost !p-2.5 relative" title="Notifications" aria-label="Notifications">
              <Bell size={16} />
              {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-[var(--color-surface)]" />}
            </button>
            <AnimatePresence>
              {showBell && (
                <motion.div initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-80 card shadow-xl z-50 overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-line)' }}>
                    <span className="text-sm font-bold" style={{ color: 'var(--color-ink)' }}>Notifications</span>
                    <button onClick={markAllRead} className="text-[11px] font-semibold text-blue-500 hover:text-blue-400">Mark all read</button>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-ink-4)' }}>No notifications yet</p>
                      <p className="text-[11px] mt-1" style={{ color: 'var(--color-ink-4)' }}>Run a maintenance cycle to generate reports</p>
                    </div>
                  ) : (
                    <div>
                      {notifications.map((n, idx) => (
                        <div key={n.id} className="flex gap-3 px-4 py-3 cursor-pointer transition-colors"
                          style={{ borderTop: idx > 0 ? `1px solid var(--color-line)` : undefined }}>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${n.color}`}><n.icon size={15} /></div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold leading-snug" style={{ color: 'var(--color-ink)' }}>{n.title}</p>
                            <p className="text-[11.5px] mt-0.5 leading-snug" style={{ color: 'var(--color-ink-3)' }}>{n.body}</p>
                            <p className="text-[10.5px] font-mono mt-1" style={{ color: 'var(--color-ink-4)' }}>{n.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Profile */}
          <div ref={profileRef} className="relative">
            <button onClick={() => setShowProfile(v => !v)}
              className="w-9 h-9 rounded-full shadow-md flex items-center justify-center text-white text-xs font-bold shrink-0 hover:scale-105 transition-transform"
              style={{
                background: isMac
                  ? 'linear-gradient(135deg, #06b6d4, #3b82f6)'
                  : 'linear-gradient(135deg, #2563eb, #4f46e5)',
              }}
              title={systemInfo.user || 'User Profile'}
            >
              {systemInfo.user ? systemInfo.user.slice(0, 2).toUpperCase() : 'US'}
            </button>
            <AnimatePresence>
              {showProfile && (
                <motion.div initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-56 card shadow-xl z-50 overflow-hidden"
                >
                  <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-line)' }}>
                    <p className="text-sm font-bold" style={{ color: 'var(--color-ink)' }}>{systemInfo.user}</p>
                    <p className="text-[11.5px] font-mono" style={{ color: 'var(--color-ink-3)' }}>{systemInfo.hostName}</p>
                  </div>
                  <div className="p-1.5 space-y-0.5">
                    <button onClick={() => { setShowProfile(false); onNavTab('diagnostics'); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left"
                      style={{ color: 'var(--color-ink-2)' }}>
                      <Activity size={14} style={{ color: 'var(--color-ink-4)' }} />
                      <span>Diagnostics Center</span>
                    </button>
                    <button onClick={() => { setShowProfile(false); onNavTab('maintenance'); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left"
                      style={{ color: 'var(--color-ink-2)' }}>
                      <Shield size={14} style={{ color: 'var(--color-ink-4)' }} />
                      <span>Maintenance Pipeline</span>
                    </button>
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
