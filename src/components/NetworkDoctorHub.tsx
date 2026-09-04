import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { tabTransition } from '../motion';
import {
  Wifi, RefreshCw,
  Bluetooth, Share2, Globe, Zap, Check, AlertTriangle, Shield
} from 'lucide-react';
import { usePlatform } from '../platform';
import InspectorModal, { type InspectorData } from './InspectorModal';
import { actionsApi } from '../utils/api';

export default function NetworkDoctorHub() {
  const { isMac } = usePlatform();
  const [subTab, setSubTab] = useState<'doctor' | 'wifi' | 'bluetooth' | 'dns' | 'firewall'>('doctor');
  const [doctorData, setDoctorData] = useState<any>(null);
  const [btData, setBtData] = useState<any>(null);
  const [wifiData, setWifiData] = useState<any>(null);
  const [dnsData, setDnsData] = useState<any>(null);
  const [firewallData, setFirewallData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [flushingDNS, setFlushingDNS] = useState(false);
  const [dnsFlushed, setDnsFlushed] = useState(false);
  const [inspectItem, setInspectItem] = useState<InspectorData | null>(null);

  const fetchNetworkData = async () => {
    setLoading(true);
    try {
      const [dRes, bRes, wRes, dnsRes, fwRes] = await Promise.allSettled([
        fetch('/api/network/doctor').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/network/bluetooth').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/network/wifi-intelligence').then(r => r.ok ? r.json() : null).catch(() => null),
        isMac ? fetch('/api/network/dns-diagnostics').then(r => r.ok ? r.json() : null).catch(() => null) : Promise.resolve(null),
        isMac ? fetch('/api/network/firewall-rules').then(r => r.ok ? r.json() : null).catch(() => null) : Promise.resolve(null),
      ]);

      if (dRes.status === 'fulfilled' && dRes.value) setDoctorData(dRes.value);
      if (bRes.status === 'fulfilled' && bRes.value) setBtData(bRes.value);
      if (wRes.status === 'fulfilled' && wRes.value) setWifiData(wRes.value);
      if (dnsRes.status === 'fulfilled' && dnsRes.value) setDnsData(dnsRes.value);
      if (fwRes.status === 'fulfilled' && fwRes.value) setFirewallData(fwRes.value);
    } catch {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNetworkData();
  }, []);

  const handleFlushDNS = async () => {
    setFlushingDNS(true);
    try {
      const res = await actionsApi.runPhase({ commandId: isMac ? 'mac.flushdns' : 'win.flushdns', confirmed: true });
      if (res.ok) {
        setDnsFlushed(true);
        await fetchNetworkData();
      }
    } finally {
      setFlushingDNS(false);
    }
  };

  return (
    <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <InspectorModal data={inspectItem} onClose={() => setInspectItem(null)} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25">
              <Wifi size={12} /> Network &amp; Wireless Intelligence
            </span>
            <span className="pill" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-ink-3)', borderColor: 'var(--color-line)' }}>
              Step-by-step Troubleshooting Pipeline Active
            </span>
          </div>
          <h1 className="text-hero font-extrabold tracking-tight" style={{ color: 'var(--color-ink)' }}>
            Network Doctor, Bluetooth &amp; AirDrop
          </h1>
          <p className="mt-1 text-[14px]" style={{ color: 'var(--color-ink-3)' }}>
            Step-by-step diagnostics testing Wi-Fi, Gateway, DNS, Internet, and Captive Portal triggers, alongside Bluetooth and AirDrop health.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleFlushDNS}
            disabled={flushingDNS}
            className="btn btn-primary text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Zap size={13} />
            <span>{flushingDNS ? 'Flushing DNS...' : dnsFlushed ? 'DNS Flushed ✓' : 'Flush DNS & Captive Portal'}</span>
          </button>
          <button onClick={fetchNetworkData} disabled={loading} className="btn btn-ghost text-xs cursor-pointer">
            <RefreshCw size={13} className={loading ? 'animate-spin-smooth' : ''} />
            <span>Re-test Network</span>
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl border overflow-x-auto" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
        {[
          { id: 'doctor' as const,    label: '6-Step Network Doctor',       icon: Globe,     color: '#60a5fa' },
          { id: 'wifi' as const,      label: 'Wi-Fi Intelligence & History', icon: Wifi,     color: '#22d3ee' },
          { id: 'bluetooth' as const, label: 'Bluetooth & AirDrop Doctor',  icon: Bluetooth, color: '#a78bfa' },
          ...(isMac ? [
            { id: 'dns' as const,       label: 'DNS Diagnostics',             icon: Globe,     color: '#f59e0b' },
            { id: 'firewall' as const,  label: 'Firewall Rules',             icon: Shield,    color: '#10b981' },
          ] : []),
        ].map((t) => {
          const isSel = subTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer"
              style={
                isSel
                  ? { backgroundColor: '#3b82f6', color: '#fff', boxShadow: '0 2px 8px rgba(59,130,246,0.3)' }
                  : { color: 'var(--color-ink-3)' }
              }
            >
              <t.icon size={14} style={{ color: isSel ? '#fff' : t.color }} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sub-tab Views */}
      <AnimatePresence mode="wait">
        {subTab === 'doctor' && (
          <motion.div key="doctor" {...tabTransition} className="card p-6 space-y-6">
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--color-line)' }}>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>
                  Automated Troubleshooting Pipeline
                </h3>
                <p className="text-xs text-slate-400">Verifying each link in the connectivity chain from physical interface to internet gateway.</p>
              </div>
              <span className={`pill text-xs font-bold ${
                doctorData?.workflow && doctorData.workflow.some((w: any) => w.passed === false)
                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/25'
                  : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25'
              }`}>
                {doctorData?.workflow
                  ? `${doctorData.workflow.filter((w: any) => w.passed !== false).length} of ${doctorData.workflow.length} Checks Passing`
                  : 'Checking Pipeline...'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(doctorData?.workflow || []).map((wf: any) => {
                const passed = wf.passed !== false;
                return (
                  <div
                    key={wf.step}
                    className="p-4 rounded-xl border space-y-2 flex items-start gap-3"
                    style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${
                      passed
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25'
                        : 'bg-amber-500/10 text-amber-500 border-amber-500/25'
                    }`}>
                      {passed ? <Check size={14} /> : <AlertTriangle size={14} />}
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase">Step {wf.step}</span>
                      <h4 className="text-xs font-bold" style={{ color: 'var(--color-ink)' }}>
                        {wf.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-mono">{wf.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded-xl border text-center" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                <span className="text-[10px] uppercase text-slate-400 font-bold">Local IP</span>
                <p className="text-xs font-mono font-bold text-blue-500 mt-0.5">{doctorData?.ip4 || 'UNAVAILABLE'}</p>
              </div>
              <div className="p-3 rounded-xl border text-center" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                <span className="text-[10px] uppercase text-slate-400 font-bold">Gateway</span>
                <p className="text-xs font-mono font-bold text-blue-400 mt-0.5">{doctorData?.gateway || 'UNAVAILABLE'}</p>
              </div>
              <div className="p-3 rounded-xl border text-center" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                <span className="text-[10px] uppercase text-slate-400 font-bold">DNS Latency</span>
                <p className="text-xs font-mono font-bold text-emerald-500 mt-0.5">{doctorData?.dnsLatencyMs ?? 'UNAVAILABLE'}{doctorData?.dnsLatencyMs != null ? ' ms' : ''}</p>
              </div>
              <div className="p-3 rounded-xl border text-center" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                <span className="text-[10px] uppercase text-slate-400 font-bold">Packet Loss</span>
                <p className="text-xs font-mono font-bold text-emerald-500 mt-0.5">{doctorData?.packetLossPct ?? 'UNAVAILABLE'}{doctorData?.packetLossPct != null ? '%' : ''}</p>
              </div>
            </div>
          </motion.div>
        )}

        {subTab === 'wifi' && (
          <motion.div key="wifi" {...tabTransition} className="card p-6 space-y-6">
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--color-line)' }}>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>
                  Connected: {wifiData?.currentSsid ?? 'UNAVAILABLE'}
                </h3>
                <p className="text-xs text-slate-400">Signal: {wifiData?.signalStrengthDbm ?? wifiData?.signalQuality ?? 'UNAVAILABLE'}{wifiData?.signalStrengthDbm != null || wifiData?.signalQuality != null ? (wifiData?.signalStrengthDbm != null ? ' dBm' : '%') : ''} · Channel: {wifiData?.channel ?? 'UNAVAILABLE'}</p>
              </div>
              <span className="pill bg-emerald-500/10 text-emerald-500 border-emerald-500/25 text-xs font-bold">
                {wifiData?.reliabilityScore ?? 'UNAVAILABLE'}{wifiData?.reliabilityScore != null ? '% Network Reliability' : ' Network Reliability: UNAVAILABLE'}
              </span>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Known &amp; Saved Networks Reliability History
              </h4>
              <div className="divide-y" style={{ borderColor: 'var(--color-line)' }}>
                {(wifiData?.savedNetworks || []).map((net: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-xs font-bold" style={{ color: 'var(--color-ink)' }}>{net.ssid}</p>
                      <p className="text-[10px] text-slate-500">{net.security} · Last active: {net.lastUsed}</p>
                    </div>
                    <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25 text-xs font-mono font-bold">
                      {net.reliability}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {subTab === 'bluetooth' && (
          <motion.div key="bluetooth" {...tabTransition} className="space-y-6">
            {/* AirDrop Doctor */}
            <div className="card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/25 flex items-center justify-center">
                    <Share2 size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold" style={{ color: 'var(--color-ink)' }}>
                      AirDrop Doctor
                    </h3>
                    <p className="text-xs text-slate-400">Visibility: {btData?.airDrop?.visibilityMode ?? 'UNAVAILABLE'} · Daemon: {btData?.airDrop?.sharingDaemonStatus ?? 'UNAVAILABLE'}</p>
                  </div>
                </div>
                <span className="pill bg-slate-500/10 text-slate-400 border-slate-500/25 text-[10px]">
                  {btData?.airDrop ? 'AirDrop Probed' : 'AirDrop: UNAVAILABLE'}
                </span>
              </div>
              <p className="text-xs text-slate-300">{btData?.airDrop?.verdict ?? 'UNAVAILABLE: AirDrop probe has not returned data.'}</p>
            </div>

            {/* Bluetooth Paired Devices */}
            <div className="card p-6 space-y-4">
              <h3 className="text-sm font-bold" style={{ color: 'var(--color-ink)' }}>
                Bluetooth Controller &amp; Paired Devices
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(btData?.bluetooth?.pairedDevices || []).map((dev: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border flex items-center justify-between gap-3"
                    style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
                  >
                    <div>
                      <h4 className="text-xs font-bold" style={{ color: 'var(--color-ink)' }}>
                        {dev.name}
                      </h4>
                      <p className="text-[10px] text-slate-500">{dev.type} · Battery: {dev.batteryPct}%</p>
                    </div>
                    <span
                      className={`pill text-[10px] ${
                        dev.connected
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25'
                          : 'bg-slate-500/10 text-slate-400 border-slate-500/25'
                      }`}
                    >
                      {dev.connected ? 'Connected' : 'Paired'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {subTab === 'dns' && (
          <motion.div key="dns" {...tabTransition} className="card p-6 space-y-6">
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--color-line)' }}>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>
                  DNS Diagnostics &amp; Latency Test
                </h3>
                <p className="text-xs text-slate-400">Verifying configured servers and measuring resolution speed across major root domains.</p>
              </div>
              {dnsData?.avgLatencyMs !== null && (
                <span className="pill bg-emerald-500/10 text-emerald-500 border-emerald-500/25 text-xs font-bold">
                  Average Latency: {dnsData?.avgLatencyMs} ms
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Servers list */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Configured DNS Nameservers</h4>
                <div className="space-y-2">
                  {Array.isArray(dnsData?.configuredServers) && dnsData.configuredServers.length > 0 ? (
                    dnsData.configuredServers.map((srv: string, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border flex items-center gap-3 text-xs"
                        style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
                      >
                        <Globe size={14} className="text-blue-500" />
                        <span className="font-mono font-bold" style={{ color: 'var(--color-ink)' }}>{srv}</span>
                        <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25 text-[10px] ml-auto">Active</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-xs text-slate-400 border border-dashed rounded-xl" style={{ borderColor: 'var(--color-line)' }}>
                      No custom DNS nameservers configured. Using system default.
                    </div>
                  )}
                </div>
              </div>

              {/* Resolution tests */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Hostname Resolution Speed</h4>
                <div className="space-y-2">
                  {Array.isArray(dnsData?.testResults) ? (
                    dnsData.testResults.map((t: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border flex items-center justify-between gap-3 text-xs"
                        style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
                      >
                        <div>
                          <span className="font-bold" style={{ color: 'var(--color-ink)' }}>{t.host}</span>
                          <p className="text-[10px] text-slate-400">DNS Resolution Test</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-500">{t.latencyMs !== null ? `${t.latencyMs} ms` : 'N/A'}</span>
                          <span className={`pill text-[10px] ${t.resolved ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25' : 'bg-red-500/10 text-red-500 border-red-500/25'}`}>
                            {t.resolved ? 'Resolved' : 'Failed'}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-xs text-slate-400 border border-dashed rounded-xl" style={{ borderColor: 'var(--color-line)' }}>
                      No resolution test results.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {subTab === 'firewall' && (
          <motion.div key="firewall" {...tabTransition} className="card p-6 space-y-6">
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--color-line)' }}>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>
                  Application Firewall Rules
                </h3>
                <p className="text-xs text-slate-400">Inspect socketfilterfw rules and connection permissions for locally installed binaries.</p>
              </div>
              <span className={`pill text-xs font-bold ${firewallData?.enabled ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25' : 'bg-amber-500/10 text-amber-500 border-amber-500/25'}`}>
                State: {firewallData?.enabled ? 'Active ✅' : 'Disabled ⚠️'}
              </span>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Registered Application Firewalls ({firewallData?.count ?? 'UNAVAILABLE'})</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
                {Array.isArray(firewallData?.rules) && firewallData.rules.length > 0 ? (
                  firewallData.rules.map((rule: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs"
                      style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
                    >
                      <span className="font-bold truncate max-w-[70%]" style={{ color: 'var(--color-ink)' }}>{rule.app}</span>
                      <span className={`pill text-[10px] shrink-0 font-bold uppercase ${rule.action === 'ALLOW' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25' : 'bg-red-500/10 text-red-500 border-red-500/25'}`}>
                        {rule.action}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400 border rounded-xl col-span-2" style={{ borderColor: 'var(--color-line)' }}>
                    No firewall application rules defined.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
