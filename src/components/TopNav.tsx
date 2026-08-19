import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Search, Bell, RotateCw, ArrowLeft, X, Settings, LogOut, User, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import type { AppPhase } from '../types';

interface Props {
  phase: AppPhase;
  activeTab: string;
  isRunning: boolean;
  onHome: () => void;
  onReset: () => void;
  onBack?: () => void;
  onNavTab: (tab: string) => void;
}

const navTabs = [
  { id: 'overview',     label: 'Overview' },
  { id: 'updates',      label: 'Updates' },
  { id: 'security',     label: 'Security' },
  { id: 'maintenance',  label: 'Maintenance' },
  { id: 'reports',      label: 'Reports' },
];

const notifications = [
  { id: 1, icon: AlertTriangle, color: 'text-amber-600 bg-amber-50', title: 'Driver issue detected', body: 'Intel DTT driver (ACPI\\INTC1041\\1) requires manual update.', time: '2m ago', unread: true },
  { id: 2, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50', title: 'Last run completed', body: 'Safe profile finished — 15 packages updated, 3.1 GB reclaimed.', time: '2 days ago', unread: true },
  { id: 3, icon: Info, color: 'text-blue-600 bg-blue-50', title: 'Defender signatures updated', body: 'Definitions refreshed to version 1.421.45.0.', time: '3 days ago', unread: false },
];

export default function TopNav({ phase, activeTab, isRunning, onHome, onReset, onBack, onNavTab }: Props) {
  const active = activeTab;

  const [showSearch,  setShowSearch]  = useState(false);
  const [showBell,    setShowBell]    = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchVal,   setSearchVal]   = useState('');
  const [unreadCount, setUnreadCount] = useState(notifications.filter(n => n.unread).length);

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
          <span className="text-xl font-extrabold tracking-tight text-slate-900 hidden sm:block leading-none">
            Win<span className="text-blue-600">Suite</span>
          </span>
        </button>

        {/* Nav pills */}
        <nav className="hidden md:flex items-center gap-0.5 p-1 rounded-2xl bg-slate-100/80 border border-slate-200/70">
          {navTabs.map((t) => {
            const isActive = t.id === active;
            return (
              <button
                key={t.id}
                onClick={() => onNavTab(t.id)}
                className={`relative inline-flex items-center justify-center px-3.5 py-1.5 rounded-xl text-[13px] font-semibold transition-colors outline-none whitespace-nowrap ${
                  isActive ? 'text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-xl bg-slate-900 shadow-lg shadow-slate-900/25"
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
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input autoFocus value={searchVal} onChange={e => setSearchVal(e.target.value)}
                      placeholder="Search phases, reports…"
                      className="field pl-9 py-2 text-sm"
                    />
                    {searchVal && <button onClick={() => setSearchVal('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={13} /></button>}
                  </div>
                  {searchVal.trim() && (
                    <div className="mt-2 space-y-1">
                      {['Launch Maintenance', 'Run System Scan', 'View Reports', 'Configure Profile'].filter(s => s.toLowerCase().includes(searchVal.toLowerCase())).length === 0
                        ? <p className="text-xs text-slate-400 px-2 py-1.5">No results for "{searchVal}"</p>
                        : ['Launch Maintenance', 'Run System Scan', 'View Reports', 'Configure Profile']
                            .filter(s => s.toLowerCase().includes(searchVal.toLowerCase()))
                            .map(s => (
                              <button key={s} onClick={() => { onNavTab('maintenance'); setShowSearch(false); setSearchVal(''); }}
                                className="w-full text-left text-sm px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-700 font-medium transition-colors">
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
              {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />}
            </button>
            <AnimatePresence>
              {showBell && (
                <motion.div initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-80 card shadow-xl z-50 overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <span className="text-sm font-bold text-slate-900">Notifications</span>
                    <button onClick={markAllRead} className="text-[11px] font-semibold text-blue-600 hover:text-blue-700">Mark all read</button>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {notifications.map(n => (
                      <div key={n.id} className={`flex gap-3 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer ${n.unread ? 'bg-blue-50/40' : ''}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${n.color}`}><n.icon size={15} /></div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-slate-900 leading-snug">{n.title}</p>
                          <p className="text-[11.5px] text-slate-500 mt-0.5 leading-snug">{n.body}</p>
                          <p className="text-[10.5px] text-slate-400 font-mono mt-1">{n.time}</p>
                        </div>
                        {n.unread && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1" />}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Profile avatar */}
          <div ref={profileRef} className="relative">
            <button onClick={() => setShowProfile(v => !v)}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 ring-2 ring-white shadow-md flex items-center justify-center text-white text-xs font-bold shrink-0 hover:scale-105 transition-transform"
              title="Administrator"
            >AD</button>
            <AnimatePresence>
              {showProfile && (
                <motion.div initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-56 card shadow-xl z-50 overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-bold text-slate-900">Administrator</p>
                    <p className="text-[11.5px] text-slate-500 font-mono">WORKSTATION-01</p>
                  </div>
                  <div className="p-1.5 space-y-0.5">
                    {[
                      { icon: User,     label: 'Profile',   action: () => setShowProfile(false) },
                      { icon: Settings, label: 'Settings',  action: () => setShowProfile(false) },
                      { icon: LogOut,   label: 'Sign out',  action: () => setShowProfile(false) },
                    ].map(item => (
                      <button key={item.label} onClick={item.action}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors text-left">
                        <item.icon size={15} className="text-slate-400" />
                        {item.label}
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
