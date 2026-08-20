import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ShieldAlert, X, ArrowRight, Lock, KeyRound, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import type { RiskLevel } from '../platform/types';
import { modalBackdrop, modalPanel } from '../motion';

interface Props {
  open: boolean;
  title: string;
  description: string;
  riskLevel: RiskLevel;
  requiresSudo?: boolean;
  command?: string;
  error?: string | null;
  loading?: boolean;
  onConfirm: (password?: string) => void;
  onCancel: () => void;
}

export default function ConfirmationModal({
  open,
  title,
  description,
  riskLevel,
  requiresSudo = false,
  command,
  error = null,
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const isAdvanced = riskLevel === 'advanced' || requiresSudo;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setPassword('');
      setShowPassword(false);
      if (requiresSudo) {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }
  }, [open, requiresSudo]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (requiresSudo && !password.trim()) return;
    onConfirm(password);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            {...modalBackdrop}
            onClick={onCancel}
            className="absolute inset-0 bg-black/65 backdrop-blur-md"
          />

          <motion.div
            {...modalPanel}
            className="relative w-full max-w-md card p-6 shadow-2xl border z-10 space-y-4"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: error ? '#f43f5e' : 'var(--color-line)',
              boxShadow: error ? '0 0 25px rgba(244, 63, 94, 0.25)' : undefined,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                  style={
                    requiresSudo
                      ? { backgroundColor: 'rgba(244,63,94,0.12)', color: '#f43f5e', borderColor: 'rgba(244,63,94,0.25)' }
                      : isAdvanced
                      ? { backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444', borderColor: 'rgba(239,68,68,0.25)' }
                      : { backgroundColor: 'rgba(245,158,11,0.12)', color: '#f59e0b', borderColor: 'rgba(245,158,11,0.25)' }
                  }
                >
                  {requiresSudo ? <Lock size={20} className="animate-pulse" /> : isAdvanced ? <ShieldAlert size={20} /> : <AlertTriangle size={20} />}
                </div>
                <div>
                  <span
                    className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border mb-1"
                    style={
                      requiresSudo
                        ? { backgroundColor: 'rgba(244,63,94,0.12)', color: '#f43f5e', borderColor: 'rgba(244,63,94,0.25)' }
                        : isAdvanced
                        ? { backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444', borderColor: 'rgba(239,68,68,0.25)' }
                        : { backgroundColor: 'rgba(245,158,11,0.12)', color: '#f59e0b', borderColor: 'rgba(245,158,11,0.25)' }
                    }
                  >
                    {requiresSudo ? 'sudo Elevation Required' : isAdvanced ? 'Advanced Operation' : 'Confirmation Required'}
                  </span>
                  <h3 className="text-base font-bold leading-snug" style={{ color: 'var(--color-ink)' }}>{title}</h3>
                </div>
              </div>
              <button
                onClick={onCancel}
                disabled={loading}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-3)' }}>
              {description}
            </p>

            {command && (
              <div className="text-[11px] font-mono px-2.5 py-1.5 rounded-xl bg-slate-950/70 text-slate-300 border border-slate-800 break-all">
                $ {command}
              </div>
            )}

            {/* Sudo Password Input Form */}
            {requiresSudo && (
              <form onSubmit={handleSubmit} className="space-y-2 pt-1">
                <label className="block text-xs font-bold text-slate-300">
                  Administrator (sudo) Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound size={15} />
                  </div>
                  <input
                    ref={inputRef}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter system administrator password..."
                    disabled={loading}
                    className="w-full pl-9 pr-10 py-2 rounded-xl text-xs bg-slate-900 border transition-all focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-100 placeholder:text-slate-500"
                    style={{ borderColor: error ? '#f43f5e' : 'var(--color-line)' }}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                {error ? (
                  <p className="text-[11px] text-rose-400 font-medium flex items-center gap-1">
                    <span>⚠</span> {error}
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-500 flex items-center gap-1">
                    <ShieldCheck size={11} className="text-emerald-400" />
                    <span>Password is used only for this one-time execution and never stored.</span>
                  </p>
                )}
              </form>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t" style={{ borderColor: 'var(--color-line)' }}>
              <button
                onClick={onCancel}
                disabled={loading}
                className="btn btn-ghost text-xs !py-2 !px-3.5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSubmit()}
                disabled={loading || (requiresSudo && !password.trim())}
                className={`btn ${isAdvanced ? 'btn-danger' : 'btn-primary'} text-xs !py-2 !px-4 cursor-pointer disabled:opacity-50 flex items-center gap-1.5`}
              >
                <span>{loading ? 'Authorizing & Running...' : requiresSudo ? 'Authorize (sudo)' : 'Proceed'}</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
