import { useState, useEffect } from 'react';
import {
  Sparkles, ToggleLeft, ToggleRight, Search, RefreshCw, FileText,
  ChevronRight
} from 'lucide-react';
import { usePlatform } from '../platform';
import InspectorModal, { type InspectorData } from './InspectorModal';

export default function StartupManager() {
  const { isMac } = usePlatform();
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inspectItem, setInspectItem] = useState<InspectorData | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const fetchStartup = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/startup-items');
      if (res.ok) {
        const data = await res.json();
        setItems(data.list || []);
      } else {
        setError(`Startup items unavailable (HTTP ${res.status})`);
        setItems([]);
      }
    } catch {
      setError('Unable to reach startup manager backend.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStartup();
  }, []);

  const toggleItem = async (item: any) => {
    const nextState = !item.enabled;
    setItems((prev: any[]) =>
      prev.map((it: any) => (it.id === item.id ? { ...it, enabled: nextState } : it))
    );

    try {
      await fetch('/api/actions/toggle-startup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemName: item.name, enable: nextState }),
      });
      setActionMsg(`${nextState ? 'Enabled' : 'Disabled'} ${item.name}`);
    } catch {}
  };

  const filteredItems = items.filter((it: any) =>
    (it.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (it.location || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <InspectorModal data={inspectItem} onClose={() => setInspectItem(null)} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25">
              <Sparkles size={12} /> Startup &amp; Background Items Manager
            </span>
            <span className="pill" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-ink-3)', borderColor: 'var(--color-line)' }}>
              {isMac ? 'Startup Impact & "Why is this running?" Active' : 'Windows Startup & Service Impact Active'}
            </span>
          </div>
          <h1 className="text-hero font-extrabold tracking-tight" style={{ color: 'var(--color-ink)' }}>
            Startup &amp; Background Items Manager
          </h1>
          <p className="mt-1 text-[14px]" style={{ color: 'var(--color-ink-3)' }}>
            {isMac
              ? 'Audit Login Items, LaunchAgents, and LaunchDaemons. Learn exactly why every background service is running and temporarily disable resource hogs without deleting configuration files.'
              : 'Audit Windows Startup Applications, Registry Run Keys, and background services. Learn why startup tasks are active and disable resource hogs safely.'}
          </p>
        </div>

        <button onClick={fetchStartup} disabled={loading} className="btn btn-ghost text-xs cursor-pointer">
          <RefreshCw size={13} className={loading ? 'animate-spin-smooth' : ''} />
          <span>Refresh Startup List</span>
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-500 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-slate-400 hover:text-slate-200">×</button>
        </div>
      )}

      {actionMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-500 flex items-center justify-between">
          <span>✓ {actionMsg}</span>
          <button onClick={() => setActionMsg(null)} className="text-slate-400 hover:text-slate-200">×</button>
        </div>
      )}

      {/* Search Toolbar */}
      <div className="card p-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isMac ? 'Search startup items, helper tools, or LaunchAgents...' : 'Search startup apps, registry entries, or services...'}
            className="field pl-9 py-2 text-xs"
          />
        </div>
      </div>

      {/* Items List */}
      <div className="card divide-y overflow-hidden" style={{ borderColor: 'var(--color-line)' }}>
        {filteredItems.map((item: any) => (
          <div
            key={item.id}
            onClick={() =>
              setInspectItem({
                title: item.name,
                category: item.type || (isMac ? 'LaunchAgent' : 'Startup App'),
                badge: `${item.impact} Boot Impact`,
                badgeType: item.impact === 'High' ? 'warning' : 'success',
                subtitle: `Location: ${item.location}`,
                details: [
                  { label: 'Item Name', value: item.name },
                  { label: 'Why Is This Running?', value: item.whyIsItRunning || 'Background daemon' },
                  { label: 'Configuration Path', value: item.path || item.location, isCode: true },
                  { label: 'Initialization State', value: item.enabled ? 'Enabled on Boot' : 'Temporarily Disabled' },
                  { label: 'Startup Impact', value: `${item.impact} boot latency burden` },
                ],
                actionButton: {
                  label: item.enabled ? 'Disable Temporarily' : 'Enable Item',
                  onClick: () => toggleItem(item),
                },
              })
            }
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 transition-colors hover:bg-slate-500/10 cursor-pointer"
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
                <p className="text-xs text-slate-300 mt-1 font-medium">
                  💡 {item.whyIsItRunning || 'Background service'}
                </p>
                <p className="text-[10px] font-mono text-slate-500 mt-0.5 truncate">
                  {item.location}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleItem(item);
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
