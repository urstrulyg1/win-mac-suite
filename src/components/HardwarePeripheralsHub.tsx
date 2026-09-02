import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { tabTransition } from '../motion';
import {
  HardDrive, Volume2, Camera, Monitor, Keyboard,
  RefreshCw
} from 'lucide-react';
import InspectorModal, { type InspectorData } from './InspectorModal';

export default function HardwarePeripheralsHub() {
  const [subTab, setSubTab] = useState<'disk' | 'audio' | 'camera' | 'display' | 'peripherals'>('disk');
  const [diskData, setDiskData] = useState<any>(null);
  const [audioData, setAudioData] = useState<any>(null);
  const [cameraData, setCameraData] = useState<any>(null);
  const [displayData, setDisplayData] = useState<any>(null);
  const [peripheralData, setPeripheralData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [inspectItem, setInspectItem] = useState<InspectorData | null>(null);

  const fetchHardwareData = async () => {
    setLoading(true);
    try {
      const [dRes, aRes, cRes, dpRes, pRes] = await Promise.all([
        fetch('/api/diagnostics/disk-health').catch(() => null),
        fetch('/api/diagnostics/audio').catch(() => null),
        fetch('/api/diagnostics/camera-mic').catch(() => null),
        fetch('/api/diagnostics/displays').catch(() => null),
        fetch('/api/diagnostics/peripherals').catch(() => null),
      ]);

      if (dRes && dRes.ok) setDiskData(await dRes.json());
      if (aRes && aRes.ok) setAudioData(await aRes.json());
      if (cRes && cRes.ok) setCameraData(await cRes.json());
      if (dpRes && dpRes.ok) setDisplayData(await dpRes.json());
      if (pRes && pRes.ok) setPeripheralData(await pRes.json());
    } catch {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHardwareData();
  }, []);

  return (
    <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <InspectorModal data={inspectItem} onClose={() => setInspectItem(null)} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25">
              <HardDrive size={12} /> Hardware, Audio, Displays &amp; Peripherals
            </span>
            <span className="pill" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-ink-3)', borderColor: 'var(--color-line)' }}>
              Hardware Health, NVMe, Audio, Camera &amp; Displays
            </span>
          </div>
          <h1 className="text-hero font-extrabold tracking-tight" style={{ color: 'var(--color-ink)' }}>
            Hardware Health, Displays &amp; Peripherals Doctor
          </h1>
          <p className="mt-1 text-[14px]" style={{ color: 'var(--color-ink-3)' }}>
            APFS container &amp; filesystem health, CoreAudio routing, built-in camera/mic diagnostics, external monitor troubleshooting, and peripheral battery status.
          </p>
        </div>

        <button onClick={fetchHardwareData} disabled={loading} className="btn btn-ghost text-xs cursor-pointer">
          <RefreshCw size={13} className={loading ? 'animate-spin-smooth' : ''} />
          <span>Re-scan Hardware</span>
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl border overflow-x-auto" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
        {[
          { id: 'disk' as const,        label: 'Disk Health & APFS Doctor', icon: HardDrive, color: '#f97316' },
          { id: 'audio' as const,       label: 'Audio Doctor 🔊',           icon: Volume2,   color: '#a78bfa' },
          { id: 'camera' as const,      label: 'Camera & Mic Doctor 📷',    icon: Camera,    color: '#34d399' },
          { id: 'display' as const,     label: 'Displays & Monitors 🖥️',   icon: Monitor,   color: '#60a5fa' },
          { id: 'peripherals' as const, label: 'Peripherals & Battery',     icon: Keyboard,  color: '#facc15' },
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

      {/* Content */}
      <AnimatePresence mode="wait">
        {subTab === 'disk' && (
          <motion.div key="disk" {...tabTransition} className="space-y-6">
            <div className="card p-6 space-y-4 border-l-4 border-l-emerald-500">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    FILESYSTEM &amp; NVMe STORAGE HEALTH
                  </span>
                  <h3 className="text-base font-extrabold" style={{ color: 'var(--color-ink)' }}>
                    {diskData?.filesystem || 'APFS'} · {diskData?.volumeName || 'Macintosh HD'}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">{diskData?.firstAidGuidance}</p>
                </div>
                <span className="pill bg-emerald-500/10 text-emerald-500 border-emerald-500/25 text-xs font-bold shrink-0">
                  {diskData?.smartStatus || 'Verified'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl border space-y-1" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                <span className="text-[10px] uppercase font-bold text-slate-400">Container &amp; Partition</span>
                <p className="font-mono font-bold text-blue-400">{diskData?.container}</p>
                <p className="text-slate-400 mt-1">{diskData?.filesystemIntegrity}</p>
              </div>
              <div className="p-4 rounded-xl border space-y-1" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                <span className="text-[10px] uppercase font-bold text-slate-400">Read / Write Speed</span>
                <p className="font-mono font-bold text-emerald-400">{diskData?.readWriteStatistics}</p>
                <p className="text-slate-400 mt-1">PCIe Bus: Nominal Bandwidth</p>
              </div>
              <div className="p-4 rounded-xl border space-y-1" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                <span className="text-[10px] uppercase font-bold text-slate-400">Capacity Depletion Risk</span>
                <p className="font-mono font-bold text-blue-400">{diskData?.diskFullRiskPrediction}</p>
                <p className="text-slate-400 mt-1">{diskData?.smartDisclosure}</p>
              </div>
            </div>
          </motion.div>
        )}

        {subTab === 'audio' && (
          <motion.div key="audio" {...tabTransition} className="card p-6 space-y-6">
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-line)' }}>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>
                  Audio Subsystem &amp; Routing Doctor
                </h3>
                <p className="text-xs text-slate-400">{audioData?.diagnosisVerdict}</p>
              </div>
              <span className="pill bg-emerald-500/10 text-emerald-500 border-emerald-500/25 text-xs font-bold">
                CoreAudio Healthy
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border text-center" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                <span className="text-[10px] uppercase font-bold text-slate-400">Output Target</span>
                <p className="font-bold text-blue-400 mt-1 truncate">{audioData?.defaultOutputDevice}</p>
              </div>
              <div className="p-3.5 rounded-xl border text-center" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                <span className="text-[10px] uppercase font-bold text-slate-400">Input Source</span>
                <p className="font-bold text-blue-400 mt-1 truncate">{audioData?.defaultInputDevice}</p>
              </div>
              <div className="p-3.5 rounded-xl border text-center" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                <span className="text-[10px] uppercase font-bold text-slate-400">Sample Rate</span>
                <p className="font-mono font-bold text-emerald-400 mt-1">{audioData?.sampleRate}</p>
              </div>
              <div className="p-3.5 rounded-xl border text-center" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                <span className="text-[10px] uppercase font-bold text-slate-400">CoreAudio Daemon</span>
                <p className="font-bold text-emerald-400 mt-1">{audioData?.coreAudioDaemon}</p>
              </div>
            </div>
          </motion.div>
        )}

        {subTab === 'camera' && (
          <motion.div key="camera" {...tabTransition} className="card p-6 space-y-4">
            <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>
              Camera &amp; Microphone Array Status
            </h3>
            <p className="text-xs text-slate-300">{cameraData?.diagnosisVerdict}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(cameraData?.cameras || []).map((cam: any, idx: number) => (
                <div key={idx} className="p-4 rounded-xl border flex items-center justify-between" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                  <div>
                    <h4 className="text-xs font-bold" style={{ color: 'var(--color-ink)' }}>{cam.name}</h4>
                    <p className="text-[10px] text-slate-400">Resolution: {cam.resolution}</p>
                  </div>
                  <span className="pill bg-emerald-500/10 text-emerald-500 border-emerald-500/25 text-[10px]">
                    {cam.status}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {subTab === 'display' && (
          <motion.div key="display" {...tabTransition} className="card p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-line)' }}>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>
                  Displays ({displayData?.connectedDisplaysCount || 1} Connected)
                </h3>
                <p className="text-xs text-slate-400">{displayData?.externalMonitorTroubleshoot}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl border space-y-2 text-xs" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
              <p className="font-bold" style={{ color: 'var(--color-ink)' }}>Primary: {displayData?.primaryDisplay?.model}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                <div>Resolution: <strong className="text-blue-400">{displayData?.primaryDisplay?.resolution}</strong></div>
                <div>Refresh: <strong className="text-emerald-400">{displayData?.primaryDisplay?.refreshRate}</strong></div>
                <div>HDR: <strong className="text-purple-400">{displayData?.primaryDisplay?.hdr}</strong></div>
                <div>Gamut: <strong className="text-slate-300">{displayData?.primaryDisplay?.colorProfile}</strong></div>
              </div>
            </div>
          </motion.div>
        )}

        {subTab === 'peripherals' && (
          <motion.div key="peripherals" {...tabTransition} className="card p-6 space-y-4">
            <h3 className="text-base font-bold" style={{ color: 'var(--color-ink)' }}>
              Connected Peripherals &amp; Battery Status
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {(peripheralData?.peripherals || []).map((p: any, idx: number) => (
                <div key={idx} className="p-3.5 rounded-xl border space-y-1" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                  <h4 className="text-xs font-bold" style={{ color: 'var(--color-ink)' }}>{p.name}</h4>
                  <p className="text-[10px] text-slate-400">{p.type}</p>
                  <p className="text-xs font-mono font-bold text-emerald-400">Battery: {p.batteryPct}%</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
