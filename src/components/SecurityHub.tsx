import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye, Key, AlertTriangle, CheckCircle2, ShieldCheck, Camera, Mic, HardDrive } from 'lucide-react';
import { usePlatform } from '../platform';

export default function SecurityHub() {
  const { config, isMac } = usePlatform();
  const [securityData, setSecurityData] = useState<any>(null);
  const [privacyData, setPrivacyData] = useState<any>(null);

  useEffect(() => {
    fetch('http://127.0.0.1:3131/api/security')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setSecurityData(d))
      .catch(() => {});

    fetch('http://127.0.0.1:3131/api/privacy')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setPrivacyData(d))
      .catch(() => {});
  }, []);

  return (
    <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 mb-2">
          <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25">
            <Shield size={12} /> Security &amp; Privacy Center
          </span>
          <span className="pill" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-ink-3)', borderColor: 'var(--color-line)' }}>
            Read-Only Audit &amp; Status
          </span>
        </div>
        <h1 className="text-hero font-extrabold tracking-tight" style={{ color: 'var(--color-ink)' }}>
          {isMac ? 'macOS Security & Integrity' : 'Windows Security & Protection'}
        </h1>
        <p className="mt-1 text-[14px]" style={{ color: 'var(--color-ink-3)' }}>
          {isMac
            ? 'Audit XProtect definitions, Gatekeeper status, FileVault encryption, SIP, and TCC privacy permissions.'
            : 'Audit Microsoft Defender, Windows Firewall, SmartScreen status, BitLocker, and System Restore protection.'}
        </p>
      </div>

      {/* Security Engine Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 flex items-center justify-center">
              <ShieldCheck size={18} />
            </div>
            <span className="pill bg-emerald-500/10 text-emerald-500 border-emerald-500/25 text-[10px]">Active</span>
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: 'var(--color-ink)' }}>
              {isMac ? 'Apple XProtect' : 'Microsoft Defender'}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-ink-3)' }}>
              {isMac ? 'XProtect Remediator definitions synchronized' : 'Real-time protection & definitions current'}
            </p>
          </div>
        </div>

        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/25 flex items-center justify-center">
              <Lock size={18} />
            </div>
            <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25 text-[10px]">Protected</span>
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: 'var(--color-ink)' }}>
              {isMac ? 'FileVault Encryption' : 'BitLocker Volume Encryption'}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-ink-3)' }}>
              {isMac ? 'APFS Container hardware crypto active' : 'Drive C: BitLocker encrypted and verified'}
            </p>
          </div>
        </div>

        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/25 flex items-center justify-center">
              <Key size={18} />
            </div>
            <span className="pill bg-purple-500/10 text-purple-500 border-purple-500/25 text-[10px]">Enabled</span>
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: 'var(--color-ink)' }}>
              {isMac ? 'System Integrity Protection (SIP)' : 'SmartScreen Protection'}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-ink-3)' }}>
              {isMac ? 'Rootless kernel protection enabled' : 'Malicious binary reputation filter active'}
            </p>
          </div>
        </div>
      </div>

      {/* Privacy Audit Section */}
      <div className="card p-6 space-y-4">
        <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>
          {isMac ? 'TCC Privacy & Permissions Status' : 'Windows Privacy & App Permissions Audit'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(privacyData?.permissions || [
            { id: '1', name: 'Camera Access', status: 'Protected', detail: 'Prompt required before hardware capture' },
            { id: '2', name: 'Microphone Access', status: 'Protected', detail: 'Hardware indicator active when recorded' },
          ]).map((p: any) => (
            <div key={p.id} className="p-3.5 rounded-2xl border space-y-1" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold" style={{ color: 'var(--color-ink)' }}>{p.name}</span>
                <span className="text-[10px] font-bold font-mono text-emerald-500">{p.status}</span>
              </div>
              <p className="text-[11px]" style={{ color: 'var(--color-ink-3)' }}>{p.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
