import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ShieldAlert, KeyRound, Eye, EyeOff, X, ArrowRight, ShieldCheck } from 'lucide-react';
import { modalBackdrop, modalPanel } from '../motion';

interface Props {
  open: boolean;
  title?: string;
  operationName?: string;
  command?: string;
  description?: string;
  error?: string | null;
  loading?: boolean;
  onConfirm: (password: string) => void;
  onCancel: () => void;
}

export default function SudoAuthModal({
  open,
  title = 'Administrator Privileges Required',
  operationName = 'Elevated System Operation',
  command,
  description = 'This operation requires root / sudo elevation to modify protected system files or kernel state. Please enter your administrator password to proceed.',
  error = null,
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setPassword('');
      setShowPassword(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || loading) return;
    onConfirm(password);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            {...modalBackdrop}
            onClick={onCancel}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
          />

          <motion.div
            {...modalPanel}
            className="relative w-full max-w-md card p-6 shadow-2xl border z-10 space-y-5"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: error ? '#f43f5e' : 'var(--color-line)',
              boxShadow: error ? '0 0 25px rgba(244, 63, 94, 0.25)' : undefined,
            }}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border bg-rose-500/10 text-rose-500 border-rose-500/30">
                  <Lock size={22} className="animate-pulse" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/25 mb-1">
                    <ShieldAlert size={11} />
                    <span>sudo Elevation Required</span>
                  </div>
                  <h3 className="text-base font-extrabold leading-tight" style={{ color: 'var(--color-ink)' }}>
                    {title}
                  </h3>
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

            {/* Operation Info Card */}
            <div className="p-3.5 rounded-xl border space-y-1.5" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
              <div className="flex items-center justify-between text-xs font-bold" style={{ color: 'var(--color-ink)' }}>
                <span>Target Action:</span>
                <span className="text-rose-400 font-mono">{operationName}</span>
              </div>
              {command && (
                <div className="text-[11px] font-mono px-2 py-1 rounded bg-slate-950/70 text-slate-300 border border-slate-800 break-all">
                  $ {command}
                </div>
              )}
              <p className="text-[11px] leading-relaxed text-slate-400">
                {description}
              </p>
            </div>

            {/* Password Input Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  Administrator Password
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
                    placeholder="Enter your system sudo password..."
                    disabled={loading}
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl text-xs bg-slate-900 border transition-all focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-100 placeholder:text-slate-500"
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
                  <p className="text-[11px] text-rose-400 font-medium flex items-center gap-1 mt-1">
                    <span>⚠</span> {error}
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-1">
                    <ShieldCheck size={11} className="text-emerald-400" />
                    <span>Password is used only for this one-time execution and never logged or stored.</span>
                  </p>
                )}
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t" style={{ borderColor: 'var(--color-line)' }}>
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={loading}
                  className="btn btn-ghost text-xs !py-2 !px-3.5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!password.trim() || loading}
                  className="btn btn-danger text-xs !py-2 !px-4 flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                >
                  <span>{loading ? 'Authenticating & Executing...' : 'Authorize (sudo)'}</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
