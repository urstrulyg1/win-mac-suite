import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, X, Package, Activity, Server, Zap, Clock, HardDrive, Shield, Wifi, Cpu, Code, FileText } from 'lucide-react';

interface SearchResult {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  action?: () => void;
}

interface GlobalSearchProps {
  onNavigate?: (tab: string) => void;
}

// Platform-aware command palette actions
const getCommands = (platform: string): SearchResult[] => {
  const commands: SearchResult[] = [
    { id: 'cmd-health', category: 'Actions', title: 'Run Health Check', subtitle: 'Aggregated system health probe', icon: <Activity size={14} /> },
    { id: 'cmd-processes', category: 'Navigation', title: 'Open Process Monitor', subtitle: 'View active processes', icon: <Activity size={14} />, action: undefined },
    { id: 'cmd-storage', category: 'Navigation', title: 'Open Storage Analyzer', subtitle: 'Disk usage and cleanup', icon: <HardDrive size={14} /> },
    { id: 'cmd-network', category: 'Navigation', title: 'Open Network Doctor', subtitle: 'Connectivity diagnostics', icon: <Wifi size={14} /> },
    { id: 'cmd-security', category: 'Navigation', title: 'Open Security Center', subtitle: 'Security posture and privacy', icon: <Shield size={14} /> },
    { id: 'cmd-developer', category: 'Navigation', title: 'Open Developer Tools', subtitle: 'Dev environment probes', icon: <Code size={14} /> },
    { id: 'cmd-reports', category: 'Navigation', title: 'Open Reports', subtitle: 'System reports and history', icon: <FileText size={14} /> },
  ];

  if (platform === 'windows') {
    commands.push(
      { id: 'cmd-wu', category: 'Windows', title: 'Check Windows Update', subtitle: 'Update status and history', icon: <Cpu size={14} /> },
      { id: 'cmd-sfc', category: 'Windows', title: 'Run SFC Scan', subtitle: 'System File Checker', icon: <Shield size={14} /> },
      { id: 'cmd-dism', category: 'Windows', title: 'Run DISM', subtitle: 'Deployment Image Servicing', icon: <Shield size={14} /> },
      { id: 'cmd-defender', category: 'Windows', title: 'Check Defender', subtitle: 'Antivirus status', icon: <Shield size={14} /> },
      { id: 'cmd-drivers', category: 'Windows', title: 'Open Drivers', subtitle: 'Driver inventory and health', icon: <Cpu size={14} /> },
      { id: 'cmd-services', category: 'Windows', title: 'Open Services', subtitle: 'Windows services', icon: <Server size={14} /> },
    );
  }

  if (platform === 'macos') {
    commands.push(
      { id: 'cmd-swupdate', category: 'macOS', title: 'Check Software Update', subtitle: 'macOS update status', icon: <Cpu size={14} /> },
      { id: 'cmd-filevault', category: 'macOS', title: 'Check FileVault', subtitle: 'Disk encryption status', icon: <Shield size={14} /> },
      { id: 'cmd-sip', category: 'macOS', title: 'Check SIP', subtitle: 'System Integrity Protection', icon: <Shield size={14} /> },
      { id: 'cmd-launchagents', category: 'macOS', title: 'Open LaunchAgents', subtitle: 'Startup service management', icon: <Zap size={14} /> },
    );
  }

  return commands;
};

export default function GlobalSearch({ onNavigate }: GlobalSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [platform, setPlatform] = useState('unknown');
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Detect platform on mount
  useEffect(() => {
    fetch('/api/sysinfo').then(r => r.json()).then(data => {
      if (data?.platform) setPlatform(data.platform);
      else if (data?.os?.platform) setPlatform(data.os.platform);
    }).catch(() => {});
  }, []);

  // Keyboard shortcut: Ctrl/Cmd + K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults([]);
    }
  }, [open]);

  const commands = useMemo(() => getCommands(platform), [platform]);

  // Search function — queries real data endpoints
  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    const found: SearchResult[] = [];
    const lower = q.toLowerCase();

    try {
      // Search in parallel across multiple real data sources
      const [appsRes, procsRes, svcsRes, startupRes, devsRes] = await Promise.allSettled([
        fetch('/api/windows/apps').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/processes').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/windows/services').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/startup-items').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/windows/drivers').then(r => r.ok ? r.json() : null).catch(() => null),
      ]);

      // Applications
      if (appsRes.status === 'fulfilled' && appsRes.value?.applications) {
        for (const app of appsRes.value.applications.slice(0, 200)) {
          if ((app.name || '').toLowerCase().includes(lower) || (app.publisher || '').toLowerCase().includes(lower)) {
            found.push({
              id: `app-${app.name}`,
              category: 'Applications',
              title: app.name,
              subtitle: `${app.version || 'Unknown version'} · ${app.publisher || 'Unknown publisher'}`,
              icon: <Package size={14} />,
            });
            if (found.length >= 5) break;
          }
        }
      }

      // Processes
      if (procsRes.status === 'fulfilled' && procsRes.value?.list) {
        for (const proc of procsRes.value.list) {
          if ((proc.name || '').toLowerCase().includes(lower) || String(proc.pid).includes(q)) {
            found.push({
              id: `proc-${proc.pid}`,
              category: 'Processes',
              title: proc.name,
              subtitle: `PID ${proc.pid} · ${proc.cpu}% CPU · ${proc.mem}% RAM`,
              icon: <Activity size={14} />,
            });
            if (found.filter(r => r.category === 'Processes').length >= 5) break;
          }
        }
      }

      // Services
      if (svcsRes.status === 'fulfilled' && svcsRes.value?.services) {
        for (const svc of svcsRes.value.services) {
          if ((svc.name || '').toLowerCase().includes(lower) || (svc.displayName || '').toLowerCase().includes(lower)) {
            found.push({
              id: `svc-${svc.name}`,
              category: 'Services',
              title: svc.displayName || svc.name,
              subtitle: `${svc.state || svc.status || 'Unknown'} · ${svc.startMode || ''}`,
              icon: <Server size={14} />,
            });
            if (found.filter(r => r.category === 'Services').length >= 5) break;
          }
        }
      }

      // Startup items
      if (startupRes.status === 'fulfilled' && startupRes.value?.list) {
        for (const item of startupRes.value.list) {
          if ((item.name || '').toLowerCase().includes(lower)) {
            found.push({
              id: `startup-${item.id}`,
              category: 'Startup',
              title: item.name,
              subtitle: `${item.type || 'Unknown'} · ${item.enabled ? 'Enabled' : 'Disabled'}`,
              icon: <Zap size={14} />,
            });
          }
        }
      }

      // Drivers
      if (devsRes.status === 'fulfilled' && devsRes.value?.drivers) {
        for (const drv of devsRes.value.drivers) {
          if ((drv.name || '').toLowerCase().includes(lower) || (drv.deviceName || '').toLowerCase().includes(lower)) {
            found.push({
              id: `drv-${drv.name}`,
              category: 'Drivers',
              title: drv.deviceName || drv.name,
              subtitle: `${drv.version || 'Unknown'} · ${drv.provider || 'Unknown provider'}`,
              icon: <Cpu size={14} />,
            });
            if (found.filter(r => r.category === 'Drivers').length >= 5) break;
          }
        }
      }
    } catch {
      // Search failed — show no results rather than fabricating data
    }

    // Also match commands
    const cmdMatches = commands.filter(c =>
      c.title.toLowerCase().includes(lower) || c.subtitle.toLowerCase().includes(lower) || c.category.toLowerCase().includes(lower)
    );
    found.push(...cmdMatches);

    setResults(found.slice(0, 20));
    setLoading(false);
  }, [commands]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, doSearch]);

  if (!open) return null;

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.category] = acc[r.category] || []).push(r);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]" onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-[560px] rounded-2xl shadow-2xl border overflow-hidden"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-line)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--color-line)' }}>
          <Search size={16} style={{ color: 'var(--color-ink-4)' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search apps, processes, services, drivers, commands…"
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: 'var(--color-ink)' }}
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 rounded hover:bg-white/10">
              <X size={14} style={{ color: 'var(--color-ink-4)' }} />
            </button>
          )}
          <kbd className="text-[10px] px-1.5 py-0.5 rounded border font-mono" style={{ borderColor: 'var(--color-line)', color: 'var(--color-ink-4)' }}>ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {loading && (
            <div className="text-center py-6 text-xs" style={{ color: 'var(--color-ink-4)' }}>Searching real system data…</div>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="text-center py-6 text-xs" style={{ color: 'var(--color-ink-4)' }}>
              No results found for "{query}" in real system data.
            </div>
          )}

          {!loading && query.length < 2 && (
            <div className="text-center py-6 text-xs" style={{ color: 'var(--color-ink-4)' }}>
              Type at least 2 characters to search real system data.
            </div>
          )}

          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="mb-2">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-ink-4)' }}>
                {category}
              </div>
              {items.map(item => (
                <button
                  key={item.id}
                  onClick={() => { item.action?.(); setOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors hover:bg-white/5"
                >
                  <span style={{ color: 'var(--color-ink-3)' }}>{item.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate" style={{ color: 'var(--color-ink)' }}>{item.title}</div>
                    <div className="text-[11px] truncate" style={{ color: 'var(--color-ink-4)' }}>{item.subtitle}</div>
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t text-[10px]" style={{ borderColor: 'var(--color-line)', color: 'var(--color-ink-4)' }}>
          <span>Results from real system data only</span>
          <span>⌘K / Ctrl+K to toggle</span>
        </div>
      </div>
    </div>
  );
}
