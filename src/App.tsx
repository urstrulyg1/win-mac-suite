import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { pageMotionProps } from './motion';
import TopNav from './components/TopNav';
import LandingHero from './components/LandingHero';
import RunningDashboard from './components/RunningDashboard';
import DiagnosticsHub from './components/DiagnosticsHub';
import SecurityHub from './components/SecurityHub';
import StorageHub from './components/StorageHub';
import StartupManager from './components/StartupManager';
import ReportsPage from './components/ReportsPage';
import AskAssistantHub from './components/AskAssistantHub';
import PerformanceDoctorHub from './components/PerformanceDoctorHub';
import DeveloperDoctorHub from './components/DeveloperDoctorHub';
import NetworkDoctorHub from './components/NetworkDoctorHub';
import SystemEventsTimeline from './components/SystemEventsTimeline';
import CrashHangDoctor from './components/CrashHangDoctor';
import HardwarePeripheralsHub from './components/HardwarePeripheralsHub';
import AppleServicesHub from './components/AppleServicesHub';
import SystemGraphicalView from './components/SystemGraphicalView';
import UnsupportedPlatformView from './components/UnsupportedPlatformView';
import CausalReasoningHub from './components/intelligence/CausalReasoningHub';
import IncidentIntelligenceHub from './components/intelligence/IncidentIntelligenceHub';
import ExperimentCenterHub from './components/intelligence/ExperimentCenterHub';
import { useDarkMode } from './hooks/useDarkMode';
import { useToast } from './components/Toast';
import type { Section, RunMode, LogEntry, RunSummary, AppPhase, SystemInfo } from './types';
import { PlatformProvider, usePlatform, type PlatformCapabilities } from './platform';
import { createMaintenancePlan, executeMaintenancePlan } from './maintenance';

export function buildExportReport(
  platform: string,
  mode: RunMode,
  sections: Section[],
  logs: LogEntry[],
  summary: RunSummary | null,
): string {
  const report = {
    suite: platform === 'macos' ? 'MacSuite' : 'WinSuite',
    version: '10.1.0',
    exportTimestamp: new Date().toISOString(),
    mode,
    summary,
    phases: sections.map((s) => ({
      number: s.number,
      title: s.title,
      description: s.description,
      status: s.status,
      duration: s.duration,
      result: s.result,
      details: s.details,
      logCount: s.logs.length,
    })),
    logs,
  };
  return JSON.stringify(report, null, 2);
}

function MainApp() {
  const { toast } = useToast();
  const { dark, toggle: toggleDark } = useDarkMode();
  const { config, platform, isSupported, createPlatformSections, capabilities } = usePlatform();

  const [phase, setPhase] = useState<AppPhase>('landing');
  const [mode, setMode] = useState<RunMode>('Safe');
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [sections, setSections] = useState<Section[]>(() => createPlatformSections());
  const [allLogs, setAllLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [lastRunTimestamp, setLastRunTimestamp] = useState<string | null>(null);
  const [overallProgress, setOverallProgress] = useState(0);
  const [currentSectionName, setCurrentSectionName] = useState('');
  const [noReboot, setNoReboot] = useState(false);
  const [exportJson, setExportJson] = useState(false);

  // Restore previous run results from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('macsuite_last_run_state');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.summary && Array.isArray(parsed.sections)) {
          setSummary(parsed.summary);
          setSections(parsed.sections);
          sectionsRef.current = parsed.sections;
          if (parsed.timestamp) setLastRunTimestamp(parsed.timestamp);
          if (parsed.mode) setMode(parsed.mode);
          if (Array.isArray(parsed.logs)) {
            setAllLogs(parsed.logs);
            logsRef.current = parsed.logs;
          }
        }
      }
    } catch {}
  }, []);

  // Real system telemetry
  const [realSysInfo, setRealSysInfo] = useState<SystemInfo>({
    hostName: '',
    user: '',
    os: '',
    build: '',
    processor: '',
    ramGB: 0,
    freeDiskGB: 0,
    totalDiskGB: 0,
    isOnline: true,
    cpuUsage: 0,
    memoryUsage: 0,
    uptime: '',
  });
  const [backendOnline, setBackendOnline] = useState(false);

  const cancelRef = useRef(false);
  const sectionsRef = useRef<Section[]>(sections);
  const logsRef = useRef<LogEntry[]>([]);

  // Update sections when platform or config changes
  useEffect(() => {
    if (!isRunning && phase !== 'running' && phase !== 'complete') {
      const fresh = createPlatformSections();
      setSections(fresh);
      sectionsRef.current = fresh;
    }
  }, [createPlatformSections, isRunning, phase]);

  // Telemetry Polling
  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch('http://127.0.0.1:3131/api/sysinfo');
        if (!res.ok) throw new Error('API down');
        const data = await res.json();
        if (cancelled) return;
        setBackendOnline(true);
        setRealSysInfo({
          hostName: data.hostName || 'Local Computer',
          user: data.user || 'User',
          os: data.os || 'OS',
          build: data.build || '',
          processor: data.processor || 'CPU',
          ramGB: data.ramGB || 0,
          freeDiskGB: data.freeDiskGB || 0,
          totalDiskGB: data.totalDiskGB || 0,
          isOnline: data.isOnline ?? true,
          cpuUsage: data.cpuUsage ?? 0,
          cpuTemp: data.cpuTemp ?? 44,
          cpuTempFormatted: data.cpuTempFormatted || `${data.cpuTemp ?? 44}°C`,
          memoryUsage: data.memoryUsage ?? 0,
          uptime: data.uptime || '',
        });
      } catch {
        if (!cancelled) setBackendOnline(false);
      }
    };

    poll();
    const id = window.setInterval(poll, 3000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, []);

  const log = useCallback((entry: LogEntry) => {
    setAllLogs((p) => {
      const next = [...p, entry];
      logsRef.current = next;
      return next;
    });
  }, []);

  const patch = useCallback((id: string, u: Partial<Section>) => {
    setSections((p) => {
      const next = p.map((s) => (s.id === id ? { ...s, ...u } : s));
      sectionsRef.current = next;
      return next;
    });
  }, []);

  const downloadReport = useCallback(
    (secs: Section[], logs: LogEntry[], summ: RunSummary | null, runMode: RunMode) => {
      try {
        const blob = new Blob([buildExportReport(platform, runMode, secs, logs, summ)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        a.download = `${config.productName.toLowerCase()}-report-${stamp}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return true;
      } catch {
        return false;
      }
    },
    [platform, config.productName],
  );

  const run = useCallback(async () => {
    cancelRef.current = false;
    setIsRunning(true);
    setOverallProgress(0);
    setSummary(null);

    const initialSections = createPlatformSections();
    sectionsRef.current = initialSections;
    logsRef.current = [];
    setSections(initialSections);
    setAllLogs([]);

    const plan = createMaintenancePlan(config, mode, capabilities);

    const finalSummary = await executeMaintenancePlan(
      plan,
      {
        onPhaseStart: (_id, name) => {
          setCurrentSectionName(name);
        },
        onPhaseProgress: (id, progress, curLogs) => {
          patch(id, { status: 'running', progress, logs: curLogs });
        },
        onPhaseComplete: (id, status, result, duration, pLogs) => {
          patch(id, { status, progress: 100, result, duration, logs: pLogs });
        },
        onLog: (entry) => {
          log(entry);
        },
        onOverallProgress: (p) => {
          setOverallProgress(p);
        },
      },
      () => cancelRef.current,
      { noReboot },
    );

    setSummary(finalSummary);
    const nowIso = new Date().toISOString();
    setLastRunTimestamp(nowIso);

    // Persist completed run in localStorage
    try {
      localStorage.setItem('macsuite_last_run_state', JSON.stringify({
        timestamp: nowIso,
        mode,
        summary: finalSummary,
        sections: sectionsRef.current,
        logs: logsRef.current.slice(-150),
      }));
    } catch {}

    // Save report to SQLite database in background
    try {
      fetch('http://127.0.0.1:3131/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${config.productName} Maintenance Run (${mode} Mode)`,
          reportType: 'maintenance-run',
          summary: `Completed ${finalSummary.passedPhases} of ${finalSummary.totalPhases} phases. Reclaimed ${finalSummary.spaceReclaimed >= 1024 ? `${(finalSummary.spaceReclaimed / 1024).toFixed(1)} GB` : `${finalSummary.spaceReclaimed} MB`} disk space.`,
        }),
      }).catch(() => null);
    } catch {}

    setRealSysInfo((prev) => ({
      ...prev,
      freeDiskGB: +(prev.freeDiskGB + (finalSummary.spaceReclaimed / 1024)).toFixed(1),
    }));
    setIsRunning(false);
    setCurrentSectionName('');

    if (finalSummary.cancelled) {
      toast('Run cancelled — partial diagnostics saved', 'warning');
    } else {
      toast(`${config.productName} completed successfully`, 'success');
      if (exportJson) {
        downloadReport(sectionsRef.current, logsRef.current, finalSummary, mode);
      }
    }

    setTimeout(() => {
      setActiveTab('reports');
      setPhase('reports');
    }, 600);
  }, [config, mode, capabilities, createPlatformSections, patch, log, noReboot, exportJson, downloadReport, toast]);

  const cancelRun = useCallback(() => {
    cancelRef.current = true;
    toast('Cancelling run… finishing current step', 'info');
  }, [toast]);

  const reset = useCallback(() => {
    cancelRef.current = true;
    setActiveTab('maintenance');
    setPhase('configuring');
    const fresh = createPlatformSections();
    sectionsRef.current = fresh;
    logsRef.current = [];
    setSections(fresh);
    setAllLogs([]);
    setIsRunning(false);
    setSummary(null);
    setOverallProgress(0);
    setCurrentSectionName('');
  }, [createPlatformSections]);

  const clearLogs = useCallback(() => {
    setAllLogs([]);
    toast('Terminal console cleared', 'info');
  }, [toast]);

  const handleManualExport = useCallback(() => {
    const ok = downloadReport(sectionsRef.current, logsRef.current, summary, mode);
    if (ok) toast('Diagnostics report downloaded', 'success');
    else toast('Export failed', 'error');
  }, [downloadReport, summary, mode, toast]);

  const handleNavTab = useCallback((tab: string) => {
    if (isRunning) {
      toast('Please wait for the current run to finish or cancel first', 'warning');
      return;
    }

    setActiveTab(tab);
    if (tab === 'overview') {
      setPhase('landing');
    } else if (tab === 'reports') {
      setPhase('reports');
    } else if (tab === 'maintenance') {
      setPhase('configuring');
    } else {
      setPhase('landing');
    }
  }, [isRunning, toast]);

  const handleStartWithMode = useCallback((selectedMode?: RunMode) => {
    if (selectedMode) setMode(selectedMode);
    setActiveTab('maintenance');
    setPhase('configuring');
  }, []);

  const [diagnosticOnly, setDiagnosticOnly] = useState(true);

  if (!isSupported) {
    return <UnsupportedPlatformView platformName={realSysInfo.os || platform} />;
  }

  return (
    <div className="min-h-screen app-bg antialiased selection:bg-blue-200 selection:text-blue-900 overflow-x-hidden">
      <TopNav
        phase={phase}
        activeTab={activeTab}
        isRunning={isRunning}
        dark={dark}
        diagnosticOnly={diagnosticOnly}
        onToggleDiagnosticOnly={() => setDiagnosticOnly((v) => !v)}
        onToggleDark={toggleDark}
        summary={summary}
        systemInfo={realSysInfo}
        onHome={() => handleNavTab('overview')}
        onReset={reset}
        onBack={phase === 'configuring' ? () => { setActiveTab('overview'); setPhase('landing'); } : undefined}
        onNavTab={handleNavTab}
      />

      <AnimatePresence mode="wait">
        {activeTab === 'graph' ? (
          <motion.div
            key="graph-tab"
            {...pageMotionProps} className="w-full"
          >
            <SystemGraphicalView onNavigateTab={handleNavTab} onStartAction={handleStartWithMode} />
          </motion.div>
        ) : activeTab === 'whynot' ? (
          <motion.div
            key="whynot-tab"
            {...pageMotionProps} className="w-full"
          >
            <CausalReasoningHub />
          </motion.div>
        ) : activeTab === 'incidents' ? (
          <motion.div
            key="incidents-tab"
            {...pageMotionProps} className="w-full"
          >
            <IncidentIntelligenceHub />
          </motion.div>
        ) : activeTab === 'experiments' ? (
          <motion.div
            key="experiments-tab"
            {...pageMotionProps} className="w-full"
          >
            <ExperimentCenterHub />
          </motion.div>
        ) : activeTab === 'ask' ? (
          <motion.div
            key="ask-tab"
            {...pageMotionProps} className="w-full"
          >
            <AskAssistantHub onNavigateTab={handleNavTab} />
          </motion.div>
        ) : activeTab === 'timeline' ? (
          <motion.div
            key="timeline-tab"
            {...pageMotionProps} className="w-full"
          >
            <SystemEventsTimeline />
          </motion.div>
        ) : activeTab === 'crashes' ? (
          <motion.div
            key="crashes-tab"
            {...pageMotionProps} className="w-full"
          >
            <CrashHangDoctor />
          </motion.div>
        ) : activeTab === 'hardware' ? (
          <motion.div
            key="hardware-tab"
            {...pageMotionProps} className="w-full"
          >
            <HardwarePeripheralsHub />
          </motion.div>
        ) : activeTab === 'apple' ? (
          <motion.div
            key="apple-tab"
            {...pageMotionProps} className="w-full"
          >
            <AppleServicesHub />
          </motion.div>
        ) : activeTab === 'performance' ? (
          <motion.div
            key="performance-tab"
            {...pageMotionProps} className="w-full"
          >
            <PerformanceDoctorHub onNavigateTab={handleNavTab} />
          </motion.div>
        ) : activeTab === 'developer' ? (
          <motion.div
            key="developer-tab"
            {...pageMotionProps} className="w-full"
          >
            <DeveloperDoctorHub />
          </motion.div>
        ) : activeTab === 'network' ? (
          <motion.div
            key="network-tab"
            {...pageMotionProps} className="w-full"
          >
            <NetworkDoctorHub />
          </motion.div>
        ) : activeTab === 'diagnostics' ? (
          <motion.div
            key="diagnostics-tab"
            {...pageMotionProps} className="w-full"
          >
            <DiagnosticsHub systemInfo={realSysInfo} onStartAction={handleStartWithMode} />
          </motion.div>
        ) : activeTab === 'startup' ? (
          <motion.div
            key="startup-tab"
            {...pageMotionProps} className="w-full"
          >
            <StartupManager />
          </motion.div>
        ) : activeTab === 'security' ? (
          <motion.div
            key="security-tab"
            {...pageMotionProps} className="w-full"
          >
            <SecurityHub />
          </motion.div>
        ) : activeTab === 'storage' ? (
          <motion.div
            key="storage-tab"
            {...pageMotionProps} className="w-full"
          >
            <StorageHub systemInfo={realSysInfo} onClean={handleStartWithMode} />
          </motion.div>
        ) : activeTab === 'overview' && !isRunning ? (
          <motion.div
            key="landing-page"
            {...pageMotionProps} className="w-full"
          >
            <LandingHero
              onStart={handleStartWithMode}
              systemInfo={realSysInfo}
              summary={summary}
              lastRunTimestamp={lastRunTimestamp}
              backendOnline={backendOnline}
              onNavigateTab={handleNavTab}
            />
          </motion.div>
        ) : phase === 'reports' || activeTab === 'reports' ? (
          <motion.div
            key="reports-page"
            {...pageMotionProps} className="w-full"
          >
            <ReportsPage
              summary={summary}
              onStartNew={(m) => handleStartWithMode(m)}
              onExport={summary ? handleManualExport : undefined}
            />
          </motion.div>
        ) : (
          <motion.div
            key="dashboard-page"
            {...pageMotionProps} className="w-full"
          >
            <RunningDashboard
              phase={phase}
              mode={mode}
              sections={sections}
              allLogs={allLogs}
              isRunning={isRunning}
              systemInfo={realSysInfo}
              summary={summary}
              overallProgress={overallProgress}
              currentSectionName={currentSectionName}
              noReboot={noReboot}
              exportJson={exportJson}
              onModeChange={setMode}
              onToggleNoReboot={() => setNoReboot((v) => !v)}
              onToggleExportJson={() => setExportJson((v) => !v)}
              onStart={() => {
                setPhase('running');
                void run();
              }}
              onReset={reset}
              onCancel={cancelRun}
              onClearLogs={clearLogs}
              onExport={handleManualExport}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  const [backendPlatform, setBackendPlatform] = useState<string | undefined>(undefined);
  const [backendCapabilities, setBackendCapabilities] = useState<PlatformCapabilities | undefined>(undefined);
  const [systemInfo, setSystemInfo] = useState<SystemInfo>({
    hostName: '',
    user: '',
    os: '',
    build: '',
    processor: '',
    ramGB: 0,
    freeDiskGB: 0,
    totalDiskGB: 0,
    isOnline: true,
    cpuUsage: 0,
    memoryUsage: 0,
    uptime: '',
  });

  useEffect(() => {
    fetch('http://127.0.0.1:3131/api/sysinfo')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          if (data.platform) setBackendPlatform(data.platform);
          if (data.capabilities) setBackendCapabilities(data.capabilities);
          setSystemInfo({
            hostName: data.hostName || '',
            user: data.user || '',
            os: data.os || '',
            build: data.build || '',
            processor: data.processor || '',
            ramGB: data.ramGB || 0,
            freeDiskGB: data.freeDiskGB || 0,
            totalDiskGB: data.totalDiskGB || 0,
            isOnline: data.isOnline ?? true,
            cpuUsage: data.cpuUsage ?? 0,
            memoryUsage: data.memoryUsage ?? 0,
            uptime: data.uptime || '',
          });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <PlatformProvider
      systemInfo={systemInfo}
      backendPlatform={backendPlatform}
      backendCapabilities={backendCapabilities}
    >
      <MainApp />
    </PlatformProvider>
  );
}
