import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Download, RotateCcw, CheckCircle2, AlertTriangle,
  History, Sparkles, HardDrive, Shield, Globe, Terminal, ArrowRight
} from 'lucide-react';
import type { RunSummary, RunMode } from '../types';
import { usePlatform } from '../platform';

interface Props {
  summary: RunSummary | null;
  onStartNew: (mode?: RunMode) => void;
  onExport?: () => void;
}

export default function ReportsPage({ summary, onStartNew }: Props) {
  const { config, isMac } = usePlatform();
  const [subTab, setSubTab] = useState<'manifest' | 'audit' | 'htmlReport'>('manifest');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [auditHistory, setAuditHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [undoMsg, setUndoMsg] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [tRes, aRes] = await Promise.all([
        fetch('http://127.0.0.1:3131/api/reports/transactions').catch(() => null),
        fetch('http://127.0.0.1:3131/api/audit-history').catch(() => null),
      ]);

      if (tRes && tRes.ok) {
        const td = await tRes.json();
        setTransactions(td.transactions || []);
      }
      if (aRes && aRes.ok) {
        const ad = await aRes.json();
        setAuditHistory(ad.history || []);
      }
    } catch {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleUndo = async (txId: string) => {
    try {
      const res = await fetch('http://127.0.0.1:3131/api/actions/undo-cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: txId }),
      });
      const data = await res.json();
      if (data.success) {
        setUndoMsg(`Transaction ${txId} successfully restored.`);
        fetchReports();
      }
    } catch {}
  };

  const handleDownloadFullReport = async (format: 'json' | 'html') => {
    try {
      const res = await fetch('http://127.0.0.1:3131/api/reports/full-system');
      const data = await res.json();

      let blob: Blob;
      let filename: string;
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

      if (format === 'html') {
        const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${config.productName} - System Intelligence Diagnostic Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; margin: 0; }
    .card { background: #1e293b; border-radius: 16px; padding: 24px; margin-bottom: 20px; border: 1px solid #334155; }
    h1 { color: #38bdf8; margin-top: 0; }
    h2 { color: #94a3b8; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
    .metric { background: #0f172a; border-radius: 12px; padding: 16px; border: 1px solid #334155; }
    .val { font-size: 24px; font-weight: bold; color: #38bdf8; font-family: monospace; }
    .lbl { font-size: 12px; color: #94a3b8; text-transform: uppercase; }
    pre { background: #0f172a; padding: 16px; border-radius: 12px; overflow-x: auto; color: #a5f3fc; }
  </style>
</head>
<body>
  <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
    <img src="/logo.png" alt="Logo" style="width: 64px; height: 64px; border-radius: 16px;" onerror="this.style.display='none'"/>
    <div>
      <h1 style="margin: 0;">${config.productName} System Intelligence Report</h1>
      <p style="margin: 4px 0 0 0; color: #94a3b8;">Generated at: ${new Date().toLocaleString()} · Host: ${data.hostname || 'Local Computer'} (${data.os || 'macOS'})</p>
    </div>
  </div>
  
  <div class="card">
    <h2>Hardware & Architecture</h2>
    <div class="grid">
      <div class="metric"><div class="lbl">Processor</div><div class="val">${data.hardware?.chip || 'Observed CPU'}</div></div>
      <div class="metric"><div class="lbl">Memory</div><div class="val">${data.hardware?.ramGB ? `${data.hardware.ramGB} GB Unified` : 'Measured RAM'}</div></div>
      <div class="metric"><div class="lbl">Free Storage</div><div class="val">${data.storage?.freeGB ? `${data.storage.freeGB} GB` : 'Observed APFS'}</div></div>
      <div class="metric"><div class="lbl">Uptime</div><div class="val">${data.uptime || 'Active'}</div></div>
    </div>
  </div>

  <div class="card">
    <h2>System Telemetry Diagnostics</h2>
    <pre>${JSON.stringify(data, null, 2)}</pre>
  </div>
</body>
</html>`;
        blob = new Blob([htmlContent], { type: 'text/html' });
        filename = `${config.productName.toLowerCase()}-diagnostic-report-${stamp}.html`;
      } else {
        blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        filename = `${config.productName.toLowerCase()}-diagnostic-report-${stamp}.json`;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {}
  };

  return (
    <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4">
          <img
            src="/logo.png"
            alt="Win/Mac Suite"
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover shadow-xl border border-white/30 shrink-0 hover:scale-105 transition-transform"
          />
          <div>
            <div className="inline-flex items-center gap-2 mb-1.5">
              <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25 text-xs">
                <FileText size={12} /> Diagnostic Reports &amp; Transaction Ledger
              </span>
              <span className="pill text-xs" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-ink-3)', borderColor: 'var(--color-line)' }}>
                Undo Manifest &amp; Standalone HTML Export Active
              </span>
            </div>
            <h1 className="text-hero font-extrabold tracking-tight" style={{ color: 'var(--color-ink)' }}>
              Reports &amp; Safe Undo Center
            </h1>
            <p className="mt-0.5 text-[14px]" style={{ color: 'var(--color-ink-3)' }}>
              Export comprehensive diagnostic reports in standalone HTML / JSON and review cleanup transaction manifests with 1-click Undo.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDownloadFullReport('html')}
            className="btn btn-primary text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Download size={13} />
            <span>Export HTML Diagnostic Report</span>
          </button>
          <button
            onClick={() => handleDownloadFullReport('json')}
            className="btn btn-ghost text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={13} />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {undoMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-500 flex items-center justify-between">
          <span>✓ {undoMsg}</span>
          <button onClick={() => setUndoMsg(null)} className="text-slate-400 hover:text-slate-200">×</button>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl border overflow-x-auto" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
        {[
          { id: 'manifest' as const, label: 'Cleanup Transaction Manifests (Undo)', icon: RotateCcw },
          { id: 'audit' as const, label: 'Audit History & Operation Ledger', icon: History },
        ].map((t) => {
          const isSel = subTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer"
              style={
                isSel
                  ? { backgroundColor: '#3b82f6', color: '#fff', boxShadow: '0 2px 8px rgba(59,130,246,0.3)' }
                  : { color: 'var(--color-ink-3)' }
              }
            >
              <t.icon size={14} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sub-views */}
      <AnimatePresence mode="wait">
        {subTab === 'manifest' && (
          <motion.div key="manifest" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-line)' }}>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>
                  Safe Cleanup Transaction Manifest Ledger
                </h3>
                <p className="text-xs text-slate-400">Every cleanup operation creates a verifiable recovery manifest that can be undone.</p>
              </div>
            </div>

            {transactions.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No cleanup transactions recorded yet. Run Safe Cleanup from the Storage Hub to generate transaction records.
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--color-line)' }}>
                {transactions.map((tx) => (
                  <div key={tx.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-blue-500">#{tx.id}</span>
                        <span className="pill bg-emerald-500/10 text-emerald-500 border-emerald-500/25 text-[10px]">
                          {tx.status}
                        </span>
                        <span className="text-[10px] text-slate-500">{new Date(tx.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-xs font-bold mt-1" style={{ color: 'var(--color-ink)' }}>
                        Reclaimed {tx.reclaimedFormatted} ({tx.itemsCount} artifact categories)
                      </p>
                    </div>

                    {tx.status !== 'restored' && tx.reversible && (
                      <button
                        onClick={() => handleUndo(tx.id)}
                        className="btn btn-ghost text-xs px-3 py-1.5 flex items-center gap-1.5 cursor-pointer text-amber-400 hover:text-amber-300"
                      >
                        <RotateCcw size={13} />
                        <span>Undo Transaction</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {subTab === 'audit' && (
          <motion.div key="audit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card p-6 space-y-4">
            <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>
              Audit History &amp; Mutation Ledger
            </h3>
            <div className="divide-y max-h-[460px] overflow-y-auto" style={{ borderColor: 'var(--color-line)' }}>
              {auditHistory.map((item, idx) => (
                <div key={idx} className="py-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold" style={{ color: 'var(--color-ink)' }}>{item.operation}</span>
                    <span className="text-[10px] text-slate-500">{new Date(item.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-[11px] font-mono text-slate-400">Command: {item.commandId} · Risk: {item.risk}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
