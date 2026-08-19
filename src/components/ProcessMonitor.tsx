import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity, Search, RefreshCw, Cpu, MemoryStick, Filter, ShieldAlert, ChevronRight } from 'lucide-react';
import type { SystemProcess } from '../platform/types';
import InspectorModal, { type InspectorData } from './InspectorModal';

export default function ProcessMonitor() {
  const [processes, setProcesses] = useState<SystemProcess[]>([]);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'cpu' | 'mem'>('cpu');
  const [loading, setLoading] = useState(false);
  const [inspectItem, setInspectItem] = useState<InspectorData | null>(null);

  const fetchProcesses = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:3131/api/processes');
      if (res.ok) {
        const data = await res.json();
        setProcesses(data.list || []);
      }
    } catch {
      // Fallback sample processes
      setProcesses([
        { pid: 1420, name: 'System', cpu: 2.1, mem: 1.4, user: 'SYSTEM' },
        { pid: 2840, name: 'node.exe', cpu: 1.8, mem: 3.2, user: 'User' },
        { pid: 3120, name: 'chrome.exe', cpu: 4.5, mem: 8.9, user: 'User' },
        { pid: 4890, name: 'explorer.exe', cpu: 0.8, mem: 2.1, user: 'User' },
        { pid: 5120, name: 'Code.exe', cpu: 1.2, mem: 6.4, user: 'User' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcesses();
    const id = setInterval(fetchProcesses, 4000);
    return () => clearInterval(id);
  }, []);

  const sortedList = useMemo(() => {
    let list = [...processes];
    if (filterMode === 'cpu') {
      list.sort((a, b) => b.cpu - a.cpu);
    } else if (filterMode === 'mem') {
      list.sort((a, b) => b.mem - a.mem);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || String(p.pid).includes(q));
    }
    return list;
  }, [processes, search, filterMode]);

  return (
    <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <InspectorModal data={inspectItem} onClose={() => setInspectItem(null)} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25">
              <Activity size={12} /> Resource Monitor
            </span>
            <span className="pill" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-ink-3)', borderColor: 'var(--color-line)' }}>
              Click Any Process Row To Inspect
            </span>
          </div>
          <h1 className="text-hero font-extrabold tracking-tight" style={{ color: 'var(--color-ink)' }}>
            Active Processes
          </h1>
          <p className="mt-1 text-[14px]" style={{ color: 'var(--color-ink-3)' }}>
            Inspect active processes and their real-time CPU and physical memory consumption.
          </p>
        </div>

        <button
          onClick={fetchProcesses}
          disabled={loading}
          className="btn btn-ghost text-xs cursor-pointer"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin-smooth' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 min-w-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter processes by name or PID..."
              className="field pl-9 py-2 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setFilterMode('cpu')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5`}
              style={
                filterMode === 'cpu'
                  ? { backgroundColor: '#3b82f6', color: '#fff', borderColor: '#3b82f6' }
                  : { backgroundColor: 'var(--color-surface-2)', color: 'var(--color-ink-3)', borderColor: 'var(--color-line)' }
              }
            >
              <Cpu size={12} />
              <span>Top CPU</span>
            </button>
            <button
              onClick={() => setFilterMode('mem')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5`}
              style={
                filterMode === 'mem'
                  ? { backgroundColor: '#7c3aed', color: '#fff', borderColor: '#7c3aed' }
                  : { backgroundColor: 'var(--color-surface-2)', color: 'var(--color-ink-3)', borderColor: 'var(--color-line)' }
              }
            >
              <MemoryStick size={12} />
              <span>Top Memory</span>
            </button>
          </div>
        </div>
      </div>

      {/* Processes Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b text-[11px] font-bold uppercase tracking-wider" style={{ borderColor: 'var(--color-line)', color: 'var(--color-ink-4)' }}>
                <th className="p-3.5 pl-5">PID</th>
                <th className="p-3.5">Process Name</th>
                <th className="p-3.5">User</th>
                <th className="p-3.5 text-right">CPU %</th>
                <th className="p-3.5 pr-5 text-right">Memory %</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--color-line)' }}>
              {sortedList.map((p) => (
                <tr
                  key={p.pid}
                  onClick={() =>
                    setInspectItem({
                      title: p.name,
                      category: `PID ${p.pid}`,
                      badge: `${p.cpu}% CPU · ${p.mem}% RAM`,
                      subtitle: `Executing under user account: ${p.user}`,
                      details: [
                        { label: 'Process Identifier (PID)', value: p.pid },
                        { label: 'Process Name', value: p.name },
                        { label: 'User Context', value: p.user },
                        { label: 'CPU Allocation', value: `${p.cpu}%` },
                        { label: 'Memory Allocation', value: `${p.mem}%` },
                        { label: 'Command Invocation', value: p.command || p.name, isCode: true },
                      ],
                      command: `ps -p ${p.pid} -o pid,user,%cpu,%mem,command`,
                    })
                  }
                  className="transition-colors hover:bg-slate-500/10 cursor-pointer"
                >
                  <td className="p-3.5 pl-5 font-mono text-[11px]" style={{ color: 'var(--color-ink-4)' }}>{p.pid}</td>
                  <td className="p-3.5 font-bold" style={{ color: 'var(--color-ink)' }}>{p.name}</td>
                  <td className="p-3.5 font-mono text-[11px]" style={{ color: 'var(--color-ink-3)' }}>{p.user}</td>
                  <td className="p-3.5 text-right font-mono font-bold" style={{ color: p.cpu > 15 ? '#ef4444' : 'var(--color-ink)' }}>
                    {p.cpu}%
                  </td>
                  <td className="p-3.5 pr-5 text-right font-mono font-bold" style={{ color: p.mem > 15 ? '#a855f7' : 'var(--color-ink)' }}>
                    {p.mem}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
