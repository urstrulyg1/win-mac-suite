import { motion } from 'framer-motion';
import { Shield, Search, Bell, RotateCw, ArrowLeft } from 'lucide-react';
import type { AppPhase } from '../types';

interface Props {
  phase: AppPhase;
  isRunning: boolean;
  onHome: () => void;
  onReset: () => void;
  onBack?: () => void;
}

const navTabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'updates', label: 'Updates' },
  { id: 'security', label: 'Security' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'reports', label: 'Reports' },
];

export default function TopNav({ phase, isRunning, onHome, onReset, onBack }: Props) {
  const active =
    phase === 'landing'
      ? 'overview'
      : phase === 'configuring'
      ? 'overview'
      : isRunning
      ? 'maintenance'
      : 'reports';

  return (
    <header className="sticky top-0 z-40 px-3 sm:px-6 pt-3 sm:pt-4">
      <div className="max-w-[1400px] mx-auto card px-3 sm:px-5 h-16 flex items-center justify-between gap-4 rounded-2xl">
        {/* Brand */}
        <button
          onClick={onHome}
          className="flex items-center gap-2.5 shrink-0 group outline-none"
          aria-label="Go to overview"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/30 border border-white/40 group-hover:scale-105 transition-transform">
            <Shield size={18} className="text-white" />
          </div>
          <span className="text-xl font-extrabold tracking-tight text-slate-900 hidden sm:block">
            Win<span className="text-blue-600">Suite</span>
          </span>
        </button>

        {/* Nav pills */}
        <nav className="hidden md:flex items-center gap-1 p-1 rounded-2xl bg-slate-100/80 border border-slate-200/70">
          {navTabs.map((t) => {
            const isActive = t.id === active;
            return (
              <button
                key={t.id}
                onClick={t.id === 'overview' ? onHome : undefined}
                className={`relative px-3.5 py-2 rounded-xl text-[13px] font-semibold transition-colors outline-none ${
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
        <div className="flex items-center gap-2 shrink-0">
          {phase !== 'landing' && onBack && phase === 'configuring' && (
            <button onClick={onBack} className="btn btn-ghost !p-2.5" title="Back" aria-label="Back">
              <ArrowLeft size={16} />
            </button>
          )}
          {phase !== 'landing' && (
            <button onClick={onReset} className="btn btn-ghost !p-2.5" title="Reset / new run" aria-label="Reset">
              <RotateCw size={16} />
            </button>
          )}
          <button className="btn btn-ghost !p-2.5 hidden sm:inline-flex" title="Search" aria-label="Search">
            <Search size={16} />
          </button>
          <button className="btn btn-ghost !p-2.5 relative" title="Notifications" aria-label="Notifications">
            <Bell size={16} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
          </button>
          <div
            className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 ring-2 ring-white shadow-md flex items-center justify-center text-white text-xs font-bold"
            title="Administrator"
          >
            AD
          </div>
        </div>
      </div>
    </header>
  );
}
