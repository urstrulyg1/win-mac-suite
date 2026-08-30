/**
 * WinSuite v12.0 — Windows Management Hub
 * Comprehensive Windows system management UI with 45+ features.
 *
 * Grouped sidebar navigation with sub-tabs for every feature area.
 * All data fetched from real backend endpoints. No mock data.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, RefreshCw, Shield, Cpu, HardDrive, Monitor, Activity,
  Search, Download, Trash2, AlertTriangle, CheckCircle, XCircle,
  Info, Loader2, ChevronDown, ChevronRight, Wifi, Database,
  FileText, Code, Settings, Zap, Clock, BarChart3, Server,
  FolderOpen, Battery, Lock, Eye, Heart, Layers, Wrench,
  Bug, Thermometer, Printer, Globe, Key, Container,
  ArrowUpDown, History, Camera, Sparkles, ShieldAlert,
  Network, Radio, Flame, Gauge, MemoryStick, Volume2,
  Bluetooth, Usb, ClipboardList, Timer, Bell, LayoutDashboard,
} from 'lucide-react';

const API = '/api/windows';
const V2 = '/api/windows/v2';

async function fetchJson(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) { return { error: err.message }; }
}

async function postJson(url, body) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch (err) { return { error: err.message }; }
}

// ─── Navigation Structure ───────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    id: 'overview', label: 'Overview', icon: LayoutDashboard,
    tabs: [
      { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
      { id: 'action-center', label: 'Action Center', icon: Bell },
      { id: 'health-check', label: 'Health Check', icon: Heart },
    ],
  },
  {
    id: 'apps', label: 'Applications', icon: Package,
    tabs: [
      { id: 'apps-installed', label: 'Installed Apps', icon: Package },
      { id: 'apps-updates', label: 'App Updates', icon: RefreshCw },
    ],
  },
  {
    id: 'drivers', label: 'Drivers & Devices', icon: Cpu,
    tabs: [
      { id: 'drivers-list', label: 'Drivers', icon: Cpu },
      { id: 'drivers-signing', label: 'Signing Audit', icon: Key },
      { id: 'drivers-problems', label: 'Problem Devices', icon: AlertTriangle },
      { id: 'devices', label: 'Device Manager', icon: Monitor },
      { id: 'drivers-backup', label: 'Backup Status', icon: Database },
    ],
  },
  {
    id: 'system', label: 'System', icon: Settings,
    tabs: [
      { id: 'services', label: 'Services', icon: Server },
      { id: 'services-deps', label: 'Service Dependencies', icon: Layers },
      { id: 'startup', label: 'Startup', icon: Zap },
      { id: 'processes', label: 'Processes', icon: Activity },
      { id: 'tasks', label: 'Scheduled Tasks', icon: Clock },
      { id: 'tasks-analysis', label: 'Task Analysis', icon: ClipboardList },
      { id: 'recovery', label: 'Recovery Center', icon: Wrench },
      { id: 'boot', label: 'Boot Analyzer', icon: Timer },
      { id: 'snapshot', label: 'System Snapshot', icon: Camera },
    ],
  },
  {
    id: 'updates', label: 'Windows Update', icon: Download,
    tabs: [
      { id: 'wu-status', label: 'Update Status', icon: Download },
      { id: 'wu-history', label: 'Update History', icon: History },
      { id: 'wu-failed', label: 'Failed Updates', icon: XCircle },
      { id: 'wu-diagnostics', label: 'Update Repair', icon: Wrench },
    ],
  },
  {
    id: 'storage', label: 'Storage', icon: HardDrive,
    tabs: [
      { id: 'storage-overview', label: 'Storage Overview', icon: HardDrive },
      { id: 'storage-large', label: 'Large Files', icon: FolderOpen },
      { id: 'storage-duplicates', label: 'Duplicates', icon: Layers },
      { id: 'storage-disks', label: 'Disk Health', icon: Gauge },
      { id: 'cleanup', label: 'Cleanup Advisor', icon: Trash2 },
    ],
  },
  {
    id: 'network', label: 'Network', icon: Globe,
    tabs: [
      { id: 'network-adapters', label: 'Adapters', icon: Wifi },
      { id: 'network-connections', label: 'Connections', icon: Network },
      { id: 'network-ports', label: 'Listening Ports', icon: Radio },
      { id: 'network-wifi', label: 'WiFi', icon: Wifi },
      { id: 'network-dns', label: 'DNS', icon: Globe },
      { id: 'network-firewall', label: 'Firewall Rules', icon: Flame },
    ],
  },
  {
    id: 'security', label: 'Security', icon: Shield,
    tabs: [
      { id: 'security-center', label: 'Security Center', icon: Shield },
      { id: 'privacy', label: 'Privacy Audit', icon: Eye },
    ],
  },
  {
    id: 'diagnostics', label: 'Diagnostics', icon: Bug,
    tabs: [
      { id: 'events', label: 'Event Logs', icon: FileText },
      { id: 'reliability', label: 'Reliability', icon: BarChart3 },
      { id: 'bsod', label: 'BSOD / Crashes', icon: Bug },
      { id: 'app-crashes', label: 'App Crashes', icon: AlertTriangle },
      { id: 'integrity', label: 'SFC / DISM', icon: ShieldAlert },
    ],
  },
  {
    id: 'hardware', label: 'Hardware', icon: Monitor,
    tabs: [
      { id: 'hardware-overview', label: 'Overview', icon: Monitor },
      { id: 'hardware-printers', label: 'Printers', icon: Printer },
    ],
  },
  {
    id: 'power', label: 'Power', icon: Battery,
    tabs: [
      { id: 'power-battery', label: 'Battery & Power', icon: Battery },
    ],
  },
  {
    id: 'developer', label: 'Developer', icon: Code,
    tabs: [
      { id: 'dev-tools', label: 'Dev Tools', icon: Code },
      { id: 'dev-environment', label: 'Environment', icon: Settings },
      { id: 'dev-wsl', label: 'WSL', icon: Container },
      { id: 'dev-docker', label: 'Docker', icon: Container },
    ],
  },
];

// ─── Shared UI Components ───────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    healthy: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
    'needs-attention': 'bg-amber-500/10 text-amber-600 border-amber-500/30',
    critical: 'bg-red-500/10 text-red-600 border-red-500/30',
    unavailable: 'bg-gray-500/10 text-gray-500 border-gray-500/30',
    info: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
    limited: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
    Running: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
    Stopped: 'bg-gray-500/10 text-gray-500 border-gray-500/30',
    Working: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
    Ready: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
    Up: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
    true: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
    false: 'bg-red-500/10 text-red-600 border-red-500/30',
    Succeeded: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
    Failed: 'bg-red-500/10 text-red-600 border-red-500/30',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium border inline-block ${map[status] || map[String(status)] || 'bg-gray-500/10 text-gray-500 border-gray-500/30'}`}>
      {String(status)}
    </span>
  );
}

function Spinner({ text = 'Loading...' }) {
  return (
    <div className="flex items-center gap-2 p-6 text-gray-500">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span className="text-sm">{text}</span>
    </div>
  );
}

function ErrBox({ error, note }) {
  return (
    <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20">
      <div className="flex items-center gap-2 text-red-600 text-sm font-medium">
        <XCircle className="w-4 h-4" /> {error || 'Failed to load'}
      </div>
      {note && <p className="text-xs text-gray-500 mt-1">{note}</p>}
    </div>
  );
}

function Unsupported({ feature }) {
  return (
    <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
      <div className="flex items-center gap-2 text-blue-600 text-sm font-medium">
        <Info className="w-4 h-4" /> Feature requires Windows
      </div>
      <p className="text-xs text-gray-500 mt-1">
        '{feature}' uses Windows-specific APIs (PowerShell, CIM/WMI). Connect to a Windows machine to use this feature.
      </p>
    </div>
  );
}

function SearchBar({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="text" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        style={{ borderColor: 'var(--color-line)', background: 'var(--color-surface)' }}
      />
    </div>
  );
}

function Card({ title, icon: Icon, children, badge }) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: 'var(--color-line)' }}>
      {title && (
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4" />} {title}
          {badge && <StatusBadge status={badge} />}
        </h3>
      )}
      {children}
    </div>
  );
}

function DataTable({ data, columns, maxRows = 100 }) {
  if (!data || data.length === 0) {
    return <div className="p-4 text-center text-sm text-gray-400">No data available</div>;
  }
  return (
    <div className="max-h-[55vh] overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 text-xs text-gray-500" style={{ background: 'var(--color-surface)' }}>
          <tr>{columns.map(c => (
            <th key={c.key} className={`text-left p-2 ${c.hidden ? 'hidden md:table-cell' : ''}`}>{c.label}</th>
          ))}</tr>
        </thead>
        <tbody>
          {data.slice(0, maxRows).map((row, i) => (
            <tr key={row.id || i} className="border-t" style={{ borderColor: 'var(--color-line)' }}>
              {columns.map(c => (
                <td key={c.key} className={`p-2 ${c.hidden ? 'hidden md:table-cell' : ''} ${c.mono ? 'font-mono text-xs' : ''}`}>
                  {c.render ? c.render(row[c.key], row) : (row[c.key] != null ? String(row[c.key]) : '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > maxRows && (
        <div className="p-2 text-center text-xs text-gray-400">Showing {maxRows} of {data.length}</div>
      )}
    </div>
  );
}

function useData(endpoint, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(() => {
    setLoading(true);
    fetchJson(endpoint).then(d => { setData(d); setLoading(false); });
  }, [endpoint]);
  useEffect(() => { refresh(); }, [refresh, ...deps]);
  return { data, loading, refresh };
}

function DataWrapper({ data, loading, feature, loadingText }) {
  if (loading) return <Spinner text={loadingText || 'Loading...'} />;
  if (data?.platform === 'unsupported') return <Unsupported feature={feature} />;
  if (data?.error) return <ErrBox error={data.error} />;
  return null;
}

// ─── Dashboard Tab ──────────────────────────────────────────────────────────

function DashboardTab() {
  const { data: ac, loading: acLoading } = useData(`${V2}/action-center`);
  const { data: features, loading: fLoading } = useData(`${API}/features`);
  const { data: health, loading: hLoading } = useData(`${API}/health-check`);

  if (acLoading || fLoading || hLoading) return <Spinner text="Loading dashboard..." />;

  return (
    <div className="space-y-6">
      {features?.os && (
        <Card title="System Information" icon={Monitor}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><span className="text-gray-500">OS:</span> {features.os.caption || 'N/A'}</div>
            <div><span className="text-gray-500">Build:</span> {features.os.build || 'N/A'}</div>
            <div><span className="text-gray-500">Arch:</span> {features.os.architecture || 'N/A'}</div>
            <div><span className="text-gray-500">Computer:</span> {features.computer?.name || 'N/A'}</div>
            <div><span className="text-gray-500">Admin:</span> {features.features?.isAdmin ? '✅' : '❌'}</div>
            <div><span className="text-gray-500">Winget:</span> {features.features?.wingetAvailable ? `✅ ${features.features.wingetVersion}` : '❌'}</div>
            <div><span className="text-gray-500">WSL:</span> {features.features?.wslAvailable ? '✅' : '❌'}</div>
            <div><span className="text-gray-500">Memory:</span> {features.computer?.totalMemoryGB ? `${features.computer.totalMemoryGB} GB` : 'N/A'}</div>
          </div>
        </Card>
      )}

      {ac && ac.items && (
        <Card title="Action Center" icon={Bell} badge={ac.summary?.critical > 0 ? 'critical' : ac.summary?.high > 0 ? 'needs-attention' : 'healthy'}>
          <div className="flex gap-4 mb-3 text-sm">
            {ac.summary?.critical > 0 && <span className="text-red-600 font-medium">🔴 {ac.summary.critical} Critical</span>}
            {ac.summary?.high > 0 && <span className="text-amber-600 font-medium">⚠️ {ac.summary.high} High</span>}
            {ac.summary?.medium > 0 && <span className="text-blue-600">ℹ️ {ac.summary.medium} Medium</span>}
            {ac.summary?.info > 0 && <span className="text-gray-500">💡 {ac.summary.info} Info</span>}
            {ac.items.length === 0 && <span className="text-emerald-600">✅ No issues detected</span>}
          </div>
          <div className="space-y-2">
            {ac.items.slice(0, 10).map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: 'var(--color-surface-2, rgba(0,0,0,0.02))' }}>
                <div className="flex items-center gap-3">
                  <StatusBadge status={item.severity === 'critical' ? 'critical' : item.severity === 'high' ? 'needs-attention' : 'info'} />
                  <div>
                    <span className="text-sm font-medium">{item.title}</span>
                    <span className="text-xs text-gray-400 ml-2">[{item.category}]</span>
                  </div>
                </div>
                <span className="text-xs text-gray-500">{item.action}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {health?.checks && (
        <Card title="Health Check" icon={Heart} badge={health.overall}>
          <div className="space-y-2">
            {health.checks.map((c, i) => (
              <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: 'var(--color-surface-2, rgba(0,0,0,0.02))' }}>
                <div className="flex items-center gap-3">
                  <StatusBadge status={c.status} />
                  <span className="text-sm font-medium">{c.category}</span>
                </div>
                <span className="text-xs text-gray-500">{c.details}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {ac?.platform === 'unsupported' && <Unsupported feature="Action Center" />}
    </div>
  );
}

// ─── Action Center Tab ──────────────────────────────────────────────────────

function ActionCenterTab() {
  const { data, loading, refresh } = useData(`${V2}/action-center`);
  if (loading) return <Spinner text="Aggregating system health..." />;
  if (data?.platform === 'unsupported') return <Unsupported feature="Action Center" />;
  if (data?.error) return <ErrBox error={data.error} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-semibold">Unified Action Center</h3>
        <button onClick={refresh} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>
      {data?.summary && (
        <div className="flex gap-4 text-sm">
          <span className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-600 border border-red-500/20">🔴 {data.summary.critical} Critical</span>
          <span className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20">⚠️ {data.summary.high} High</span>
          <span className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-600 border border-blue-500/20">ℹ️ {data.summary.medium} Medium</span>
          <span className="px-3 py-1.5 rounded-lg bg-gray-500/10 text-gray-500 border border-gray-500/20">💡 {data.summary.info} Info</span>
        </div>
      )}
      <div className="space-y-2">
        {(data?.items || []).map((item, i) => (
          <div key={i} className="flex items-center justify-between p-4 rounded-xl border" style={{ borderColor: 'var(--color-line)' }}>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <StatusBadge status={item.severity === 'critical' ? 'critical' : item.severity === 'high' ? 'needs-attention' : 'info'} />
                <span className="text-xs text-gray-400">{item.category}</span>
              </div>
              <p className="text-sm font-medium">{item.title}</p>
            </div>
            <span className="text-xs text-blue-600">{item.action}</span>
          </div>
        ))}
        {(data?.items || []).length === 0 && (
          <div className="p-6 text-center text-emerald-600">✅ No issues detected — system is healthy</div>
        )}
      </div>
      <p className="text-xs text-gray-400">{data?.note}</p>
    </div>
  );
}

// ─── Generic Tab with endpoint ──────────────────────────────────────────────

function SimpleDataTab({ endpoint, feature, loadingText, render }) {
  const { data, loading, refresh } = useData(endpoint);
  if (loading) return <Spinner text={loadingText || 'Loading...'} />;
  if (data?.platform === 'unsupported') return <Unsupported feature={feature} />;
  if (data?.error) return <ErrBox error={data.error} />;
  return render(data, refresh);
}

// ─── Apps Installed Tab ─────────────────────────────────────────────────────

function AppsInstalledTab() {
  const { data, loading } = useData(`${API}/apps`);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  if (loading) return <Spinner text="Discovering applications..." />;
  if (data?.platform === 'unsupported') return <Unsupported feature="Applications Manager" />;

  const filtered = data?.applications?.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (a.name || '').toLowerCase().includes(q) || (a.publisher || '').toLowerCase().includes(q);
  }) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search applications..." />
        <span className="text-xs text-gray-500 whitespace-nowrap">{filtered.length} apps</span>
      </div>
      {selected && (
        <Card title={selected.name}>
          <button onClick={() => setSelected(null)} className="absolute top-2 right-2 text-gray-400">✕</button>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-gray-500">Publisher:</span> {selected.publisher || 'N/A'}</div>
            <div><span className="text-gray-500">Version:</span> {selected.version || 'N/A'}</div>
            <div><span className="text-gray-500">Size:</span> {selected.sizeMB ? `${selected.sizeMB} MB` : 'N/A'}</div>
            <div><span className="text-gray-500">Type:</span> {selected.packageType}</div>
            <div><span className="text-gray-500">Source:</span> {selected.source}</div>
            <div><span className="text-gray-500">Arch:</span> {selected.architecture || 'N/A'}</div>
            {selected.installLocation && <div className="col-span-2"><span className="text-gray-500">Path:</span> <code className="text-xs">{selected.installLocation}</code></div>}
          </div>
        </Card>
      )}
      <Card>
        <DataTable
          data={filtered}
          maxRows={200}
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'publisher', label: 'Publisher', hidden: true },
            { key: 'version', label: 'Version', mono: true, hidden: true },
            { key: 'packageType', label: 'Type' },
            { key: 'sizeMB', label: 'Size', mono: true, render: (v) => v ? `${v} MB` : '—' },
          ]}
        />
      </Card>
    </div>
  );
}

// ─── App Updates Tab ────────────────────────────────────────────────────────

function AppsUpdatesTab() {
  const { data, loading, refresh } = useData(`${API}/apps/updates`);
  const [updating, setUpdating] = useState(false);
  const [result, setResult] = useState(null);

  if (loading) return <Spinner text="Checking for updates..." />;
  if (data?.platform === 'unsupported') return <Unsupported feature="App Updates" />;
  if (!data?.wingetAvailable) return <ErrBox error="winget not installed" note={data?.note} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{data.updateCount} updates available</h3>
        <button onClick={refresh} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>
      {result && (
        <div className={`p-3 rounded-lg text-sm ${result.success ? 'bg-emerald-500/5' : 'bg-amber-500/5'}`}>
          Updated: {result.totalUpdated || 0} | Failed: {result.totalFailed || 0}
        </div>
      )}
      <Card>
        <DataTable
          data={data.updates || []}
          columns={[
            { key: 'name', label: 'Application' },
            { key: 'installedVersion', label: 'Installed', mono: true, hidden: true },
            { key: 'availableVersion', label: 'Available', mono: true, hidden: true },
            { key: 'source', label: 'Source' },
          ]}
        />
      </Card>
    </div>
  );
}

// ─── Drivers Tab ────────────────────────────────────────────────────────────

function DriversTab() {
  const { data, loading } = useData(`${API}/drivers`);
  const [search, setSearch] = useState('');
  const [filterProblems, setFilterProblems] = useState(false);

  if (loading) return <Spinner text="Discovering drivers..." />;
  if (data?.platform === 'unsupported') return <Unsupported feature="Driver Manager" />;

  const filtered = data?.drivers?.filter(d => {
    if (filterProblems && !d.hasProblem) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (d.device || '').toLowerCase().includes(q) || (d.provider || '').toLowerCase().includes(q);
  }) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <SearchBar value={search} onChange={setSearch} placeholder="Search drivers..." />
        <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={filterProblems} onChange={(e) => setFilterProblems(e.target.checked)} />
          Problems only ({data?.problems || 0})
        </label>
      </div>
      {data?.problems > 0 && (
        <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" /> {data.problems} driver(s) have problems
        </div>
      )}
      <Card>
        <DataTable
          data={filtered}
          maxRows={200}
          columns={[
            { key: 'device', label: 'Device' },
            { key: 'provider', label: 'Provider', hidden: true },
            { key: 'version', label: 'Version', mono: true, hidden: true },
            { key: 'className', label: 'Class' },
            { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v === 'Working' ? 'Working' : 'critical'} /> },
            { key: 'isSigned', label: 'Signed', render: (v) => v ? '✅' : '❓' },
          ]}
        />
      </Card>
    </div>
  );
}

// ─── Security Tab ───────────────────────────────────────────────────────────

function SecurityTab() {
  const { data, loading } = useData(`${API}/security`);
  if (loading) return <Spinner text="Querying Security Center..." />;
  if (data?.platform === 'unsupported') return <Unsupported feature="Security Center" />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card title="🛡️ Microsoft Defender">
        {data?.defender?.error ? <p className="text-xs text-gray-400">{data.defender.error}</p> : (
          <div className="space-y-1 text-sm">
            <div>Enabled: {data?.defender?.enabled ? '✅' : '❌'}</div>
            <div>Real-time: {data?.defender?.realtimeProtection ? '✅' : '❌'}</div>
            <div>Signature: <code className="text-xs">{data?.defender?.signatureVersion || 'N/A'}</code></div>
            <div>Last Scan: {data?.defender?.lastQuickScan || 'N/A'}</div>
          </div>
        )}
      </Card>
      <Card title="🔥 Firewall">
        {data?.firewall?.error ? <p className="text-xs text-gray-400">{data.firewall.error}</p> : (
          <div className="space-y-1 text-sm">
            <div>Domain: {data?.firewall?.domain === true ? '✅' : '❌'}</div>
            <div>Private: {data?.firewall?.private === true ? '✅' : '❌'}</div>
            <div>Public: {data?.firewall?.public === true ? '✅' : '❌'}</div>
          </div>
        )}
      </Card>
      <Card title="🔒 BitLocker">
        <div className="space-y-1 text-sm">
          <div>Status: {data?.bitlocker?.status || 'N/A'}</div>
          <div>Encryption: {data?.bitlocker?.encryption != null ? `${data.bitlocker.encryption}%` : 'N/A'}</div>
        </div>
      </Card>
      <Card title="🔐 TPM & Secure Boot">
        <div className="space-y-1 text-sm">
          <div>TPM: {data?.tpm?.present ? `✅ v${data.tpm.version || '?'}` : '❌ Not present'}</div>
          <div>Secure Boot: {data?.secureBoot?.enabled ? '✅ Enabled' : data?.secureBoot?.enabled === false ? '❌ Disabled' : 'N/A'}</div>
        </div>
      </Card>
    </div>
  );
}

// ─── BSOD Tab ───────────────────────────────────────────────────────────────

function BSODTab() {
  const { data, loading } = useData(`${V2}/bsod`);
  if (loading) return <Spinner text="Analyzing crash data..." />;
  if (data?.platform === 'unsupported') return <Unsupported feature="BSOD Analyzer" />;

  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-sm">
        <span>Total crashes: {data?.summary?.totalCrashes || 0}</span>
        <span>Minidumps: {data?.summary?.totalMinidumps || 0}</span>
        {data?.summary?.latestCrash && <span>Latest: {data.summary.latestCrash}</span>}
      </div>
      {data?.crashes?.length > 0 && (
        <Card title="Crash Events" icon={Bug}>
          <DataTable data={data.crashes} columns={[
            { key: 'date', label: 'Date' },
            { key: 'message', label: 'Details' },
            { key: 'type', label: 'Type' },
          ]} />
        </Card>
      )}
      {data?.minidumps?.length > 0 && (
        <Card title="Minidump Files" icon={FileText}>
          <DataTable data={data.minidumps} columns={[
            { key: 'name', label: 'File' },
            { key: 'sizeKB', label: 'Size (KB)', mono: true },
            { key: 'date', label: 'Date' },
          ]} />
        </Card>
      )}
      {data?.crashes?.length === 0 && <div className="p-4 text-center text-emerald-600 text-sm">✅ No crashes detected</div>}
    </div>
  );
}

// ─── Boot Analyzer Tab ──────────────────────────────────────────────────────

function BootTab() {
  const { data, loading } = useData(`${V2}/boot`);
  if (loading) return <Spinner text="Analyzing boot performance..." />;
  if (data?.platform === 'unsupported') return <Unsupported feature="Boot Analyzer" />;

  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-sm">
        <span>Last boot: {data?.lastBootTime || 'N/A'}</span>
        <span>Uptime: {data?.uptimeHours ? `${data.uptimeHours}h` : 'N/A'}</span>
        {data?.latestBoot && <span>Boot time: <strong>{data.latestBoot.bootTimeSec}s</strong></span>}
      </div>
      {data?.bootHistory?.length > 0 && (
        <Card title="Boot History" icon={Timer}>
          <DataTable data={data.bootHistory} columns={[
            { key: 'date', label: 'Date' },
            { key: 'bootTimeSec', label: 'Boot Time (s)', mono: true },
            { key: 'degradationMs', label: 'Degradation (ms)', mono: true },
          ]} />
        </Card>
      )}
      {data?.startupApps?.length > 0 && (
        <Card title="Startup App Impact" icon={Zap}>
          <DataTable data={data.startupApps} columns={[
            { key: 'name', label: 'Application' },
            { key: 'startTimeMs', label: 'Start Time (ms)', mono: true },
            { key: 'degradationMs', label: 'Degradation (ms)', mono: true },
          ]} />
        </Card>
      )}
    </div>
  );
}

// ─── Storage Overview Tab ───────────────────────────────────────────────────

function StorageOverviewTab() {
  const { data, loading } = useData(`${V2}/storage/overview`);
  if (loading) return <Spinner text="Analyzing storage..." />;
  if (data?.platform === 'unsupported') return <Unsupported feature="Storage Analyzer" />;

  return (
    <div className="space-y-4">
      {data?.drives?.map((d, i) => (
        <Card key={i} title={`Drive ${d.letter} ${d.label ? `(${d.label})` : ''}`}>
          <div className="mb-3">
            <div className="flex justify-between text-sm mb-1">
              <span>{d.usedGB} GB used / {d.totalGB} GB total</span>
              <span>{d.usedPercent}%</span>
            </div>
            <div className="w-full h-3 rounded-full bg-gray-200 overflow-hidden">
              <div className={`h-full rounded-full ${d.usedPercent > 90 ? 'bg-red-500' : d.usedPercent > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${d.usedPercent}%` }} />
            </div>
          </div>
          <div className="text-xs text-gray-500">Free: {d.freeGB} GB | Filesystem: {d.fileSystem}</div>
        </Card>
      ))}
      {data?.tempFiles?.length > 0 && (
        <Card title="Temp Files" icon={Trash2}>
          <div className="space-y-1 text-sm">
            {data.tempFiles.map((t, i) => (
              <div key={i} className="flex justify-between">
                <span className="font-mono text-xs">{t.path}</span>
                <span>{t.sizeMB} MB ({t.fileCount} files)</span>
              </div>
            ))}
          </div>
        </Card>
      )}
      <div className="flex gap-4 text-sm">
        {data?.wuCacheMB && <span>WU Cache: {data.wuCacheMB} MB</span>}
        {data?.crashDumpsMB && <span>Crash Dumps: {data.crashDumpsMB} MB</span>}
      </div>
    </div>
  );
}

// ─── Cleanup Advisor Tab ────────────────────────────────────────────────────

function CleanupTab() {
  const { data, loading, refresh } = useData(`${V2}/cleanup`);
  const [selected, setSelected] = useState(new Set());
  const [cleaning, setCleaning] = useState(false);
  const [result, setResult] = useState(null);

  if (loading) return <Spinner text="Analyzing cleanup opportunities..." />;
  if (data?.platform === 'unsupported') return <Unsupported feature="Cleanup Advisor" />;

  const toggle = (cat) => {
    setSelected(prev => { const n = new Set(prev); n.has(cat) ? n.delete(cat) : n.add(cat); return n; });
  };

  const execute = async () => {
    if (selected.size === 0) return;
    setCleaning(true);
    setResult(await postJson(`${V2}/cleanup/execute`, { confirmed: true, categories: Array.from(selected) }));
    setCleaning(false);
    refresh();
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Safe to Clean</h3>
      <div className="space-y-2">
        {(data?.safeToClean || []).map((item) => (
          <label key={item.category} className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-blue-500/5" style={{ borderColor: 'var(--color-line)' }}>
            <input type="checkbox" checked={selected.has(item.category)} onChange={() => toggle(item.category)} />
            <span className="flex-1 text-sm">{item.category}</span>
            <span className="text-sm font-mono">{item.sizeMB} MB</span>
            <StatusBadge status="healthy" />
          </label>
        ))}
      </div>

      {data?.potentiallyRisky?.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-amber-600">Potentially Risky (Review First)</h3>
          <div className="space-y-2">
            {data.potentiallyRisky.map((item) => (
              <div key={item.category} className="flex items-center gap-3 p-3 rounded-lg border" style={{ borderColor: 'var(--color-line)' }}>
                <span className="flex-1 text-sm">{item.category}</span>
                <span className="text-sm font-mono">{item.sizeMB} MB</span>
                <StatusBadge status="needs-attention" />
              </div>
            ))}
          </div>
        </>
      )}

      <div className="flex items-center justify-between pt-4">
        <span className="text-sm">
          Total safe: <strong>{data?.totalSafeMB || 0} MB</strong> |
          Total risky: <strong>{data?.totalRiskyMB || 0} MB</strong>
        </span>
        {selected.size > 0 && (
          <button onClick={execute} disabled={cleaning} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            {cleaning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Clean {selected.size} categories
          </button>
        )}
      </div>
      {result && (
        <div className={`p-3 rounded-lg text-sm ${result.success ? 'bg-emerald-500/5' : 'bg-amber-500/5'}`}>
          Cleaned: {result.cleaned || 0} | Failed: {result.failed || 0}
        </div>
      )}
    </div>
  );
}

// ─── Network Connections Tab ────────────────────────────────────────────────

function ConnectionsTab() {
  const { data, loading } = useData(`${V2}/network/connections`);
  const [stateFilter, setStateFilter] = useState('');
  if (loading) return <Spinner text="Loading connections..." />;
  if (data?.platform === 'unsupported') return <Unsupported feature="Network Connections" />;

  const filtered = stateFilter
    ? data?.connections?.filter(c => c.state === stateFilter) || []
    : data?.connections || [];

  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-sm flex-wrap">
        <span>Total: {data?.summary?.total || 0}</span>
        <button onClick={() => setStateFilter('')} className={`px-2 py-1 rounded ${!stateFilter ? 'bg-blue-100' : ''}`}>All</button>
        <button onClick={() => setStateFilter('Listen')} className={`px-2 py-1 rounded ${stateFilter === 'Listen' ? 'bg-blue-100' : ''}`}>Listening ({data?.summary?.listening || 0})</button>
        <button onClick={() => setStateFilter('Established')} className={`px-2 py-1 rounded ${stateFilter === 'Established' ? 'bg-blue-100' : ''}`}>Established ({data?.summary?.established || 0})</button>
        <button onClick={() => setStateFilter('TimeWait')} className={`px-2 py-1 rounded ${stateFilter === 'TimeWait' ? 'bg-blue-100' : ''}`}>TIME_WAIT ({data?.summary?.timeWait || 0})</button>
      </div>
      <Card>
        <DataTable data={filtered} columns={[
          { key: 'processName', label: 'Process' },
          { key: 'pid', label: 'PID', mono: true },
          { key: 'localAddress', label: 'Local', mono: true, hidden: true },
          { key: 'localPort', label: 'Port', mono: true },
          { key: 'remoteAddress', label: 'Remote', mono: true, hidden: true },
          { key: 'state', label: 'State', render: (v) => <StatusBadge status={v === 'Established' ? 'Running' : v === 'Listen' ? 'Ready' : 'Stopped'} /> },
        ]} />
      </Card>
    </div>
  );
}

// ─── Hardware Overview Tab ──────────────────────────────────────────────────

function HardwareTab() {
  const { data, loading } = useData(`${V2}/hardware`);
  if (loading) return <Spinner text="Querying hardware..." />;
  if (data?.platform === 'unsupported') return <Unsupported feature="Hardware Diagnostics" />;

  return (
    <div className="space-y-4">
      {data?.cpu?.length > 0 && (
        <Card title="CPU" icon={Cpu}>
          {data.cpu.map((c, i) => (
            <div key={i} className="text-sm space-y-1">
              <div className="font-medium">{c.name}</div>
              <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                <span>Cores: {c.cores}</span>
                <span>Threads: {c.threads}</span>
                <span>Max: {c.maxClockMHz} MHz</span>
                <span>Load: {c.currentLoad}%</span>
                <span>{c.manufacturer}</span>
              </div>
            </div>
          ))}
        </Card>
      )}
      {data?.gpu?.length > 0 && (
        <Card title="GPU" icon={Monitor}>
          {data.gpu.map((g, i) => (
            <div key={i} className="text-sm space-y-1">
              <div className="font-medium">{g.name}</div>
              <div className="text-xs text-gray-500">VRAM: {g.vramMB} MB | Driver: {g.driverVersion} | {g.resolution} @ {g.refreshRate}Hz</div>
            </div>
          ))}
        </Card>
      )}
      {data?.ram && Object.keys(data.ram).length > 0 && (
        <Card title="Memory" icon={MemoryStick}>
          <div className="text-sm space-y-1">
            <div>Total: {data.ram.totalGB} GB | Used: {data.ram.usedGB} GB ({data.ram.usedPercent}%)</div>
            <div>Available: {data.ram.availableGB} GB | Commit: {data.ram.commitTotalGB} GB</div>
            {data.ram.modules?.length > 0 && (
              <div className="mt-2">
                <div className="text-xs text-gray-500 mb-1">Modules:</div>
                {data.ram.modules.map((m, i) => (
                  <div key={i} className="text-xs">{m.slot}: {m.sizeGB} GB @ {m.speedMHz} MHz ({m.manufacturer})</div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}
      {data?.audio?.length > 0 && (
        <Card title="Audio" icon={Volume2}>
          <DataTable data={data.audio} columns={[
            { key: 'name', label: 'Device' },
            { key: 'status', label: 'Status' },
            { key: 'manufacturer', label: 'Manufacturer', hidden: true },
          ]} />
        </Card>
      )}
    </div>
  );
}

// ─── Privacy Tab ────────────────────────────────────────────────────────────

function PrivacyTab() {
  const { data, loading } = useData(`${V2}/privacy`);
  if (loading) return <Spinner text="Auditing privacy settings..." />;
  if (data?.platform === 'unsupported') return <Unsupported feature="Privacy Audit" />;

  const items = [
    { label: 'Camera Access', ...data?.camera, icon: '📷' },
    { label: 'Microphone Access', ...data?.microphone, icon: '🎙️' },
    { label: 'Location Access', ...data?.location, icon: '📍' },
    { label: 'Advertising ID', ...data?.advertising, icon: '📢' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => (
          <Card key={item.label} title={`${item.icon} ${item.label}`}>
            <div className="text-sm">
              <StatusBadge status={item.enabled ? 'true' : 'false'} />
              <span className="ml-2">{item.enabled ? 'Enabled' : 'Disabled'}</span>
            </div>
          </Card>
        ))}
        {data?.diagnostics && (
          <Card title="📊 Telemetry Level">
            <div className="text-sm">
              Level: {data.diagnostics.levelName || 'Unknown'} ({data.diagnostics.level})
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── Power/Battery Tab ──────────────────────────────────────────────────────

function PowerTab() {
  const { data, loading } = useData(`${V2}/power`);
  if (loading) return <Spinner text="Querying power settings..." />;
  if (data?.platform === 'unsupported') return <Unsupported feature="Power & Battery" />;

  return (
    <div className="space-y-4">
      <Card title="Battery" icon={Battery}>
        {data?.battery?.present ? (
          <div className="space-y-1 text-sm">
            <div>Status: {data.battery.status}</div>
            <div>Charge: {data.battery.chargePercent}%</div>
            {data.battery.healthPercent && <div>Health: {data.battery.healthPercent}%</div>}
            {data.battery.designCapacity && <div>Design: {data.battery.designCapacity} mWh</div>}
            {data.battery.fullChargeCapacity && <div>Full Charge: {data.battery.fullChargeCapacity} mWh</div>}
          </div>
        ) : <p className="text-sm text-gray-500">No battery detected (desktop)</p>}
      </Card>
      <Card title="Power Plan" icon={Zap}>
        <div className="text-sm">
          <div>Active: {data?.powerPlan?.active || 'N/A'}</div>
          {data?.powerPlan?.available && (
            <div className="mt-2">
              <div className="text-xs text-gray-500 mb-1">Available Plans:</div>
              {(Array.isArray(data.powerPlan.available) ? data.powerPlan.available : []).map((p, i) => (
                <div key={i} className="text-xs font-mono">{p}</div>
              ))}
            </div>
          )}
        </div>
      </Card>
      {data?.powerPlan?.wakeArmedDevices?.length > 0 && (
        <Card title="Wake-Armed Devices">
          <div className="space-y-1 text-sm">
            {data.powerPlan.wakeArmedDevices.map((d, i) => (
              <div key={i} className="text-xs">{d}</div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── WSL Tab ────────────────────────────────────────────────────────────────

function WSLTab() {
  const { data, loading } = useData(`${V2}/wsl`);
  if (loading) return <Spinner text="Checking WSL..." />;
  if (data?.platform === 'unsupported') return <Unsupported feature="WSL Manager" />;
  if (!data?.installed) return <ErrBox error="WSL is not installed" note={data?.note} />;

  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-sm">
        <span>✅ WSL Installed</span>
        <span>{data.distroCount} distro(s)</span>
        {data.defaultDistro && <span>Default: {data.defaultDistro}</span>}
      </div>
      <Card>
        <DataTable data={data.distros || []} columns={[
          { key: 'name', label: 'Distribution' },
          { key: 'state', label: 'State', render: (v) => <StatusBadge status={v === 'Running' ? 'Running' : 'Stopped'} /> },
          { key: 'version', label: 'Version' },
        ]} />
      </Card>
    </div>
  );
}

// ─── Docker Tab ─────────────────────────────────────────────────────────────

function DockerTab() {
  const { data, loading } = useData(`${V2}/docker`);
  if (loading) return <Spinner text="Checking Docker..." />;
  if (data?.platform === 'unsupported') return <Unsupported feature="Docker Health" />;
  if (!data?.engine?.running) return <ErrBox error="Docker is not running" note={data?.engine?.error} />;

  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-sm">
        <span>✅ Docker {data.engine.version}</span>
        <span>Containers: {data.containerCount || 0} ({data.runningCount || 0} running)</span>
        <span>Images: {data.imageCount || 0}</span>
      </div>
      {data?.containers?.length > 0 && (
        <Card title="Containers" icon={Container}>
          <DataTable data={data.containers} columns={[
            { key: 'name', label: 'Name' },
            { key: 'status', label: 'Status' },
            { key: 'image', label: 'Image', hidden: true },
            { key: 'ports', label: 'Ports', mono: true, hidden: true },
          ]} />
        </Card>
      )}
      {data?.images?.length > 0 && (
        <Card title="Images" icon={Layers}>
          <DataTable data={data.images} columns={[
            { key: 'repository', label: 'Repository' },
            { key: 'size', label: 'Size' },
            { key: 'id', label: 'ID', mono: true, hidden: true },
          ]} />
        </Card>
      )}
    </div>
  );
}

// ─── Reliability Tab ────────────────────────────────────────────────────────

function ReliabilityTab() {
  const { data, loading } = useData(`${V2}/reliability`);
  if (loading) return <Spinner text="Loading reliability timeline..." />;
  if (data?.platform === 'unsupported') return <Unsupported feature="Reliability Monitor" />;

  return (
    <div className="space-y-4">
      {data?.stabilityIndex != null && (
        <div className="flex items-center gap-3">
          <span className="text-sm">Stability Index:</span>
          <span className={`text-lg font-bold ${data.stabilityIndex >= 8 ? 'text-emerald-600' : data.stabilityIndex >= 5 ? 'text-amber-600' : 'text-red-600'}`}>
            {data.stabilityIndex}/10
          </span>
        </div>
      )}
      {(data?.days || []).map((day) => (
        <Card key={day.date} title={day.date} badge={day.errors > 0 ? 'critical' : day.warnings > 0 ? 'needs-attention' : 'healthy'}>
          <div className="flex gap-4 text-xs mb-2">
            {day.errors > 0 && <span className="text-red-600">{day.errors} errors</span>}
            {day.warnings > 0 && <span className="text-amber-600">{day.warnings} warnings</span>}
            <span className="text-gray-500">{day.info} info</span>
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {(day.events || []).slice(0, 5).map((e, i) => (
              <div key={i} className="text-xs flex items-center gap-2">
                <span className="text-gray-400">{e.time}</span>
                <span className={e.severity === 'error' ? 'text-red-600' : e.severity === 'warning' ? 'text-amber-600' : 'text-gray-600'}>
                  {e.source}: {(e.message || '').slice(0, 80)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── System Integrity Tab ───────────────────────────────────────────────────

function IntegrityTab() {
  const { data, loading } = useData(`${V2}/integrity`);
  const [running, setRunning] = useState(null);
  const [result, setResult] = useState(null);

  if (loading) return <Spinner text="Checking system integrity..." />;
  if (data?.platform === 'unsupported') return <Unsupported feature="SFC / DISM" />;

  const runSFC = async () => {
    setRunning('sfc');
    setResult(await postJson(`${V2}/integrity/sfc`, { confirmed: true }));
    setRunning(null);
  };
  const runDISM = async (action) => {
    setRunning(`dism-${action}`);
    setResult(await postJson(`${V2}/integrity/dism`, { confirmed: true, action }));
    setRunning(null);
  };

  return (
    <div className="space-y-4">
      <Card title="DISM Check Health">
        {data?.dismCheckHealth?.noCorruption ? (
          <div className="text-sm text-emerald-600">✅ No component store corruption detected</div>
        ) : data?.dismCheckHealth?.corruptionDetected ? (
          <div className="text-sm text-red-600">❌ Component store corruption detected</div>
        ) : (
          <div className="text-xs text-gray-400 font-mono">{data?.dismCheckHealth?.output?.slice(0, 300) || 'N/A'}</div>
        )}
      </Card>

      <Card title="Actions">
        <div className="flex flex-wrap gap-2">
          <button onClick={runSFC} disabled={!!running}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5">
            {running === 'sfc' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
            Run SFC /scannow
          </button>
          <button onClick={() => runDISM('CheckHealth')} disabled={!!running}
            className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 disabled:opacity-50">
            DISM CheckHealth
          </button>
          <button onClick={() => runDISM('ScanHealth')} disabled={!!running}
            className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 disabled:opacity-50">
            DISM ScanHealth
          </button>
          <button onClick={() => runDISM('RestoreHealth')} disabled={!!running}
            className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 disabled:opacity-50">
            DISM RestoreHealth
          </button>
        </div>
        {running && <p className="text-xs text-gray-500 mt-2">Running {running}... this may take several minutes.</p>}
        {result && (
          <div className={`mt-3 p-3 rounded-lg text-sm ${result.success ? 'bg-emerald-500/5' : 'bg-red-500/5'}`}>
            {result.success ? '✅' : '❌'} {result.action || 'SFC'} completed in {result.duration}s
            {result.output && <pre className="mt-2 text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">{result.output.slice(0, 500)}</pre>}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Recovery Tab ───────────────────────────────────────────────────────────

function RecoveryTab() {
  const { data, loading } = useData(`${V2}/recovery`);
  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState(null);

  if (loading) return <Spinner text="Loading recovery data..." />;
  if (data?.platform === 'unsupported') return <Unsupported feature="Recovery Center" />;

  const createRP = async () => {
    setCreating(true);
    setCreateResult(await postJson(`${V2}/recovery/restore`, { confirmed: true, description: 'WinSuite Restore Point' }));
    setCreating(false);
  };

  return (
    <div className="space-y-4">
      <Card title="System Restore" icon={Wrench}>
        <div className="text-sm mb-2">
          Status: {data?.systemRestore?.enabled ? '✅ Enabled' : '❌ Disabled'}
          {data?.systemRestore?.pointCount && ` | ${data.systemRestore.pointCount} points`}
        </div>
        <button onClick={createRP} disabled={creating}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5">
          {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
          Create Restore Point
        </button>
        {createResult && (
          <div className={`mt-2 text-sm ${createResult.success ? 'text-emerald-600' : 'text-red-600'}`}>
            {createResult.success ? '✅ Restore point created' : `❌ ${createResult.error}`}
          </div>
        )}
      </Card>

      {data?.restorePoints?.length > 0 && (
        <Card title="Restore Points">
          <DataTable data={data.restorePoints} columns={[
            { key: 'date', label: 'Date' },
            { key: 'description', label: 'Description' },
            { key: 'type', label: 'Type' },
            { key: 'sequenceNumber', label: '#', mono: true },
          ]} />
        </Card>
      )}

      <Card title="Recovery Environment">
        <div className="text-sm">
          {data?.recoveryEnvironment?.enabled ? '✅ Enabled' : '❌ Disabled'}
          {data?.recoveryEnvironment?.output && (
            <pre className="mt-2 text-xs font-mono whitespace-pre-wrap">{data.recoveryEnvironment.output.slice(0, 300)}</pre>
          )}
        </div>
      </Card>

      <Card title="Boot Configuration">
        <pre className="text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
          {data?.bootConfig?.output?.slice(0, 500) || 'N/A'}
        </pre>
      </Card>
    </div>
  );
}

// ─── Generic Table Tab (for simpler features) ─────────────────────────────

function GenericTableTab({ endpoint, feature, loadingText, title, columns, dataKey, maxRows }) {
  const { data, loading, refresh } = useData(endpoint);
  if (loading) return <Spinner text={loadingText || 'Loading...'} />;
  if (data?.platform === 'unsupported') return <Unsupported feature={feature} />;
  if (data?.error) return <ErrBox error={data.error} />;

  const items = data?.[dataKey] || data?.items || data?.tasks || data?.adapters || data?.services || data?.ports || data?.connections || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title} {data?.count != null && <span className="text-gray-400 font-normal">({data.count})</span>}</h3>
        <button onClick={refresh} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>
      <Card>
        <DataTable data={items} columns={columns} maxRows={maxRows || 100} />
      </Card>
      {data?.source && <p className="text-xs text-gray-400">Source: {data.source}</p>}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function WindowsManagementHub() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [expandedGroups, setExpandedGroups] = useState(new Set(['overview']));

  const toggleGroup = (id) => {
    setExpandedGroups(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const renderTab = () => {
    switch (activeTab) {
      // Overview
      case 'dashboard': return <DashboardTab />;
      case 'action-center': return <ActionCenterTab />;
      case 'health-check': return <DashboardTab />;

      // Apps
      case 'apps-installed': return <AppsInstalledTab />;
      case 'apps-updates': return <AppsUpdatesTab />;

      // Drivers
      case 'drivers-list': return <DriversTab />;
      case 'drivers-signing': return (
        <GenericTableTab endpoint={`${V2}/drivers/signing`} feature="Driver Signing Audit" loadingText="Auditing driver signatures..."
          title="Driver Signing Audit" dataKey="drivers"
          columns={[
            { key: 'device', label: 'Device' },
            { key: 'provider', label: 'Provider', hidden: true },
            { key: 'version', label: 'Version', mono: true, hidden: true },
            { key: 'isSigned', label: 'Signed', render: (v) => v ? '✅' : '❌' },
            { key: 'signer', label: 'Signer', hidden: true },
          ]}
        />
      );
      case 'drivers-problems': return (
        <GenericTableTab endpoint={`${V2}/drivers/problems`} feature="Problem Devices" loadingText="Scanning for problem devices..."
          title="Problem Devices" dataKey="devices"
          columns={[
            { key: 'name', label: 'Device' },
            { key: 'className', label: 'Class' },
            { key: 'errorCode', label: 'Error Code', mono: true },
            { key: 'manufacturer', label: 'Manufacturer', hidden: true },
          ]}
        />
      );
      case 'devices': return (
        <GenericTableTab endpoint={`${API}/devices`} feature="Device Manager" loadingText="Grouping devices..."
          title="Device Groups" dataKey="groups"
          columns={[
            { key: 'className', label: 'Class' },
            { key: 'count', label: 'Count' },
            { key: 'problems', label: 'Problems', render: (v) => v > 0 ? <span className="text-red-600">{v}</span> : '0' },
          ]}
        />
      );
      case 'drivers-backup': return (
        <SimpleDataTab endpoint={`${V2}/drivers/backup`} feature="Driver Backup" loadingText="Checking backup status..."
          render={(data) => (
            <div className="space-y-4">
              <Card title="Driver Store">
                <div className="text-sm space-y-1">
                  <div>Exists: {data.exists ? '✅' : '❌'}</div>
                  {data.driverStoreCount && <div>Driver packages: {data.driverStoreCount}</div>}
                  {data.sizeMB && <div>Size: {data.sizeMB} MB</div>}
                </div>
              </Card>
              <Card title="Exported Backups">
                <div className="text-sm">
                  <div>Backup folder: {data.exportPathExists ? '✅ Found' : '❌ Not found'}</div>
                  {data.exportCount != null && <div>Backups: {data.exportCount}</div>}
                </div>
              </Card>
            </div>
          )}
        />
      );

      // System
      case 'services': return (
        <GenericTableTab endpoint={`${API}/services`} feature="Services Manager" loadingText="Querying services..."
          title="Windows Services" dataKey="services"
          columns={[
            { key: 'name', label: 'Name', mono: true },
            { key: 'displayName', label: 'Display Name', hidden: true },
            { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
            { key: 'startupType', label: 'Startup', hidden: true },
          ]}
        />
      );
      case 'services-deps': return (
        <GenericTableTab endpoint={`${V2}/services/deps`} feature="Service Dependencies" loadingText="Analyzing service dependencies..."
          title="Service Dependencies" dataKey="services"
          columns={[
            { key: 'name', label: 'Service', mono: true },
            { key: 'displayName', label: 'Name', hidden: true },
            { key: 'state', label: 'State', render: (v) => <StatusBadge status={v} /> },
            { key: 'startMode', label: 'Startup' },
            { key: 'dependencies', label: 'Dependencies', render: (v) => Array.isArray(v) ? v.join(', ') || 'None' : '—' },
          ]}
        />
      );
      case 'startup': return (
        <GenericTableTab endpoint={`${API}/startup`} feature="Startup Manager" loadingText="Loading startup items..."
          title="Startup Items" dataKey="items"
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'type', label: 'Type' },
            { key: 'enabled', label: 'Enabled', render: (v) => v ? '✅' : '❌' },
            { key: 'location', label: 'Location', hidden: true },
          ]}
        />
      );
      case 'processes': return (
        <GenericTableTab endpoint={`${API}/processes`} feature="Process Manager" loadingText="Loading processes..."
          title="Processes (Top 100 by Memory)" dataKey="processes"
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'pid', label: 'PID', mono: true },
            { key: 'workingSetMB', label: 'Memory (MB)', mono: true },
            { key: 'cpuSeconds', label: 'CPU (s)', mono: true, hidden: true },
            { key: 'threads', label: 'Threads', hidden: true },
            { key: 'parentPid', label: 'Parent', mono: true, hidden: true },
          ]}
        />
      );
      case 'tasks': return (
        <GenericTableTab endpoint={`${API}/scheduled-tasks`} feature="Task Scheduler" loadingText="Loading scheduled tasks..."
          title="Scheduled Tasks" dataKey="tasks"
          columns={[
            { key: 'name', label: 'Task' },
            { key: 'path', label: 'Path', hidden: true },
            { key: 'state', label: 'State', render: (v) => <StatusBadge status={v === 'Ready' ? 'Ready' : v === 'Running' ? 'Running' : 'Stopped'} /> },
            { key: 'lastRun', label: 'Last Run', hidden: true },
          ]}
        />
      );
      case 'tasks-analysis': return (
        <GenericTableTab endpoint={`${V2}/tasks/analysis`} feature="Task Analysis" loadingText="Analyzing scheduled tasks..."
          title="Task Analysis" dataKey="tasks"
          columns={[
            { key: 'name', label: 'Task' },
            { key: 'state', label: 'State' },
            { key: 'lastResult', label: 'Last Result', mono: true },
            { key: 'hasError', label: 'Error', render: (v) => v ? '❌' : '—' },
          ]}
        />
      );
      case 'recovery': return <RecoveryTab />;
      case 'boot': return <BootTab />;
      case 'snapshot': return (
        <SimpleDataTab endpoint={`${V2}/snapshot`} feature="System Snapshot" loadingText="Creating snapshot..."
          render={(data, refresh) => (
            <div className="space-y-4">
              <button onClick={refresh} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5" /> Refresh Snapshot
              </button>
              {data?.snapshot && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card title="OS"><pre className="text-xs font-mono">{JSON.stringify(data.snapshot.os, null, 2)}</pre></Card>
                  <Card title="Apps"><div className="text-sm">{data.snapshot.apps?.count || 0} applications installed</div></Card>
                  <Card title="Services"><div className="text-sm">{data.snapshot.services?.running || 0} running / {data.snapshot.services?.total || 0} total</div></Card>
                  <Card title="Drivers"><div className="text-sm">{data.snapshot.drivers?.total || 0} drivers ({data.snapshot.drivers?.problems || 0} problems)</div></Card>
                </div>
              )}
            </div>
          )}
        />
      );

      // Updates
      case 'wu-status': return (
        <SimpleDataTab endpoint={`${API}/update`} feature="Windows Update" loadingText="Checking Windows Update..."
          render={(data) => (
            <div className="space-y-4">
              <div className="flex gap-4 text-sm">
                <span>Pending: {data?.pendingCount ?? 'N/A'}</span>
                <span>Reboot Required: {data?.rebootRequired ? '⚠️ Yes' : '✅ No'}</span>
              </div>
              {data?.pendingUpdates?.length > 0 && (
                <Card title="Pending Updates">
                  <DataTable data={data.pendingUpdates} columns={[
                    { key: 'title', label: 'Update' },
                    { key: 'sizeMB', label: 'Size (MB)', mono: true },
                    { key: 'isSecurity', label: 'Security', render: (v) => v ? '🔴' : '—' },
                  ]} />
                </Card>
              )}
            </div>
          )}
        />
      );
      case 'wu-history': return (
        <GenericTableTab endpoint={`${V2}/update/history`} feature="Update History" loadingText="Loading update history..."
          title="Windows Update History" dataKey="history"
          columns={[
            { key: 'title', label: 'Update' },
            { key: 'date', label: 'Date' },
            { key: 'result', label: 'Result', render: (v) => <StatusBadge status={v} /> },
          ]}
        />
      );
      case 'wu-failed': return (
        <GenericTableTab endpoint={`${V2}/update/failed`} feature="Failed Updates" loadingText="Loading failed updates..."
          title="Failed Updates" dataKey="failed"
          columns={[
            { key: 'title', label: 'Update' },
            { key: 'date', label: 'Date' },
            { key: 'hResult', label: 'Error Code', mono: true },
          ]}
        />
      );
      case 'wu-diagnostics': return (
        <SimpleDataTab endpoint={`${V2}/update/diagnostics`} feature="Update Diagnostics" loadingText="Running update diagnostics..."
          render={(data) => (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold">Update Diagnostics</h3>
                <StatusBadge status={data?.allOk ? 'healthy' : 'needs-attention'} />
              </div>
              <div className="space-y-2">
                {(data?.checks || []).map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: 'var(--color-line)' }}>
                    <div className="flex items-center gap-2">
                      {c.ok ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
                      <span className="text-sm">{c.name}</span>
                    </div>
                    <span className="text-xs text-gray-500">{c.details}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        />
      );

      // Storage
      case 'storage-overview': return <StorageOverviewTab />;
      case 'storage-large': return (
        <GenericTableTab endpoint={`${API}/storage/large`} feature="Large Files" loadingText="Scanning for large files..."
          title="Large Files (>100 MB)" dataKey="files"
          columns={[
            { key: 'name', label: 'File' },
            { key: 'sizeMB', label: 'Size (MB)', mono: true },
            { key: 'modified', label: 'Modified', hidden: true },
            { key: 'path', label: 'Path', mono: true, hidden: true },
          ]}
        />
      );
      case 'storage-duplicates': return (
        <GenericTableTab endpoint={`${V2}/storage/duplicates`} feature="Duplicate Files" loadingText="Scanning for duplicates..."
          title="Duplicate Files" dataKey="duplicates"
          columns={[
            { key: 'name', label: 'File' },
            { key: 'sizeMB', label: 'Size (MB)', mono: true },
            { key: 'count', label: 'Copies' },
          ]}
        />
      );
      case 'storage-disks': return (
        <SimpleDataTab endpoint={`${V2}/storage/disks`} feature="Disk Health" loadingText="Checking disk health..."
          render={(data) => (
            <div className="space-y-4">
              {(data?.disks || []).map((d) => (
                <Card key={d.id} title={d.name} badge={d.healthStatus === 'Healthy' ? 'healthy' : 'needs-attention'}>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Model: {d.model || 'N/A'}</div>
                    <div>Type: {d.mediaType}</div>
                    <div>Size: {d.sizeGB} GB</div>
                    <div>Bus: {d.busType || 'N/A'}</div>
                    <div>Health: {d.healthStatus}</div>
                    <div>Status: {d.operationalStatus}</div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        />
      );
      case 'cleanup': return <CleanupTab />;

      // Network
      case 'network-adapters': return (
        <GenericTableTab endpoint={`${API}/network`} feature="Network Adapters" loadingText="Loading adapters..."
          title="Network Adapters" dataKey="adapters"
          columns={[
            { key: 'name', label: 'Adapter' },
            { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
            { key: 'ipv4', label: 'IPv4', mono: true },
            { key: 'linkSpeed', label: 'Speed', hidden: true },
            { key: 'gateway', label: 'Gateway', mono: true, hidden: true },
          ]}
        />
      );
      case 'network-connections': return <ConnectionsTab />;
      case 'network-ports': return (
        <GenericTableTab endpoint={`${V2}/network/ports`} feature="Listening Ports" loadingText="Loading ports..."
          title="Listening Ports" dataKey="ports"
          columns={[
            { key: 'port', label: 'Port', mono: true },
            { key: 'processName', label: 'Process' },
            { key: 'pid', label: 'PID', mono: true },
            { key: 'address', label: 'Address', mono: true, hidden: true },
            { key: 'commandLine', label: 'Command', hidden: true },
          ]}
        />
      );
      case 'network-wifi': return (
        <SimpleDataTab endpoint={`${V2}/network/wifi`} feature="WiFi Analyzer" loadingText="Scanning WiFi networks..."
          render={(data) => (
            <div className="space-y-4">
              {data.currentSSID && <div className="text-sm">Connected: <strong>{data.currentSSID}</strong></div>}
              <Card>
                <DataTable data={data.networks || []} columns={[
                  { key: 'ssid', label: 'SSID' },
                  { key: 'signal', label: 'Signal %', mono: true },
                  { key: 'channel', label: 'Channel', mono: true },
                  { key: 'band', label: 'Band', hidden: true },
                  { key: 'authentication', label: 'Security', hidden: true },
                ]} />
              </Card>
            </div>
          )}
        />
      );
      case 'network-dns': return (
        <SimpleDataTab endpoint={`${V2}/network/dns`} feature="DNS Diagnostics" loadingText="Running DNS diagnostics..."
          render={(data) => (
            <div className="space-y-4">
              {data.configuredDNS?.length > 0 && (
                <Card title="Configured DNS">
                  {data.configuredDNS.map((d, i) => (
                    <div key={i} className="text-sm">{d.interface}: {(d.servers || []).join(', ')}</div>
                  ))}
                </Card>
              )}
              {data.resolutionTests?.length > 0 && (
                <Card title="Resolution Tests">
                  <DataTable data={data.resolutionTests} columns={[
                    { key: 'domain', label: 'Domain' },
                    { key: 'success', label: 'Success', render: (v) => v ? '✅' : '❌' },
                    { key: 'timeMs', label: 'Time (ms)', mono: true },
                    { key: 'addresses', label: 'Addresses', render: (v) => Array.isArray(v) ? v.join(', ') : '—', hidden: true },
                  ]} />
                </Card>
              )}
              <div className="text-sm">
                Gateway: {data.gatewayReachable ? '✅ Reachable' : '❌ Unreachable'} ({data.gatewayAddress || 'N/A'})
              </div>
            </div>
          )}
        />
      );
      case 'network-firewall': return (
        <GenericTableTab endpoint={`${V2}/network/firewall`} feature="Firewall Rules" loadingText="Loading firewall rules..."
          title="Firewall Rules" dataKey="rules" maxRows={200}
          columns={[
            { key: 'name', label: 'Rule' },
            { key: 'direction', label: 'Direction' },
            { key: 'action', label: 'Action' },
            { key: 'enabled', label: 'Enabled', render: (v) => v ? '✅' : '❌' },
            { key: 'program', label: 'Program', hidden: true },
          ]}
        />
      );

      // Security
      case 'security-center': return <SecurityTab />;
      case 'privacy': return <PrivacyTab />;

      // Diagnostics
      case 'events': return (
        <SimpleDataTab endpoint={`${API}/events`} feature="Event Analyzer" loadingText="Analyzing event logs..."
          render={(data) => (
            <div className="space-y-4">
              {data.summary && (
                <div className="flex gap-4 text-sm">
                  <span className="text-red-600">Critical: {data.summary.criticalCount || 0}</span>
                  <span className="text-amber-600">Errors: {data.summary.errorCount || 0}</span>
                  <span className="text-gray-500">{data.summary.dateRange}</span>
                </div>
              )}
              {data.critical?.length > 0 && (
                <Card title="Critical Events" icon={AlertTriangle}>
                  <DataTable data={data.critical} columns={[
                    { key: 'time', label: 'Time' },
                    { key: 'source', label: 'Source' },
                    { key: 'id', label: 'ID', mono: true },
                    { key: 'message', label: 'Message' },
                  ]} />
                </Card>
              )}
              {data.errors?.length > 0 && (
                <Card title="Error Events">
                  <DataTable data={data.errors} columns={[
                    { key: 'time', label: 'Time' },
                    { key: 'source', label: 'Source' },
                    { key: 'id', label: 'ID', mono: true },
                    { key: 'message', label: 'Message' },
                  ]} />
                </Card>
              )}
            </div>
          )}
        />
      );
      case 'reliability': return <ReliabilityTab />;
      case 'bsod': return <BSODTab />;
      case 'app-crashes': return (
        <SimpleDataTab endpoint={`${V2}/crashes/apps`} feature="App Crashes" loadingText="Analyzing application crashes..."
          render={(data) => (
            <div className="space-y-4">
              <div className="text-sm">Total crashes: {data?.totalCrashes || 0} | Applications affected: {data?.applications?.length || 0}</div>
              <Card>
                <DataTable data={data?.applications || []} columns={[
                  { key: 'application', label: 'Application' },
                  { key: 'crashCount', label: 'Crashes' },
                  { key: 'latestCrash', label: 'Latest Crash' },
                ]} />
              </Card>
            </div>
          )}
        />
      );
      case 'integrity': return <IntegrityTab />;

      // Hardware
      case 'hardware-overview': return <HardwareTab />;
      case 'hardware-printers': return (
        <SimpleDataTab endpoint={`${V2}/printers`} feature="Printer Center" loadingText="Loading printers..."
          render={(data) => (
            <div className="space-y-4">
              <div className="text-sm">Spooler: {data?.spooler?.status === 'Running' ? '✅ Running' : '❌ ' + (data?.spooler?.status || 'Unknown')}</div>
              <Card>
                <DataTable data={data?.printers || []} columns={[
                  { key: 'name', label: 'Printer' },
                  { key: 'driver', label: 'Driver' },
                  { key: 'port', label: 'Port', mono: true },
                  { key: 'shared', label: 'Shared', render: (v) => v ? '✅' : '—' },
                ]} />
              </Card>
            </div>
          )}
        />
      );

      // Power
      case 'power-battery': return <PowerTab />;

      // Developer
      case 'dev-tools': return (
        <GenericTableTab endpoint={`${API}/developer`} feature="Developer Tools" loadingText="Scanning developer tools..."
          title="Developer Environment" dataKey="tools"
          columns={[
            { key: 'name', label: 'Tool' },
            { key: 'installed', label: 'Installed', render: (v) => v ? '✅' : '❌' },
            { key: 'version', label: 'Version', mono: true },
            { key: 'healthy', label: 'Health', render: (v) => v ? '✅' : '—' },
          ]}
        />
      );
      case 'dev-environment': return (
        <SimpleDataTab endpoint={`${V2}/environment`} feature="Environment Health" loadingText="Analyzing environment..."
          render={(data) => (
            <div className="space-y-4">
              <div className="flex gap-4 text-sm">
                <span>PATH entries: {data?.pathEntries || 0}</span>
                {data?.invalidPaths > 0 && <span className="text-red-600">Invalid paths: {data.invalidPaths}</span>}
              </div>
              <Card title="PATH Analysis">
                <DataTable data={data?.path || []} columns={[
                  { key: 'path', label: 'Path', mono: true },
                  { key: 'exists', label: 'Exists', render: (v) => v ? '✅' : '❌' },
                ]} maxRows={50} />
              </Card>
              {data?.envVars && Object.keys(data.envVars).length > 0 && (
                <Card title="Environment Variables">
                  <div className="space-y-1 text-sm">
                    {Object.entries(data.envVars).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2">
                        <code className="text-xs font-bold">{k}</code>
                        <span className="text-xs font-mono text-gray-500">{v.value}</span>
                        {v.exists ? '✅' : '❌'}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}
        />
      );
      case 'dev-wsl': return <WSLTab />;
      case 'dev-docker': return <DockerTab />;

      default: return <div className="p-4 text-center text-gray-400">Tab not implemented: {activeTab}</div>;
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6" /> Windows Management Center
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          45+ features — Apps, Drivers, Security, Storage, Network, Diagnostics, Recovery, and more.
        </p>
      </div>

      <div className="flex gap-4">
        {/* Sidebar Navigation */}
        <nav className="w-56 shrink-0 hidden lg:block">
          <div className="sticky top-4 space-y-1 max-h-[80vh] overflow-y-auto pr-2">
            {NAV_GROUPS.map(group => {
              const Icon = group.icon;
              const isExpanded = expandedGroups.has(group.id);
              const isGroupActive = group.tabs.some(t => t.id === activeTab);
              return (
                <div key={group.id}>
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isGroupActive ? 'text-blue-600 bg-blue-500/5' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-500/5'
                    }`}
                  >
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    <Icon className="w-4 h-4" />
                    {group.label}
                  </button>
                  {isExpanded && (
                    <div className="ml-6 space-y-0.5 mt-0.5">
                      {group.tabs.map(tab => {
                        const TabIcon = tab.icon;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors ${
                              activeTab === tab.id
                                ? 'bg-blue-600 text-white font-medium'
                                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-500/5'
                            }`}
                          >
                            <TabIcon className="w-3 h-3" />
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        {/* Mobile Tab Bar */}
        <div className="lg:hidden w-full overflow-x-auto mb-4">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="w-full p-2 rounded-lg border text-sm"
            style={{ borderColor: 'var(--color-line)' }}
          >
            {NAV_GROUPS.map(g => (
              <optgroup key={g.id} label={g.label}>
                {g.tabs.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {renderTab()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
