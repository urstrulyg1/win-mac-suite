import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Search, Bell, RotateCw, ArrowLeft, X, Settings, LogOut, User, CheckCircle2, AlertTriangle, Info, Moon, Sun } from 'lucide-react';
import type { AppPhase, RunSummary, SystemInfo } from '../types';

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
  { id: 'overview',     label: 'Overview' },
  { id: 'updates',      label: 'Updates' },
  { id: 'security',     label: 'Security' },
  { id: 'maintenance',  label: 'Maintenance' },
  { id: 'reports',      label: 'Reports' },
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

export default function TopNav({ phase, activeTab, isRunning, dark, onToggleDark, onHome, onReset, onBack, onNavTab, summary, systemInfo }: Props) {
  const active = activeTab;

  // Build real notifications from live state
  const notifications = useMemo(() => {
    const items: { id: number; icon: typeof Info; color: string; title: string; body: string; time: string; unread: boolean }[] = [];

    // Driver issue from last run hardware phase
    if (summary?.followUps?.some(f => f.toLowerCase().includes('driver') || f.toLowerCase().includes('acpi'))) {
      const driverFollowUp = summary.followUps.find(f => f.toLowerCase().includes('driver') || f.toLowerCase().includes('acpi')) ?? '';
      items.push({
        id: 1,
        icon: AlertTriangle,
        color: 'text-amber-500 bg-amber-500/10',
        title: 'Driver issue detected',
        body: driverFollowUp,
        time: summary.startedAt ? relTime(summary.startedAt) : 'Last run',
        unread: true,
      });
    }

    // Last run completed
    if (summary && !summary.cancelled) {
      const spaceGB = summary.spaceReclaimed >= 1024
        ? `${(summary.spaceReclaimed / 1024).toFixed(1)} GB`
        : summary.spaceReclaimed > 0 ? `${summary.spaceReclaimed} MB` : null;
      items.push({
        id: 2,
        icon: CheckCircle2,
        color: 'text-emerald-500 bg-emerald-500/10',
        title: 'Last run completed',
        body: `${summary.mode} profile — ${summary.totalUpdated} packages updated${spaceGB ? `, ${spaceGB} reclaimed` : ''}. Health: ${summary.healthScore}%.`,
        time: summary.startedAt ? relTime(summary.startedAt) : '',
        unread: true,
      });
    }

    // Cancelled run
    if (summary?.cancelled) {
      items.push({
        id: 3,
        icon: AlertTriangle,
        color: 'text-amber-500 bg-amber-500/10',
        title: 'Run cancelled',
        body: `${summary.mode} profile was cancelled — ${summary.passedSections}/${summary.totalSections} phases completed.`,
        time: summary.startedAt ? relTime(summary.startedAt) : '',
        unread: true,
      });
    }

    // System online/offline notice
    if (!systemInfo.isOnline) {
      items.push({
        id: 4,
        icon: AlertTriangle,
        color: 'text-red-500 bg-red-500/10',
        title: 'Network offline',
        body: 'System appears to be offline. Network-dependent update phases will fail.',
        time: 'Now',
        unread: true,
      });
    }

    // Additional follow-ups
    if (summary?.followUps?.length) {
      for (const f of summary.followUps) {
        if (items.some(i => i.body === f)) continue;
        items.push({
          id: 100 + items.length,
          icon: Info,
          color: 'text-blue-500 bg-blue-500/10',
          title: 'Follow-up action',
          body: f,
          time: summary.startedAt ? relTime(summary.startedAt) : '',
          unread: false,
        });
      }
    }

    return items;
  }, [summary, systemInfo]);

  const [showSearch,  setShowSearch]  = useState(false);
  const [showBell,    setShowBell]    = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchVal,   setSearchVal]   = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  // Sync unread count whenever notifications change
  useEffect(() => {
    setUnreadCount(notifications.filter(n => n.unread).length);
  }, [notifications]);

  const bellRef    = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef  = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
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

  return (
    <header className="sticky top-0 z-40 px-4 sm:px-6 pt-3 sm:pt-4">
      <div className="max-w-[1600px] mx-auto card px-4 sm:px-6 h-16 flex items-center justify-between gap-3 rounded-2xl">

        {/* Brand */}
        <button onClick={onHome} className="flex items-center gap-2.5 shrink-0 group outline-none" aria-label="Go to overview">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/30 border border-white/40 group-hover:scale-105 transition-transform shrink-0">
            <Shield size={18} className="text-white" />
          </div>
          <span className="text-xl font-extrabold tracking-tight hidden sm:block leading-none" style={{ color: 'var(--color-ink)' }}>
            Win<span className="text-blue-500">Suite</span>
          </span>
        </button>

        {/* Nav pills */}
        <nav className="hidden md:flex items-center gap-0.5 p-1 rounded-2xl border"
          style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
          {navTabs.map((t) => {
            const isActive = t.id === active;
            return (
              <button
                key={t.id}
                onClick={() => onNavTab(t.id)}
                className="relative inline-flex items-center justify-center px-3.5 py-1.5 rounded-xl text-[13px] font-semibold transition-colors outline-none whitespace-nowrap"
                style={{ color: isActive ? '#fff' : 'var(--color-ink-2)' }}
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-xl shadow-lg"
                    style={{ backgroundColor: '#3b82f6' }}
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative z-10">{t.label}</span>
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
                      placeholder="Search phases, reports…"
                      className="field pl-9 py-2 text-sm"
                    />
                    {searchVal && <button onClick={() => setSearchVal('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-ink-4)' }}><X size={13} /></button>}
                  </div>
                  {searchVal.trim() && (
                    <div className="mt-2 space-y-1">
                      {['Launch Maintenance', 'Run System Scan', 'View Reports', 'Configure Profile'].filter(s => s.toLowerCase().includes(searchVal.toLowerCase())).length === 0
                        ? <p className="text-xs px-2 py-1.5" style={{ color: 'var(--color-ink-4)' }}>No results for "{searchVal}"</p>
                        : ['Launch Maintenance', 'Run System Scan', 'View Reports', 'Configure Profile']
                            .filter(s => s.toLowerCase().includes(searchVal.toLowerCase()))
                            .map(s => (
                              <button key={s} onClick={() => { onNavTab('maintenance'); setShowSearch(false); setSearchVal(''); }}
                                className="w-full text-left text-sm px-3 py-2 rounded-xl font-medium transition-colors"
                                style={{ color: 'var(--color-ink-2)' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-2)')}
                                onMouseLeave={e => (e.currentTarget.style.background = '')}
                              >
                                {s}
                              </button>
                            ))
                      }
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Notifications bell */}
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
                      <p className="text-[11px] mt-1" style={{ color: 'var(--color-ink-4)' }}>Run a maintenance cycle to generate alerts</p>
                    </div>
                  ) : (
                    <div>
                      {notifications.map((n, idx) => (
                        <div key={n.id}
                          className="flex gap-3 px-4 py-3 cursor-pointer transition-colors"
                          style={{
                            borderTop: idx > 0 ? `1px solid var(--color-line)` : undefined,
                            backgroundColor: n.unread ? 'var(--color-surface-hover)' : undefined,
                          }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-surface-2)')}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = n.unread ? 'var(--color-surface-hover)' : '')}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${n.color}`}><n.icon size={15} /></div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold leading-snug" style={{ color: 'var(--color-ink)' }}>{n.title}</p>
                            <p className="text-[11.5px] mt-0.5 leading-snug" style={{ color: 'var(--color-ink-3)' }}>{n.body}</p>
                            <p className="text-[10.5px] font-mono mt-1" style={{ color: 'var(--color-ink-4)' }}>{n.time}</p>
                          </div>
                          {n.unread && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1" />}
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Profile avatar */}
          <div ref={profileRef} className="relative">
            <button onClick={() => setShowProfile(v => !v)}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 ring-2 ring-[var(--color-surface)] shadow-md flex items-center justify-center text-white text-xs font-bold shrink-0 hover:scale-105 transition-transform"
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
                    {[
                      {
                        icon: User,
                        label: 'Profile',
                        sub: `${systemInfo.os} · ${systemInfo.build}`,
                        action: () => { setShowProfile(false); onNavTab('reports'); },
                      },
                      {
                        icon: Settings,
                        label: 'Settings',
                        sub: 'Configure run profile',
                        action: () => { setShowProfile(false); onNavTab('maintenance'); },
                      },
                      {
                        icon: LogOut,
                        label: 'Sign out',
                        sub: 'Close this session',
                        action: () => {
                          setShowProfile(false);
                          if (window.confirm('Close WinSuite and sign out of this browser session?')) {
                            window.close();
                          }
                        },
                      },
                    ].map(item => (
                      <button key={item.label} onClick={item.action}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors text-left"
                        style={{ color: 'var(--color-ink-2)' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-surface-2)')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                      >
                        <item.icon size={15} style={{ color: 'var(--color-ink-4)' }} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-tight">{item.label}</p>
                          <p className="text-[10.5px] truncate" style={{ color: 'var(--color-ink-4)' }}>{item.sub}</p>
                        </div>
                      </button>
                    ))}
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
