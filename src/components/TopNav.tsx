import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Search, Bell, RotateCw, ArrowLeft, X,
  User, CheckCircle2, AlertTriangle, Info, Moon, Sun, Monitor,
  Activity, Sparkles, HardDrive, FileText, Layers, Lock, HelpCircle,
  Cpu, Wifi, MessageSquareCode, Code, Clock, Flame, Laptop, Wrench
} from 'lucide-react';
import type { AppPhase, RunSummary, SystemInfo } from '../types';
import { usePlatform } from '../platform';

interface Props {
  phase: AppPhase;
  activeTab: string;
  isRunning: boolean;
  dark: boolean;
  diagnosticOnly?: boolean;
  onToggleDiagnosticOnly?: () => void;
  onToggleDark: () => void;
  onHome: () => void;
  onReset: () => void;
  onBack?: () => void;
  onNavTab: (tab: string) => void;
  summary: RunSummary | null;
  systemInfo: SystemInfo;
}

// Group 1: Core System & Maintenance
const primaryNavRow = [
  { id: 'overview',     label: 'Overview',       icon: Monitor },
  { id: 'ask',          label: 'Ask Suite',      icon: MessageSquareCode },
  { id: 'storage',      label: 'Clean',          icon: HardDrive },
  { id: 'diagnostics',  label: 'Health',         icon: Activity },
  { id: 'performance',  label: 'Fix (Slow)',     icon: Cpu },
  { id: 'security',     label: 'Protect',        icon: Lock },
  { id: 'reports',      label: 'Reports & Undo', icon: FileText },
];

// Group 2: Deep Diagnostics & Specialist Doctors
const secondaryNavRow = [
  { id: 'timeline',     label: 'Incidents & Timeline', icon: Clock },
  { id: 'crashes',      label: 'Crashes & Stability',  icon: Flame },
  { id: 'hardware',     label: 'Hardware & Displays',  icon: Monitor },
  { id: 'apple',        label: 'macOS & Sync',         icon: Laptop },
  { id: 'network',      label: 'Network Doctor',       icon: Wifi },
  { id: 'developer',    label: 'Developer Doctor',     icon: Code },
  { id: 'startup',      label: 'Startup Manager',      icon: Sparkles },
];

export default function TopNav({
  phase, activeTab, isRunning, dark, diagnosticOnly = true, onToggleDiagnosticOnly,
  onToggleDark, onHome, onReset, onBack, onNavTab, summary, systemInfo,
}: Props) {
  const { config, isMac } = usePlatform();
  const active = activeTab;

  const brandName = config.productName;
  const brandPrefix = brandName.slice(0, 3);
  const brandSuffix = brandName.slice(3);

  return (
    <header className="sticky top-0 z-40 px-3 sm:px-6 pt-2 sm:pt-3">
      <div className="max-w-[1600px] mx-auto card px-4 sm:px-5 py-2.5 rounded-2xl flex flex-col gap-2.5 shadow-xl border border-slate-700/50">

        {/* Top Row: Brand & Status Controls */}
        <div className="flex items-center justify-between gap-4 w-full">
          {/* Brand */}
          <button
            onClick={onHome}
            className="flex items-center gap-2.5 shrink-0 group outline-none cursor-pointer text-left"
            aria-label="Go to overview"
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shadow-md border border-white/30 group-hover:scale-105 transition-transform shrink-0"
              style={{
                background: isMac
                  ? 'linear-gradient(135deg, #06b6d4, #3b82f6)'
                  : 'linear-gradient(135deg, #2563eb, #6366f1)',
              }}
            >
              <Shield size={16} className="text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-base sm:text-lg font-extrabold tracking-tight leading-none" style={{ color: 'var(--color-ink)' }}>
                {brandPrefix}<span style={{ color: config.accentColor }}>{brandSuffix}</span>
              </span>
              <span className="text-[9px] font-mono tracking-wider opacity-60 mt-0.5" style={{ color: 'var(--color-ink-3)' }}>
                v8.0 Trustworthy Intelligence
              </span>
            </div>
          </button>

          {/* Controls Right */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Safe Diagnostic Mode Toggle */}
            {onToggleDiagnosticOnly && (
              <button
                onClick={onToggleDiagnosticOnly}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer shadow-sm ${
                  diagnosticOnly
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/15'
                    : 'bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/15'
                }`}
                title={diagnosticOnly ? 'Read-only diagnostic mode guaranteed (No write actions)' : 'Repair mode active (Guided remediations enabled)'}
              >
                {diagnosticOnly ? <Shield size={12} /> : <Wrench size={12} />}
                <span>{diagnosticOnly ? 'Safe Diagnostic Mode' : 'Repair Mode'}</span>
              </button>
            )}

            {/* Theme Toggle */}
            <button
              onClick={onToggleDark}
              className="w-8 h-8 rounded-xl border flex items-center justify-center transition-colors cursor-pointer"
              style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)', color: 'var(--color-ink-3)' }}
              title="Toggle Dark/Light theme"
            >
              {dark ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </div>
        </div>

        {/* Bottom Rows: Two Neatly Stacked Navigation Rows (No Scrollbar!) */}
        <div className="flex flex-col gap-1.5 w-full pt-1 border-t" style={{ borderColor: 'var(--color-line)' }}>
          {/* Row 1: Core System Workspaces */}
          <div className="flex flex-wrap items-center justify-between gap-1 w-full">
            {primaryNavRow.map((t) => {
              const isActive = t.id === active;
              return (
                <button
                  key={t.id}
                  onClick={() => onNavTab(t.id)}
                  disabled={isRunning}
                  className="flex-1 min-w-[100px] flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-center"
                  style={
                    isActive
                      ? {
                          backgroundColor: config.accentColor || '#3b82f6',
                          color: '#ffffff',
                          boxShadow: '0 2px 8px rgba(59,130,246,0.3)',
                        }
                      : {
                          backgroundColor: 'var(--color-surface-2)',
                          color: 'var(--color-ink-2)',
                          border: '1px solid var(--color-line)',
                        }
                  }
                >
                  <t.icon size={13} className="shrink-0" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Row 2: Deep Diagnostics & Specialist Doctors */}
          <div className="flex flex-wrap items-center justify-between gap-1 w-full">
            {secondaryNavRow.map((t) => {
              const isActive = t.id === active;
              return (
                <button
                  key={t.id}
                  onClick={() => onNavTab(t.id)}
                  disabled={isRunning}
                  className="flex-1 min-w-[100px] flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-center"
                  style={
                    isActive
                      ? {
                          backgroundColor: config.accentColor || '#3b82f6',
                          color: '#ffffff',
                          boxShadow: '0 2px 8px rgba(59,130,246,0.3)',
                        }
                      : {
                          backgroundColor: 'var(--color-surface-2)',
                          color: 'var(--color-ink-3)',
                          border: '1px solid var(--color-line)',
                        }
                  }
                >
                  <t.icon size={13} className="shrink-0" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </header>
  );
}
