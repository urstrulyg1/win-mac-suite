import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Search, Bell, RotateCw, ArrowLeft, X,
  User, CheckCircle2, AlertTriangle, Info, Moon, Sun, Monitor,
  Activity, Sparkles, HardDrive, FileText, Layers, Lock, HelpCircle,
  Cpu, Wifi, MessageSquareCode, Code, Clock, Flame, Laptop, HardDriveDownload
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
  { id: 'ask',          label: 'Ask Suite',    icon: MessageSquareCode },
  { id: 'storage',      label: 'Clean',        icon: HardDrive },
  { id: 'diagnostics',  label: 'Health',       icon: Activity },
  { id: 'timeline',     label: 'Timeline',     icon: Clock },
  { id: 'crashes',      label: 'Crashes',      icon: Flame },
  { id: 'performance',  label: 'Fix (Slow)',   icon: Cpu },
  { id: 'hardware',     label: 'Hardware',     icon: Monitor },
  { id: 'apple',        label: 'macOS & Sync', icon: Laptop },
  { id: 'network',      label: 'Network',      icon: Wifi },
  { id: 'security',     label: 'Protect',      icon: Lock },
  { id: 'developer',    label: 'Developer',    icon: Code },
  { id: 'startup',      label: 'Startup',      icon: Sparkles },
  { id: 'reports',      label: 'Reports & Undo', icon: FileText },
];

export default function TopNav({
  phase, activeTab, isRunning, dark, onToggleDark, onHome, onReset, onBack, onNavTab, summary, systemInfo,
}: Props) {
  const { config, isMac } = usePlatform();
  const active = activeTab;

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
              {config.osFamily} Complete Intelligence
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
                  disabled={isRunning}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={
                    isActive
                      ? {
                          backgroundColor: config.accentColor || '#3b82f6',
                          color: '#ffffff',
                          boxShadow: '0 2px 8px rgba(59,130,246,0.3)',
                        }
                      : { color: 'var(--color-ink-3)' }
                  }
                >
                  <t.icon size={13} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Controls Right */}
        <div className="flex items-center gap-1.5 sm:gap-2 justify-self-end shrink-0">
          <button
            onClick={onToggleDark}
            className="w-9 h-9 rounded-xl border flex items-center justify-center transition-colors cursor-pointer"
            style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)', color: 'var(--color-ink-3)' }}
          >
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </div>
    </header>
  );
}
