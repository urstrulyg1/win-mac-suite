import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { dropdownMotion } from '../motion';
import {
  Shield, Moon, Sun, Monitor, ChevronDown, Radio,
  Activity, Sparkles, HardDrive, FileText, Lock,
  Cpu, Wifi, MessageSquareCode, Code, Clock, Flame, Laptop, Wrench,
  Brain, Siren, FlaskConical, Settings
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

export default function TopNav({
  phase: _phase, activeTab, isRunning, dark, diagnosticOnly = true, onToggleDiagnosticOnly,
  onToggleDark, onHome, onReset: _onReset, onBack: _onBack, onNavTab, summary: _summary, systemInfo: _systemInfo,
}: Props) {
  const { config, isMac } = usePlatform();
  const active = activeTab;
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const brandName = config.productName;
  const brandPrefix = brandName.slice(0, 3);
  const brandSuffix = brandName.slice(3);

  // Primary Hubs (platform-adaptive)
  const primaryNavTabs = [
    { id: 'overview',     label: 'Overview',       icon: Monitor,           color: '#60a5fa' }, // blue
    { id: 'storage',      label: 'Clean',          icon: HardDrive,         color: '#f97316' }, // orange
    { id: 'performance',  label: 'Performance',    icon: Cpu,               color: '#a78bfa' }, // violet
    { id: 'diagnostics',  label: 'Health',         icon: Activity,          color: '#34d399' }, // emerald
    { id: 'security',     label: 'Security',       icon: Lock,              color: '#f43f5e' }, // rose
    { id: 'developer',    label: 'Developer',      icon: Code,              color: '#facc15' }, // yellow
    { id: 'network',      label: 'Network',        icon: Wifi,              color: '#22d3ee' }, // cyan
    ...(isMac
      ? [{ id: 'apple',   label: 'macOS & Sync',   icon: Laptop,            color: '#e879f9' }]
      : [{ id: 'windows', label: 'Windows Center', icon: Settings,          color: '#60a5fa' }]),
    { id: 'ask',          label: 'Ask Suite',      icon: MessageSquareCode, color: '#fb923c' }, // amber-orange
    { id: 'reports',      label: 'Reports',        icon: FileText,          color: '#4ade80' }, // green
  ];

  // Specialist Diagnostics Tools in Dropdown
  const specialistNavTabs = [
    { id: 'graph',        label: 'Graph Topology',       icon: Radio,        color: '#22d3ee', desc: 'Interactive visual subsystem topology graph' },
    { id: 'whynot',       label: 'Why NOT? (Causes)',    icon: Brain,        color: '#a78bfa', desc: 'Diagnostic hypothesis disqualification engine' },
    { id: 'incidents',    label: 'Incident Center',      icon: Siren,        color: '#f43f5e', desc: 'Correlated system issues & anomalies' },
    { id: 'experiments',  label: 'Experiments',          icon: FlaskConical, color: '#34d399', desc: 'Safe hypothesis verification & probes' },
    { id: 'timeline',     label: 'System Timeline',      icon: Clock,        color: '#60a5fa', desc: 'Kernel events, reboots & log history' },
    { id: 'crashes',      label: 'Crashes & Stability',  icon: Flame,        color: '#f97316', desc: 'Crash log parser & panic diagnostics' },
    { id: 'hardware',     label: 'Hardware & Displays',  icon: Monitor,      color: '#facc15', desc: 'Peripherals, display config & audio' },
    { id: 'startup',      label: 'Startup Manager',      icon: Sparkles,     color: '#e879f9', desc: isMac ? 'LaunchAgents & Login item control' : 'Startup applications & background services' },
  ];

  const activeSpecialist = specialistNavTabs.find((t) => t.id === active);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 px-3 sm:px-6 pt-2.5 sm:pt-3.5">
      <div className="max-w-[1600px] mx-auto card top-bar-card px-4 sm:px-6 py-3 sm:py-3.5 rounded-2xl flex flex-col gap-3 shadow-xl border border-slate-700/50">

        {/* Top Brand & Status Controls Bar */}
        <div className="flex items-center justify-between gap-4 w-full">
          {/* Brand */}
          <button
            onClick={onHome}
            className="flex items-center gap-3 shrink-0 group outline-none cursor-pointer text-left nav-tab-btn p-1 rounded-xl"
            style={{
              ['--tab-glow-hover' as any]: 'rgba(59, 130, 246, 0.30)',
              ['--tab-border-hover' as any]: 'rgba(96, 165, 250, 0.50)',
            }}
            aria-label="Go to overview"
          >
            <img
              src="/logo.png"
              alt="Win/Mac Suite Logo"
              className="w-9 h-9 object-contain drop-shadow-md group-hover:scale-105 group-hover:drop-shadow-[0_0_12px_rgba(59,130,246,0.5)] transition-all shrink-0"
            />
            <div className="flex flex-col">
              <span className="text-lg sm:text-xl font-extrabold tracking-tight leading-none" style={{ color: 'var(--color-ink)' }}>
                {brandPrefix}<span style={{ color: config.accentColor }}>{brandSuffix}</span>
              </span>
              <span className="text-[10px] font-mono tracking-wider opacity-60 mt-0.5" style={{ color: 'var(--color-ink-3)' }}>
                v11.0 System Intelligence
              </span>
            </div>
          </button>

          {/* Controls Right */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Safe Diagnostic Mode vs Repair Mode Toggle */}
            {onToggleDiagnosticOnly && (
              <button
                onClick={onToggleDiagnosticOnly}
                className={`nav-tab-btn flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-sm ${
                  diagnosticOnly
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/15'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/15'
                }`}
                style={{
                  ['--tab-glow-hover' as any]: diagnosticOnly ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.35)',
                  ['--tab-border-hover' as any]: diagnosticOnly ? 'rgba(52, 211, 153, 0.60)' : 'rgba(251, 191, 36, 0.60)',
                }}
                title={
                  diagnosticOnly
                    ? 'Dry Run (Audit Only): 100% read-only inspection. No files or settings will be modified.'
                    : 'Active Repairs (Enabled): Live updates, cache thinning, and maintenance actions are executed.'
                }
              >
                {diagnosticOnly ? <Shield size={14} className="text-emerald-400" /> : <Wrench size={14} className="text-amber-400" />}
                <span>{diagnosticOnly ? 'Dry Run (Audit Only)' : 'Active Repairs (Enabled)'}</span>
              </button>
            )}

            {/* Theme Toggle */}
            <button
              onClick={onToggleDark}
              className="nav-tab-btn w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer"
              style={{
                backgroundColor: 'var(--color-surface-2)',
                borderColor: 'var(--color-line)',
                color: 'var(--color-ink-3)',
                ['--tab-glow-hover' as any]: 'rgba(250, 204, 21, 0.30)',
                ['--tab-border-hover' as any]: 'rgba(250, 204, 21, 0.50)',
              }}
              title="Toggle Dark/Light theme"
            >
              {dark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </div>

        {/* Navigation Bar */}
        <div className="pt-2.5 border-t" style={{ borderColor: 'var(--color-line)' }}>
          <div className="flex items-center gap-2">
            {primaryNavTabs.map((t) => {
              const isActive = t.id === active;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setDropdownOpen(false);
                    onNavTab(t.id);
                  }}
                  disabled={isRunning}
                  className="nav-tab-btn flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={
                    isActive
                      ? {
                          backgroundColor: config.accentColor || '#3b82f6',
                          color: '#ffffff',
                          boxShadow: '0 4px 16px rgba(59,130,246,0.45), 0 0 12px rgba(59,130,246,0.3)',
                          ['--tab-glow-hover' as any]: 'rgba(59, 130, 246, 0.50)',
                          ['--tab-border-hover' as any]: '#60a5fa',
                        }
                      : {
                          backgroundColor: 'var(--color-surface-2)',
                          color: 'var(--color-ink-2)',
                          border: '1px solid var(--color-line)',
                          ['--tab-glow-hover' as any]: `${t.color}40`,
                          ['--tab-border-hover' as any]: `${t.color}80`,
                        }
                  }
                >
                  <t.icon size={15} className="shrink-0 transition-transform group-hover:scale-110" style={{ color: isActive ? '#ffffff' : t.color }} />
                  <span>{t.label}</span>
                </button>
              );
            })}

            {/* Specialist / More Tools Dropdown */}
            <div className="relative shrink-0" ref={dropdownRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDropdownOpen((prev) => !prev);
                }}
                disabled={isRunning}
                className="nav-tab-btn flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all whitespace-nowrap cursor-pointer border shadow-md"
                style={
                  activeSpecialist
                    ? {
                        backgroundColor: config.accentColor || '#3b82f6',
                        color: '#ffffff',
                        borderColor: config.accentColor || '#3b82f6',
                        boxShadow: '0 4px 16px rgba(59,130,246,0.45), 0 0 12px rgba(59,130,246,0.3)',
                        ['--tab-glow-hover' as any]: 'rgba(59, 130, 246, 0.50)',
                        ['--tab-border-hover' as any]: '#60a5fa',
                      }
                    : {
                        backgroundColor: 'var(--color-surface-2)',
                        color: 'var(--color-ink)',
                        borderColor: 'var(--color-line)',
                        ['--tab-glow-hover' as any]: 'rgba(168, 85, 247, 0.35)',
                        ['--tab-border-hover' as any]: 'rgba(168, 85, 247, 0.60)',
                      }
                }
              >
                {activeSpecialist ? (
                  <>
                    <activeSpecialist.icon size={15} className="shrink-0" />
                    <span className="max-w-[110px] truncate">{activeSpecialist.label}</span>
                  </>
                ) : (
                  <span>More Tools</span>
                )}
                <ChevronDown size={14} className={`transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  {...dropdownMotion}
                  style={{ originX: 1, originY: 0 }}
                  className="absolute right-0 mt-2 w-80 p-2 rounded-2xl shadow-2xl border border-slate-700 bg-slate-900 text-slate-100 z-[9999] divide-y divide-slate-800"
                >
                  <div className="px-3 py-2 text-[11px] uppercase font-bold tracking-wider text-slate-400">
                    Specialist Diagnostics &amp; Doctors
                  </div>
                  <div className="pt-1.5 space-y-1">
                    {specialistNavTabs.map((s) => {
                      const isSelected = s.id === active;
                      return (
                        <button
                          key={s.id}
                          onClick={() => {
                            onNavTab(s.id);
                            setDropdownOpen(false);
                          }}
                          className={`w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600/30 text-blue-400 font-bold border border-blue-500/30'
                              : 'hover:bg-slate-800 text-slate-200 hover:text-white'
                          }`}
                        >
                          <s.icon size={16} className="mt-0.5 shrink-0" style={{ color: isSelected ? '#ffffff' : s.color }} />
                          <div className="min-w-0">
                            <div className="text-xs font-bold leading-tight truncate">{s.label}</div>
                            <div className="text-[11px] text-slate-400 truncate mt-0.5">{s.desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        </div>

      </div>
    </header>
  );
}
