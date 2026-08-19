import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ToggleLeft, ToggleRight, Search, RefreshCw, FileText, ChevronRight } from 'lucide-react';
import type { StartupItem } from '../platform/types';
import { usePlatform } from '../platform';
import InspectorModal, { type InspectorData } from './InspectorModal';

export default function StartupManager() {
  const { config, isMac } = usePlatform();
  const [items, setItems] = useState<StartupItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [inspectItem, setInspectItem] = useState<InspectorData | null>(null);

  const fetchStartup = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:3131/api/startup-items');
      if (res.ok) {
        const data = await res.json();
        setItems(data.list || []);
      }
    } catch {
      // Fallback items based on platform
      setItems(isMac ? [
        { id: '1', name: 'Docker Desktop', location: '~/Library/LaunchAgents', type: 'LaunchAgent', path: '/Applications/Docker.app', enabled: true, impact: 'High' },
        { id: '2', name: 'Raycast', location: 'Login Items', type: 'LoginItem', path: '/Applications/Raycast.app', enabled: true, impact: 'Low' },
        { id: '3', name: 'OneDrive Agent', location: '/Library/LaunchDaemons', type: 'LaunchDaemon', path: '/Applications/OneDrive.app', enabled: true, impact: 'Medium' },
      ] : [
        { id: '1', name: 'Microsoft Teams', location: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', type: 'Registry', path: 'C:\\Program Files\\WindowsApps\\MSTeams.exe', enabled: true, impact: 'High' },
        { id: '2', name: 'Spotify Web Helper', location: 'HKCU\\Run', type: 'Registry', path: 'C:\\Users\\Spotify.exe', enabled: true, impact: 'Medium' },
        { id: '3', name: 'SecurityHealthSystray', location: 'HKLM\\Run', type: 'Registry', path: 'C:\\Windows\\System32\\SecurityHealthSystray.exe', enabled: true, impact: 'Low' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStartup();
  }, [isMac]);

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, enabled: !it.enabled } : it)),
    );
  };

  const filteredItems = items.filter((it) =>
    it.name.toLowerCase().includes(search.toLowerCase()) ||
    it.location.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <InspectorModal data={inspectItem} onClose={() => setInspectItem(null)} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25">
              <Sparkles size={12} /> {isMac ? 'Login Items & Daemons' : 'Startup Applications'}
            </span>
            <span className="pill" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-ink-3)', borderColor: 'var(--color-line)' }}>
              Click Any Row To Inspect Config
            </span>
          </div>
          <h1 className="text-hero font-extrabold tracking-tight" style={{ color: 'var(--color-ink)' }}>
            Startup &amp; Background Manager
          </h1>
          <p className="mt-1 text-[14px]" style={{ color: 'var(--color-ink-3)' }}>
            {isMac
              ? 'Manage Login Items, LaunchAgents, and LaunchDaemons that initialize on macOS boot.'
              : 'Audit and control Windows Startup apps, Registry Run keys, and Scheduled Tasks.'}
          </p>
        </div>

        <button
          onClick={fetchStartup}
          disabled={loading}
          className="btn btn-ghost text-xs cursor-pointer"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin-smooth' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="card p-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search startup applications, helper tools, or registry paths..."
            className="field pl-9 py-2 text-xs"
          />
        </div>
      </div>

      {/* Items List */}
      <div className="card divide-y overflow-hidden" style={{ borderColor: 'var(--color-line)' }}>
        {filteredItems.map((item) => (
          <div
            key={item.id}
            onClick={() =>
              setInspectItem({
                title: item.name,
                category: item.type || (isMac ? 'LaunchAgent' : 'Registry Run Key'),
                badge: `${item.impact} Boot Impact`,
                badgeType: item.impact === 'High' ? 'warning' : 'success',
                subtitle: `Location: ${item.location}`,
                details: [
                  { label: 'Item Name', value: item.name },
                  { label: 'Configuration Path', value: item.location, isCode: true },
                  { label: 'Executable Destination', value: item.path, isCode: true },
                  { label: 'Initialization State', value: item.enabled ? 'Enabled on Boot' : 'Disabled' },
                  { label: 'Performance Impact', value: `${item.impact} impact on system boot latency` },
                ],
                command: isMac ? `plutil -p "${item.location}/${item.name}.plist"` : `Get-ItemProperty -Path "${item.location}"`,
                actionButton: {
                  label: item.enabled ? 'Disable Item' : 'Enable Item',
                  onClick: () => toggleItem(item.id),
                },
              })
            }
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 transition-colors hover:bg-slate-500/10 cursor-pointer"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div
                className="p-2 rounded-xl shrink-0 mt-0.5 border"
                style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)', color: 'var(--color-ink-2)' }}
              >
                <FileText size={16} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold truncate" style={{ color: 'var(--color-ink)' }}>
                    {item.name}
                  </p>
                  <span
                    className={`text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded border ${
                      item.impact === 'High'
                        ? 'bg-red-500/10 text-red-500 border-red-500/25'
                        : item.impact === 'Medium'
                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/25'
                        : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25'
                    }`}
                  >
                    {item.impact} Impact
                  </span>
                </div>
                <p className="text-xs font-mono mt-0.5 truncate" style={{ color: 'var(--color-ink-4)' }}>
                  {item.location}
                </p>
                <p className="text-[11px] font-mono mt-0.5 truncate opacity-70" style={{ color: 'var(--color-ink-3)' }}>
                  {item.path}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleItem(item.id);
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer"
                style={
                  item.enabled
                    ? { backgroundColor: 'rgba(34,197,94,0.12)', color: '#22c55e', borderColor: 'rgba(34,197,94,0.30)' }
                    : { backgroundColor: 'var(--color-surface-2)', color: 'var(--color-ink-4)', borderColor: 'var(--color-line)' }
                }
              >
                {item.enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                <span>{item.enabled ? 'Enabled' : 'Disabled'}</span>
              </button>
              <ChevronRight size={14} className="text-slate-400" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
