import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { tabTransition, modalPanel } from '../motion';
import {
  FileText, Download, RotateCcw, CheckCircle2, AlertTriangle,
  History, Sparkles, HardDrive, Shield, Globe, Terminal, ArrowRight,
  Database, Plus, Trash2, Eye, X, Check, RefreshCw, Layers, Cpu
} from 'lucide-react';
import type { RunSummary, RunMode } from '../types';
import { usePlatform } from '../platform';

interface Props {
  summary: RunSummary | null;
  onStartNew: (mode?: RunMode) => void;
  onExport?: () => void;
}

export default function ReportsPage({ onStartNew }: Props) {
  const { config, isMac } = usePlatform();
  const [subTab, setSubTab] = useState<'reports' | 'manifest' | 'audit'>('reports');
  const [savedReports, setSavedReports] = useState<any[]>([]);
  const [dbInfo, setDbInfo] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [auditHistory, setAuditHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [undoMsg, setUndoMsg] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [rRes, tRes, aRes] = await Promise.all([
        fetch('http://127.0.0.1:3131/api/reports').catch(() => null),
        fetch('http://127.0.0.1:3131/api/reports/transactions').catch(() => null),
        fetch('http://127.0.0.1:3131/api/audit-history').catch(() => null),
      ]);

      if (rRes && rRes.ok) {
        const rd = await rRes.json();
        setSavedReports(rd.reports || []);
        if (rd.dbInfo) setDbInfo(rd.dbInfo);
      }
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

  const handleGenerateAndSave = async () => {
    setGenerating(true);
    try {
      const res = await fetch('http://127.0.0.1:3131/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${config.productName} System Diagnostic Snapshot (${new Date().toLocaleDateString()})`,
          reportType: 'full-system',
        }),
      });
      if (res.ok) {
        setUndoMsg('New diagnostic report successfully generated and stored in SQLite database.');
        await fetchReports();
      }
    } catch {}
    finally {
      setGenerating(false);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    try {
      const res = await fetch(`http://127.0.0.1:3131/api/reports/${reportId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setUndoMsg(`Report #${reportId} removed from SQLite database.`);
        fetchReports();
      }
    } catch {}
  };

  const handleViewReport = async (reportId: string) => {
    try {
      const res = await fetch(`http://127.0.0.1:3131/api/reports/${reportId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedReport(data);
      }
    } catch {}
  };

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

  const handleDownloadFullReport = async (format: 'json' | 'html', customData?: any) => {
    try {
      const data = customData || (await (await fetch('http://127.0.0.1:3131/api/reports/full-system')).json());
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
      <p style="margin: 4px 0 0 0; color: #94a3b8;">Generated at: ${new Date(data.timestamp || Date.now()).toLocaleString()} · Host: ${data.hostname || 'Local Computer'} (${data.os || 'macOS'})</p>
    </div>
  </div>
  
  <div class="card">
    <h2>Hardware & Architecture</h2>
    <div class="grid">
      <div class="metric"><div class="lbl">Processor</div><div class="val">${data.hardware?.chip || 'Observed CPU'}</div></div>
      <div class="metric"><div class="lbl">Memory</div><div class="val">${data.hardware?.ramGB ? `${data.hardware.ramGB} GB Unified` : 'Measured RAM'}</div></div>
      <div class="metric"><div class="lbl">Free Storage</div><div class="val">${data.storage?.freeGB ? `${data.storage.freeGB} GB` : 'Observed Storage'}</div></div>
      <div class="metric"><div class="lbl">Health Score</div><div class="val">${data.healthScore || 100}%</div></div>
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

  const dbFolderName = isMac ? 'MacSuite' : 'WinSuite';

  return (
    <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4">
          <img
            src="/logo.png"
            alt="Win/Mac Suite"
            className="w-14 h-14 sm:w-16 sm:h-16 object-contain drop-shadow-xl shrink-0 hover:scale-105 transition-transform"
          />
          <div>
            <div className="inline-flex items-center gap-2 mb-1.5">
              <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25 text-xs">
                <Database size={12} /> SQLite Database: ./{dbFolderName}/reports.db
              </span>
              <span className="pill text-xs" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-ink-3)', borderColor: 'var(--color-line)' }}>
                Persistent Reports, Undo Manifests &amp; Audit Logs
              </span>
            </div>
            <h1 className="text-hero font-extrabold tracking-tight" style={{ color: 'var(--color-ink)' }}>
              Reports &amp; Database Center
            </h1>
            <p className="mt-0.5 text-[14px]" style={{ color: 'var(--color-ink-3)' }}>
              Persistent diagnostic reports database in <span className="font-mono font-bold text-blue-400">./{dbFolderName}/reports.db</span>, cleanup transaction manifests with 1-click Undo, and tamper-evident audit ledger.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleGenerateAndSave}
            disabled={generating}
            className="btn btn-primary text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Plus size={13} className={generating ? 'animate-spin' : ''} />
            <span>{generating ? 'Generating Snapshot...' : 'Save Diagnostic Snapshot to DB'}</span>
          </button>
          <button
            onClick={() => handleDownloadFullReport('html')}
            className="btn btn-secondary text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={13} />
            <span>Export HTML</span>
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
          { id: 'reports' as const, label: `Diagnostic Reports Database (${savedReports.length})`, icon: Database },
          { id: 'manifest' as const, label: `Cleanup Transaction Manifests (${transactions.length})`, icon: RotateCcw },
          { id: 'audit' as const, label: `Audit History & Operation Ledger (${auditHistory.length})`, icon: History },
        ].map((t) => {
          const isSel = subTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer"
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
        {/* 1. SAVED REPORTS FROM SQLITE DB */}
        {subTab === 'reports' && (
          <motion.div key="reports" {...tabTransition} className="space-y-4">
            {/* DB Metrics Bar */}
            <div className="card p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border" style={{ borderColor: 'var(--color-line)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/25 flex items-center justify-center shrink-0">
                  <Database size={19} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-xs font-bold" style={{ color: 'var(--color-ink)' }}>
                      Local SQLite Database: <span className="font-mono text-blue-400">./{dbFolderName}/reports.db</span>
                    </h3>
                    <span className="pill text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/25">
                      30-Day Retention
                    </span>
                    <span className="pill text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/25">
                      25.0 MB Max Cap
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Storage: <span className="font-mono text-slate-200">{dbInfo?.sizeFormatted || '68.0 KB'}</span> / 25.0 MB ({dbInfo?.sizePercentage || 0.3}% capacity) · {savedReports.length} Reports · {transactions.length} Manifests · {auditHistory.length} Audit Entries
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchReports}
                  disabled={loading}
                  className="btn btn-ghost text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                  <span>Refresh DB</span>
                </button>
              </div>
            </div>

            {/* Reports List */}
            {savedReports.length === 0 ? (
              <div className="card p-12 text-center space-y-3">
                <Database size={32} className="mx-auto text-slate-500 opacity-60" />
                <h4 className="text-sm font-bold" style={{ color: 'var(--color-ink)' }}>No Saved Reports in Database Yet</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Click "Save Diagnostic Snapshot to DB" above to store your first comprehensive system telemetry snapshot in the SQLite database.
                </p>
                <button
                  onClick={handleGenerateAndSave}
                  disabled={generating}
                  className="btn btn-primary text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Generate First Diagnostic Snapshot</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedReports.map((r) => (
                  <div
                    key={r.id}
                    className="card p-5 rounded-2xl border space-y-3.5 hover:scale-[1.005] transition-all flex flex-col justify-between"
                    style={{ borderColor: 'var(--color-line)' }}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-blue-500">#{r.id}</span>
                          <span className="pill bg-emerald-500/10 text-emerald-500 border-emerald-500/25 text-[10px]">
                            {r.reportType}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">{new Date(r.timestamp).toLocaleString()}</span>
                      </div>

                      <h4 className="text-sm font-extrabold mt-2" style={{ color: 'var(--color-ink)' }}>
                        {r.title}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {r.summary}
                      </p>
                    </div>

                    <div className="pt-3 border-t flex items-center justify-between gap-2" style={{ borderColor: 'var(--color-line)' }}>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleViewReport(r.id)}
                          className="btn btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1 cursor-pointer"
                          title="Inspect report payload"
                        >
                          <Eye size={12} />
                          <span>View</span>
                        </button>
                        <button
                          onClick={async () => {
                            const res = await fetch(`http://127.0.0.1:3131/api/reports/${r.id}`);
                            if (res.ok) {
                              const d = await res.json();
                              handleDownloadFullReport('html', d.data);
                            }
                          }}
                          className="btn btn-ghost text-xs px-2 py-1.5 flex items-center gap-1 cursor-pointer"
                          title="Export as HTML"
                        >
                          <Download size={12} />
                          <span>HTML</span>
                        </button>
                      </div>

                      <button
                        onClick={() => handleDeleteReport(r.id)}
                        className="btn btn-ghost text-xs px-2 py-1.5 text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                        title="Delete from database"
                      >
                        <Trash2 size={12} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* 2. CLEANUP TRANSACTION MANIFESTS */}
        {subTab === 'manifest' && (
          <motion.div key="manifest" {...tabTransition} className="card p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-line)' }}>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>
                  Safe Cleanup Transaction Manifest Ledger
                </h3>
                <p className="text-xs text-slate-400">
                  Persisted in <span className="font-mono text-blue-400">./{dbFolderName}/reports.db</span>. Every cleanup operation creates a verifiable recovery manifest.
                </p>
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
                      {Array.isArray(tx.items) && tx.items.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {tx.items.map((it: any, idx: number) => (
                            <span key={idx} className="pill text-[10px] bg-slate-800 text-slate-300">
                              {typeof it === 'string' ? it : it.name || it.id}
                            </span>
                          ))}
                        </div>
                      )}
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

        {/* 3. AUDIT HISTORY */}
        {subTab === 'audit' && (
          <motion.div key="audit" {...tabTransition} className="card p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-line)' }}>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>
                  Audit History &amp; Mutation Ledger
                </h3>
                <p className="text-xs text-slate-400">
                  Tamper-evident operations ledger stored in <span className="font-mono text-blue-400">./{dbFolderName}/reports.db</span>.
                </p>
              </div>
            </div>
            <div className="divide-y max-h-[520px] overflow-y-auto" style={{ borderColor: 'var(--color-line)' }}>
              {auditHistory.map((item, idx) => (
                <div key={idx} className="py-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold" style={{ color: 'var(--color-ink)' }}>{item.operation}</span>
                    <span className="text-[10px] text-slate-500">{new Date(item.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-[11px] font-mono text-slate-400">
                    Command: <span className="text-blue-400">{item.commandId}</span> · User: {item.user} · Risk: {item.risk} · Result: <span className="text-emerald-400">{item.result}</span>
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report Inspection Modal */}
      <AnimatePresence>
        {selectedReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              {...modalPanel}
              className="w-full max-w-4xl card p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border"
              style={{ borderColor: 'var(--color-line)' }}
            >
              <div className="flex items-start justify-between border-b pb-3" style={{ borderColor: 'var(--color-line)' }}>
                <div>
                  <div className="inline-flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-blue-500 font-bold">#{selectedReport.id}</span>
                    <span className="pill bg-emerald-500/10 text-emerald-500 border-emerald-500/25 text-[10px]">
                      {selectedReport.reportType}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold" style={{ color: 'var(--color-ink)' }}>
                    {selectedReport.title}
                  </h3>
                  <p className="text-xs text-slate-400">{new Date(selectedReport.timestamp).toLocaleString()} · Host: {selectedReport.hostname}</p>
                </div>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-500/10 text-slate-400 hover:text-slate-200"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-xs max-h-[460px] overflow-auto">
                <pre>{JSON.stringify(selectedReport.data, null, 2)}</pre>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--color-line)' }}>
                <button
                  onClick={() => handleDownloadFullReport('html', selectedReport.data)}
                  className="btn btn-secondary text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Download size={13} />
                  <span>Download HTML</span>
                </button>
                <button
                  onClick={() => handleDownloadFullReport('json', selectedReport.data)}
                  className="btn btn-primary text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Download size={13} />
                  <span>Download JSON</span>
                </button>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="btn btn-ghost text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
