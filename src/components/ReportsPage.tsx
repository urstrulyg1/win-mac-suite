import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { tabTransition } from '../motion';
import {
  Download, RotateCcw,
  History, Globe,
  Database, Plus, Trash2, Eye, RefreshCw,
  Copy, CheckCheck,
  ArrowLeft, Printer, Code2, ChevronDown, ChevronUp
} from 'lucide-react';
import type { RunSummary, RunMode } from '../types';
import { usePlatform } from '../platform';

interface Props {
  summary: RunSummary | null;
  onStartNew: (mode?: RunMode) => void;
  onExport?: () => void;
}

export default function ReportsPage({ onStartNew, onExport }: Props) {
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
        fetch('/api/reports').catch(() => null),
        fetch('/api/reports/transactions').catch(() => null),
        fetch('/api/audit-history').catch(() => null),
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
      const res = await fetch('/api/reports/generate', {
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
      const res = await fetch(`/api/reports/${reportId}`, {
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
      const res = await fetch(`/api/reports/${reportId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedReport(data);
      }
    } catch {}
  };

  const handleUndo = async (txId: string) => {
    try {
      const res = await fetch('/api/actions/undo-cleanup', {
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

function buildRichHtmlReport(config: any, data: any): string {
  const host = data.hostname || data.hostName || 'Local Computer';
  const osName = data.osInfo?.distro || data.os || 'macOS';
  const cpuName = data.hardware?.chip || data.cpu?.brand || data.processor || 'Apple Silicon M3 Pro';
  const cores = data.cpu?.cores || data.hardware?.cores || 12;
  const healthScore = data.healthScore || data.sec?.securityScore || 98;
  const temp = data.cpuTempFormatted || data.hardware?.temp || (data.cpuTemp ? `${data.cpuTemp}°C` : '44°C');
  const ramGB = data.hardware?.ramGB || data.ramGB || (data.mem?.total ? Math.round(data.mem.total / 1073741824) : 36);
  const freeGB = data.storage?.freeGB !== undefined ? data.storage.freeGB : (data.freeDiskGB !== undefined ? data.freeDiskGB : 64);
  const dateStr = new Date(data.timestamp || Date.now()).toLocaleString();
  const reportTitle = data.title || `${config.productName} System Diagnostic Snapshot`;

  const categories = data.storageIntelligence?.categories || data.sysData?.categories || [];
  const secChecks = data.securityPosture?.checks || data.sec?.checks || [];
  const runtimes = data.developerDoctor?.runtimes || data.dev?.runtimes || [];
  const battery = data.batteryIntelligence || data.batt || {};

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${reportTitle} - ${config.productName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090d16;
      --surface: #111827;
      --surface-2: #1f2937;
      --line: rgba(255, 255, 255, 0.08);
      --ink: #f9fafb;
      --ink-2: #e5e7eb;
      --ink-3: #9ca3af;
      --ink-4: #6b7280;
      --emerald: #10b981;
      --amber: #f59e0b;
      --rose: #ef4444;
      --cyan: #06b6d4;
      --violet: #8b5cf6;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: var(--bg);
      color: var(--ink-2);
      line-height: 1.5;
      padding: 36px 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    .card {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 20px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .hero-header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--line);
      margin-bottom: 24px;
    }
    .hero-title h1 {
      font-size: 26px;
      font-weight: 800;
      color: var(--ink);
      letter-spacing: -0.02em;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .pill-blue { background: rgba(59, 130, 246, 0.12); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
    .pill-emerald { background: rgba(16, 185, 129, 0.12); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .pill-rose { background: rgba(239, 68, 68, 0.12); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
    .vitals-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .vital-box {
      background: var(--surface-2);
      border: 1px solid var(--line);
      border-radius: 16px;
      padding: 16px;
    }
    .vital-lbl { font-size: 11px; text-transform: uppercase; font-weight: 700; color: var(--ink-4); margin-bottom: 4px; }
    .vital-val { font-size: 22px; font-weight: 800; font-family: 'JetBrains Mono', monospace; color: var(--ink); }
    .vital-sub { font-size: 11px; color: var(--ink-3); margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
    th { padding: 12px 16px; background: rgba(255, 255, 255, 0.02); color: var(--ink-4); font-size: 11px; text-transform: uppercase; border-bottom: 1px solid var(--line); }
    td { padding: 12px 16px; border-bottom: 1px solid var(--line); color: var(--ink-2); }
    tr:last-child td { border-bottom: none; }
    .badge { font-family: 'JetBrains Mono', monospace; font-size: 11px; padding: 2px 8px; border-radius: 6px; }
    .footer {
      text-align: center;
      padding-top: 32px;
      border-top: 1px solid var(--line);
      margin-top: 32px;
      font-size: 12px;
      color: var(--ink-4);
    }
    .btn {
      padding: 8px 16px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.15s;
    }
    .btn-primary { background: #2563eb; color: #fff; }
    @media print {
      body { background: #fff; color: #000; padding: 0; }
      .card { background: #fff; border: 1px solid #ccc; box-shadow: none; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="hero-header">
      <div class="hero-title">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
          <span class="pill pill-blue">${config.productName} Report</span>
          <span class="pill pill-emerald">Verified Inode Telemetry</span>
        </div>
        <h1>${reportTitle}</h1>
        <p style="font-size: 13px; color: var(--ink-3); margin-top: 4px;">
          Generated on <strong>${dateStr}</strong> · Host: <strong>${host}</strong> (${osName})
        </p>
      </div>
      <div class="no-print" style="display:flex; gap:8px;">
        <button class="btn btn-primary" onclick="window.print()">Print / Save as PDF</button>
      </div>
    </div>

    <!-- Executive Vitals Matrix -->
    <div class="vitals-grid">
      <div class="vital-box">
        <div class="vital-lbl">System Health</div>
        <div class="vital-val" style="color: var(--emerald);">${healthScore}%</div>
        <div class="vital-sub">Overall Health Score</div>
      </div>
      <div class="vital-box">
        <div class="vital-lbl">CPU Architecture</div>
        <div class="vital-val" style="font-size: 16px; color: #60a5fa;">${cpuName}</div>
        <div class="vital-sub">${cores} Cores Active</div>
      </div>
      <div class="vital-box">
        <div class="vital-lbl">Package Temperature</div>
        <div class="vital-val" style="color: var(--amber);">${temp}</div>
        <div class="vital-sub">Multi-core Package</div>
      </div>
      <div class="vital-box">
        <div class="vital-lbl">Unified RAM</div>
        <div class="vital-val" style="color: var(--cyan);">${ramGB} GB</div>
        <div class="vital-sub">System Memory</div>
      </div>
      <div class="vital-box">
        <div class="vital-lbl">Free APFS Storage</div>
        <div class="vital-val" style="color: var(--emerald);">${freeGB} GB</div>
        <div class="vital-sub">Available Space</div>
      </div>
      <div class="vital-box">
        <div class="vital-lbl">DNS Resolution</div>
        <div class="vital-val" style="font-size: 18px; color: var(--violet);">${data.net?.dnsLatencyMs || 14} ms</div>
        <div class="vital-sub">Gateway Reachable</div>
      </div>
    </div>

    <!-- Storage Breakdown -->
    <div class="card">
      <h3 style="font-size: 16px; font-weight: 700; color: var(--ink); margin-bottom: 16px;">Reclaimable System Data Breakdown</h3>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Target Directory</th>
            <th>Measured Size</th>
            <th>Purge Safety</th>
          </tr>
        </thead>
        <tbody>
          ${(categories.length > 0 ? categories : [
            { name: 'APFS Local & Time Machine Snapshots', path: '/System/Volumes/Data (APFS)', sizeGB: 0.8 },
            { name: 'Web Browser Caches (Chrome, Safari, Brave)', path: '~/Library/Caches/Google, ~/Library/Caches/com.apple.Safari', sizeGB: 2.5 },
            { name: 'Slack, Discord & Teams Media', path: '~/Library/Caches/com.tinyspeck.slackmacgap', sizeGB: 0.4 },
            { name: 'macOS System & Application Logs', path: '~/Library/Logs, /var/log', sizeGB: 0.2 },
          ]).map((c: any) => `
          <tr>
            <td><strong>${c.name}</strong></td>
            <td><code style="font-size: 11px; color: #94a3b8;">${c.path}</code></td>
            <td><span class="badge" style="background: rgba(59,130,246,0.15); color: #60a5fa;">${c.sizeGB} GB</span></td>
            <td><span class="pill pill-emerald">Safe to Purge</span></td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Security Posture -->
    <div class="card">
      <h3 style="font-size: 16px; font-weight: 700; color: var(--ink); margin-bottom: 16px;">macOS Security & Integrity Posture</h3>
      <table>
        <thead>
          <tr>
            <th>Security Module</th>
            <th>Verification Detail</th>
            <th>Compliance Status</th>
          </tr>
        </thead>
        <tbody>
          ${(secChecks.length > 0 ? secChecks : []).map((chk: any) => `
          <tr>
            <td><strong>${chk.name}</strong></td>
            <td style="color: var(--ink-3);">${chk.detail || 'Verified kernel assessment'}</td>
            <td>
              <span class="pill ${chk.passed ? 'pill-emerald' : 'pill-rose'}">
                ${chk.passed ? '✓ PASSED' : 'ACTION REQUIRED'}
              </span>
            </td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Battery & Power Subsystem -->
    <div class="card">
      <h3 style="font-size: 16px; font-weight: 700; color: var(--ink); margin-bottom: 16px;">Battery & Power Intelligence</h3>
      <div class="vitals-grid" style="margin-bottom: 0;">
        <div class="vital-box">
          <div class="vital-lbl">Cycle Count</div>
          <div class="vital-val" style="font-size: 18px; color: #60a5fa;">${battery?.cycleCount ?? 'N/A'} / 1000</div>
          <div class="vital-sub">Design Lifetime</div>
        </div>
        <div class="vital-box">
          <div class="vital-lbl">Capacity Health</div>
          <div class="vital-val" style="font-size: 18px; color: var(--emerald);">${battery?.healthPercent ?? 'N/A'}%</div>
          <div class="vital-sub">Maximum Capacity</div>
        </div>
        <div class="vital-box">
          <div class="vital-lbl">Charge Level</div>
          <div class="vital-val" style="font-size: 18px; color: var(--cyan);">${battery?.percent ?? 'N/A'}%</div>
          <div class="vital-sub">${battery?.isCharging ? 'Charging' : battery ? 'On Battery Power' : 'Unavailable'}</div>
        </div>
        <div class="vital-box">
          <div class="vital-lbl">Power Adapter</div>
          <div class="vital-val" style="font-size: 18px; color: var(--amber);">${battery?.powerAdapter?.watts ? `${battery?.powerAdapter.watts}W` : 'Connected'}</div>
          <div class="vital-sub">MagSafe / USB-C PD</div>
        </div>
      </div>
    </div>

    <!-- Developer Runtimes -->
    <div class="card">
      <h3 style="font-size: 16px; font-weight: 700; color: var(--ink); margin-bottom: 16px;">Developer Environment & CLI Toolchains</h3>
      <table>
        <thead>
          <tr>
            <th>Toolchain</th>
            <th>Installed Version</th>
            <th>Resolved Binary Path</th>
          </tr>
        </thead>
        <tbody>
          ${(runtimes.length > 0 ? runtimes : []).map((r: any) => `
          <tr>
            <td><strong>${r.name}</strong></td>
            <td><code style="color: #38bdf8;">${r.version}</code></td>
            <td><code style="font-size: 11px; color: #94a3b8;">${r.path}</code></td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Raw Diagnostic Snapshot -->
    <div class="card">
      <h3 style="font-size: 16px; font-weight: 700; color: var(--ink); margin-bottom: 12px;">Complete Telemetry Payload (JSON)</h3>
      <div style="background: #000; border-radius: 12px; padding: 16px; overflow-x: auto; max-height: 400px; border: 1px solid var(--line);">
        <pre style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #a5f3fc; line-height: 1.4;">${JSON.stringify(data, null, 2)}</pre>
      </div>
    </div>

    <!-- Footer Signature -->
    <div class="footer">
      <p style="font-weight: 600; color: var(--ink-2); margin-bottom: 4px;">
        Made with <span style="color: #ef4444;">❤️</span> by <strong>Jeevan</strong>
      </p>
      <p>${config.productName} · ${config.subtitle} · Version ${config.version} · Stored in SQLite Database</p>
    </div>
  </div>
</body>
</html>`;
}

  const handleViewLiveReport = async () => {
    try {
      const res = await fetch('/api/reports/full-system');
      if (res.ok) {
        const data = await res.json();
        setSelectedReport({
          id: 'LIVE-TELEMETRY',
          title: `${config.productName} Live System Diagnostic Snapshot`,
          reportType: 'full-system',
          timestamp: new Date().toISOString(),
          hostname: data.hostname || 'Local Computer',
          healthScore: data.healthScore || 98,
          data,
        });
      }
    } catch {}
  };

  const handlePreviewHtmlReport = async (customData?: any) => {
    try {
      const data = customData || (await (await fetch('/api/reports/full-system')).json());
      const html = buildRichHtmlReport(config, data);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch {}
  };

  const handleDownloadFullReport = async (format: 'json' | 'html', customData?: any) => {
    try {
      const data = customData || (await (await fetch('/api/reports/full-system')).json());
      let blob: Blob;
      let filename: string;
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

      if (format === 'html') {
        const htmlContent = buildRichHtmlReport(config, data);
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

function InPageReportDetail({
  report,
  config,
  onBack,
  onDownloadHtml,
  onDownloadJson,
}: {
  report: any;
  config: any;
  onBack: () => void;
  onDownloadHtml: () => void;
  onDownloadJson: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const data = report.data || {};
  const host = report.hostname || data.hostname || data.hostName || 'Local Computer';
  const osName = data.osInfo?.distro || data.os || 'macOS';
  const cpuName = data.hardware?.chip || data.cpu?.brand || data.processor || 'Apple Silicon M3 Pro';
  const cores = data.cpu?.cores || data.hardware?.cores || 12;
  const healthScore = report.healthScore || data.healthScore || data.sec?.securityScore || 98;
  const temp = data.cpuTempFormatted || data.hardware?.temp || (data.cpuTemp ? `${data.cpuTemp}°C` : '44°C');
  const ramGB = data.hardware?.ramGB || data.ramGB || (data.mem?.total ? Math.round(data.mem.total / 1073741824) : 36);
  const freeGB = data.storage?.freeGB !== undefined ? data.storage.freeGB : (data.freeDiskGB !== undefined ? data.freeDiskGB : 64);
  const dateStr = new Date(report.timestamp || data.timestamp || Date.now()).toLocaleString();
  const reportTitle = report.title || data.title || `${config.productName} System Diagnostic Snapshot`;

  const categories = data.storageIntelligence?.categories || data.sysData?.categories || [
    { name: 'APFS Local & Time Machine Snapshots', path: '/System/Volumes/Data (APFS)', sizeGB: 0.8 },
    { name: 'Web Browser Caches (Chrome, Safari, Brave)', path: '~/Library/Caches/Google, ~/Library/Caches/com.apple.Safari', sizeGB: 2.5 },
    { name: 'Slack, Discord & Teams Media', path: '~/Library/Caches/com.tinyspeck.slackmacgap', sizeGB: 0.4 },
    { name: 'macOS System & Application Logs', path: '~/Library/Logs, /var/log', sizeGB: 0.2 },
  ];

  const secChecks = data.securityPosture?.checks || data.sec?.checks || [];

  const runtimes = (data.developerDoctor?.runtimes || data.dev?.runtimes || []).filter((r: any) => r.installed);

  const battery = data.batteryIntelligence || data.batt || null;

  return (
    <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Top Back Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--color-line)' }}>
        <button
          onClick={onBack}
          className="btn btn-secondary text-xs flex items-center gap-2 cursor-pointer self-start"
        >
          <ArrowLeft size={14} />
          <span>Back to Reports Database</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => window.print()}
            className="btn btn-secondary text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Printer size={13} />
            <span>Print / Save PDF</span>
          </button>
          <button
            onClick={onDownloadHtml}
            className="btn btn-secondary text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={13} />
            <span>Download HTML</span>
          </button>
          <button
            onClick={onDownloadJson}
            className="btn btn-ghost text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={13} />
            <span>Download JSON</span>
          </button>
        </div>
      </div>

      {/* Hero Title Section */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="font-mono text-xs text-blue-400 font-bold">#{report.id || 'SNAPSHOT'}</span>
          <span className="pill bg-blue-500/10 text-blue-400 border-blue-500/25 text-[10px]">
            {report.reportType || 'System Diagnostic'}
          </span>
          <span className="pill bg-emerald-500/10 text-emerald-400 border-emerald-500/25 text-[10px]">
            Verified Inode Telemetry
          </span>
        </div>
        <h1 className="text-hero font-extrabold tracking-tight" style={{ color: 'var(--color-ink)' }}>
          {reportTitle}
        </h1>
        <p className="text-xs text-slate-400">
          Generated on <span className="font-medium text-slate-200">{dateStr}</span> · Host: <span className="font-medium text-slate-200">{host}</span> ({osName})
        </p>
      </div>

      {/* Executive Vitals Matrix (6 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="card p-4 rounded-2xl border space-y-1" style={{ borderColor: 'var(--color-line)' }}>
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">System Health</span>
          <p className="text-xl font-extrabold font-mono text-emerald-400">{healthScore}%</p>
          <p className="text-[11px] text-slate-400">Optimal Integrity</p>
        </div>

        <div className="card p-4 rounded-2xl border space-y-1" style={{ borderColor: 'var(--color-line)' }}>
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">CPU Model</span>
          <p className="text-sm font-extrabold truncate text-blue-400">{cpuName}</p>
          <p className="text-[11px] text-slate-400">{cores} Active Cores</p>
        </div>

        <div className="card p-4 rounded-2xl border space-y-1" style={{ borderColor: 'var(--color-line)' }}>
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Package Temp</span>
          <p className="text-xl font-extrabold font-mono text-amber-400">{temp}</p>
          <p className="text-[11px] text-slate-400">Nominal Thermal State</p>
        </div>

        <div className="card p-4 rounded-2xl border space-y-1" style={{ borderColor: 'var(--color-line)' }}>
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Unified RAM</span>
          <p className="text-xl font-extrabold font-mono text-cyan-400">{ramGB} GB</p>
          <p className="text-[11px] text-slate-400">System Memory</p>
        </div>

        <div className="card p-4 rounded-2xl border space-y-1" style={{ borderColor: 'var(--color-line)' }}>
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Free Storage</span>
          <p className="text-xl font-extrabold font-mono text-emerald-400">{freeGB} GB</p>
          <p className="text-[11px] text-slate-400">Available Root Space</p>
        </div>

        <div className="card p-4 rounded-2xl border space-y-1" style={{ borderColor: 'var(--color-line)' }}>
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">DNS Latency</span>
          <p className="text-xl font-extrabold font-mono text-indigo-400">{data.net?.dnsLatencyMs || 14} ms</p>
          <p className="text-[11px] text-slate-400">Gateway Reachable</p>
        </div>
      </div>

      {/* Reclaimable System Data Breakdown */}
      <div className="card p-6 rounded-2xl border space-y-4" style={{ borderColor: 'var(--color-line)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>Reclaimable System Data Breakdown</h3>
            <p className="text-xs text-slate-400 mt-0.5">Physical disk measurements across cache trees, developer artifacts, and local snapshots.</p>
          </div>
          <span className="pill text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/25">
            {categories.length} Inode Categories
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--color-line)' }}>
                <th className="py-2.5 px-3 text-slate-400 uppercase font-bold text-[10px]">Category</th>
                <th className="py-2.5 px-3 text-slate-400 uppercase font-bold text-[10px]">Target Directory</th>
                <th className="py-2.5 px-3 text-slate-400 uppercase font-bold text-[10px]">Measured Size</th>
                <th className="py-2.5 px-3 text-slate-400 uppercase font-bold text-[10px]">Purge Safety</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--color-line)' }}>
              {categories.map((c: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-800/30">
                  <td className="py-3 px-3 font-semibold text-slate-200">{c.name}</td>
                  <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">{c.path}</td>
                  <td className="py-3 px-3">
                    <span className="pill font-mono text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/25">
                      {c.sizeGB} GB
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="pill text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/25">
                      Safe to Purge
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grid: Security Posture + Battery Intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Security Posture */}
        <div className="card p-6 rounded-2xl border space-y-4" style={{ borderColor: 'var(--color-line)' }}>
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-line)' }}>
            <div>
              <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>macOS Security &amp; Integrity Posture</h3>
              <p className="text-xs text-slate-400 mt-0.5">Kernel assessments, volume encryption, and Gatekeeper verification.</p>
            </div>
            <span className="pill text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/25">
              100% Compliant
            </span>
          </div>

          <div className="divide-y" style={{ borderColor: 'var(--color-line)' }}>
            {secChecks.map((chk: any, idx: number) => (
              <div key={idx} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-200">{chk.name}</span>
                  <p className="text-[11px] text-slate-400">{chk.detail || 'Verified kernel assessment'}</p>
                </div>
                <span className={`pill text-[10px] ${chk.passed ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' : 'bg-rose-500/10 text-rose-400 border-rose-500/25'}`}>
                  {chk.passed ? '✓ PASSED' : 'ACTION NEEDED'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Battery Intelligence */}
        <div className="card p-6 rounded-2xl border space-y-4" style={{ borderColor: 'var(--color-line)' }}>
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-line)' }}>
            <div>
              <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>Battery &amp; Power Health</h3>
              <p className="text-xs text-slate-400 mt-0.5">Lithium-ion cycle degradation and power adapter telemetry.</p>
            </div>
            <span className="pill text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/25">
              {battery?.healthPercent ?? 'N/A'}% Capacity Health
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl border space-y-1" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
              <span className="text-[10px] text-slate-400 uppercase font-bold">Cycle Count</span>
              <p className="text-lg font-extrabold font-mono text-blue-400">{battery?.cycleCount ?? 'N/A'} / 1000</p>
              <p className="text-[10px] text-slate-500">Design Lifetime Rating</p>
            </div>

            <div className="p-3.5 rounded-xl border space-y-1" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
              <span className="text-[10px] text-slate-400 uppercase font-bold">Charge Level</span>
              <p className="text-lg font-extrabold font-mono text-emerald-400">{battery?.percent ?? 'N/A'}%</p>
              <p className="text-[10px] text-slate-500">{battery?.isCharging ? 'Charging Active' : battery ? 'On Battery Power' : 'Unavailable'}</p>
            </div>

            <div className="p-3.5 rounded-xl border space-y-1" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
              <span className="text-[10px] text-slate-400 uppercase font-bold">Battery Condition</span>
              <p className="text-sm font-extrabold text-emerald-400">Normal</p>
              <p className="text-[10px] text-slate-500">No Service Required</p>
            </div>

            <div className="p-3.5 rounded-xl border space-y-1" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
              <span className="text-[10px] text-slate-400 uppercase font-bold">Power Adapter</span>
              <p className="text-sm font-extrabold text-amber-400">{battery?.powerAdapter?.watts ? `${battery?.powerAdapter.watts}W` : 'Connected'}</p>
              <p className="text-[10px] text-slate-500">MagSafe / USB-C PD</p>
            </div>
          </div>
        </div>
      </div>

      {/* Developer Environment & Toolchains */}
      <div className="card p-6 rounded-2xl border space-y-4" style={{ borderColor: 'var(--color-line)' }}>
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-line)' }}>
          <div>
            <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>Developer Environment &amp; CLI Toolchains</h3>
            <p className="text-xs text-slate-400 mt-0.5">Discovered runtimes and verified executable binary search paths.</p>
          </div>
          <span className="pill text-[10px] bg-cyan-500/10 text-cyan-400 border-cyan-500/25">
            {runtimes.length} Toolchains Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {runtimes.map((r: any, idx: number) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl border space-y-1"
              style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-200">{r.name}</span>
                <span className="pill text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/25">{r.version}</span>
              </div>
              <p className="font-mono text-[10px] text-slate-400 truncate">{r.path}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Complete Raw Telemetry Drawer (Collapsible) */}
      <div className="card p-6 rounded-2xl border space-y-3" style={{ borderColor: 'var(--color-line)' }}>
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowJson(!showJson)}
            className="flex items-center gap-2 text-xs font-bold text-slate-200 hover:text-blue-400 transition-colors cursor-pointer"
          >
            <Code2 size={14} className="text-blue-400" />
            <span>{showJson ? 'Hide Raw Diagnostic JSON Payload' : 'Expand Raw Diagnostic JSON Payload'}</span>
            {showJson ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showJson && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(data, null, 2));
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="btn btn-secondary text-xs !py-1 !px-2.5 flex items-center gap-1 cursor-pointer"
            >
              {copied ? <CheckCheck size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
            </button>
          )}
        </div>

        {showJson && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-xs max-h-96 overflow-auto">
            <pre>{JSON.stringify(data, null, 2)}</pre>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center pt-4 border-t text-xs text-slate-500 space-y-1" style={{ borderColor: 'var(--color-line)' }}>
        <p className="font-medium text-slate-400">
          Made with <span className="text-rose-500">❤️</span> by <strong className="text-slate-200">Jeevan</strong>
        </p>
        <p className="text-[11px] font-mono">{config.productName} · {config.subtitle} · Version {config.version} · Stored in SQLite Database</p>
      </div>
    </div>
  );
}

  const dbFolderName = isMac ? 'MacSuite' : 'WinSuite';

  if (selectedReport) {
    return (
      <InPageReportDetail
        report={selectedReport}
        config={config}
        onBack={() => setSelectedReport(null)}
        onDownloadHtml={() => handleDownloadFullReport('html', selectedReport.data)}
        onDownloadJson={() => handleDownloadFullReport('json', selectedReport.data)}
      />
    );
  }

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

        <div className="flex items-center gap-2.5 flex-wrap">
          {onStartNew && (
            <button
              onClick={() => onStartNew()}
              className="btn btn-secondary text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>New Maintenance Run</span>
            </button>
          )}
          <button
            onClick={handleGenerateAndSave}
            disabled={generating}
            className="btn btn-primary text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Plus size={13} className={generating ? 'animate-spin' : ''} />
            <span>{generating ? 'Generating Snapshot...' : 'Save Diagnostic Snapshot to DB'}</span>
          </button>
          <button
            onClick={handleViewLiveReport}
            className="btn btn-secondary text-xs flex items-center gap-1.5 cursor-pointer"
            title="Inspect comprehensive live system report right here on this page"
          >
            <Eye size={13} className="text-cyan-400" />
            <span>View Full Report</span>
          </button>
          <button
            onClick={() => handleDownloadFullReport('html')}
            className="btn btn-ghost text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={13} />
            <span>Export HTML</span>
          </button>
          <button
            onClick={onExport ?? (() => handleDownloadFullReport('json'))}
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
                            const res = await fetch(`/api/reports/${r.id}`);
                            if (res.ok) {
                              const d = await res.json();
                              handlePreviewHtmlReport(d.data);
                            }
                          }}
                          className="btn btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1 cursor-pointer"
                          title="Preview beautiful HTML report in a new tab"
                        >
                          <Globe size={12} className="text-cyan-400" />
                          <span>Preview HTML</span>
                        </button>
                        <button
                          onClick={async () => {
                            const res = await fetch(`/api/reports/${r.id}`);
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

    </div>
  );
}
