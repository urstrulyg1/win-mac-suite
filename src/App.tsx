import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { pageMotionProps } from './motion';
import TopNav from './components/TopNav';
import GlobalSearch from './components/GlobalSearch';
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
import WindowsManagementHub from './components/WindowsManagementHub';
import { useDarkMode } from './hooks/useDarkMode';
import { useToast } from './components/Toast';
import type { Section, RunMode, LogEntry, RunSummary, AppPhase, SystemInfo } from './types';
import { PlatformProvider, usePlatform, type PlatformCapabilities } from './platform';
import { createMaintenancePlan, executeMaintenancePlan } from './maintenance';
import { systemApi, reportsApi } from './utils/api';

export function buildExportReport(
  platform: string,
  mode: RunMode,
  sections: Section[],
  logs: LogEntry[],
  summary: RunSummary | null,
  version = 'unknown',
): string {
  const report = {
    suite: platform === 'macos' ? 'MacSuite' : 'WinSuite',
    version,
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
    ramGB: null,
    freeDiskGB: null,
    totalDiskGB: null,
    isOnline: null,
    cpuUsage: null,
    memoryUsage: null,
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
      if (document.hidden) return; // Save laptop battery when browser tab is inactive
      try {
        const response = await systemApi.getInfo();
        if (!response.ok || !response.data) {
          if (!cancelled) setBackendOnline(false);
          return;
        }
        const data = response.data as Record<string, unknown>;
        if (cancelled) return;
        setBackendOnline(true);
        setRealSysInfo({
          hostName: typeof data.hostName === 'string' ? data.hostName : '',
          user: typeof data.user === 'string' ? data.user : '',
          os: typeof data.os === 'string' ? data.os : '',
          build: (data.build as string) || '',
          processor: typeof data.processor === 'string' ? data.processor : '',
          ramGB: typeof data.ramGB === 'number' ? data.ramGB : null,
          freeDiskGB: typeof data.freeDiskGB === 'number' ? data.freeDiskGB : null,
          totalDiskGB: typeof data.totalDiskGB === 'number' ? data.totalDiskGB : null,
          isOnline: typeof data.isOnline === 'boolean' ? data.isOnline : null,
          cpuUsage: typeof data.cpuUsage === 'number' ? data.cpuUsage : null,
          cpuTemp: (data.cpuTemp as number | null) ?? undefined,
          cpuTempFormatted: (data.cpuTempFormatted as string) || 'UNAVAILABLE',
          memoryUsage: typeof data.memoryUsage === 'number' ? data.memoryUsage : null,
          uptime: (data.uptime as string) || '',
        });
      } catch {
        if (!cancelled) setBackendOnline(false);
      }
    };

    poll();
    const id = window.setInterval(poll, 3000);

    const handleVisibility = () => {
      if (!document.hidden) poll();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
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
        const blob = new Blob([buildExportReport(platform, runMode, secs, logs, summ, config.version)], {
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

    // When Safe Mode (Audit Only) is active, force ScanOnly so no mutations execute.
    const effectiveMode: RunMode = diagnosticOnly ? 'ScanOnly' : mode;
    const plan = createMaintenancePlan(config, effectiveMode, capabilities);

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
      { noReboot, diagnosticOnly },
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
    reportsApi.generate({
      title: `${config.productName} Maintenance Run (${mode} Mode)`,
      reportType: 'maintenance-run',
      summary: `Completed ${finalSummary.passedSections} of ${finalSummary.totalSections} phases. Disk space reclaimed: ${finalSummary.spaceReclaimed == null ? 'NOT_MEASURED' : finalSummary.spaceReclaimed >= 1024 ? `${(finalSummary.spaceReclaimed / 1024).toFixed(1)} GB` : `${finalSummary.spaceReclaimed} MB`}.`,
    }).catch(() => null);

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
      <GlobalSearch onNavigate={setActiveTab} />
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
        ) : activeTab === 'windows' ? (
          <motion.div
            key="windows-tab"
            {...pageMotionProps} className="w-full"
          >
            <WindowsManagementHub />
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
              diagnosticOnly={diagnosticOnly}
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

      {/* Global Bottom Center Footer */}
      <footer className="w-full py-8 mt-12 border-t flex flex-col items-center justify-center gap-2 text-center" style={{ borderColor: 'var(--color-line)' }}>
        <p className="text-xs font-semibold tracking-wide flex items-center justify-center gap-1.5" style={{ color: 'var(--color-ink-2)' }}>
          <span>Made with</span>
          <span className="text-rose-500 animate-pulse text-sm">❤️</span>
          <span>by</span>
          <span className="font-extrabold bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent">Jeevan</span>
        </p>
        <p className="text-[11px] font-mono tracking-wider" style={{ color: 'var(--color-ink-4)' }}>
          {config.productName} · {config.subtitle} · Version {config.version}
        </p>
      </footer>
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
    ramGB: null,
    freeDiskGB: null,
    totalDiskGB: null,
    isOnline: null,
    cpuUsage: null,
    memoryUsage: null,
    uptime: '',
  });

  useEffect(() => {
    systemApi.getInfo().then((response) => {
      if (response.ok && response.data) {
        const data = response.data as Record<string, unknown>;
        if (data.platform) setBackendPlatform(data.platform as string);
        if (data.capabilities) setBackendCapabilities(data.capabilities as PlatformCapabilities);
        setSystemInfo({
          hostName: (data.hostName as string) || '',
          user: (data.user as string) || '',
          os: (data.os as string) || '',
          build: (data.build as string) || '',
          processor: (data.processor as string) || '',
          ramGB: typeof data.ramGB === 'number' ? data.ramGB : null,
          freeDiskGB: typeof data.freeDiskGB === 'number' ? data.freeDiskGB : null,
          totalDiskGB: typeof data.totalDiskGB === 'number' ? data.totalDiskGB : null,
          isOnline: typeof data.isOnline === 'boolean' ? data.isOnline : null,
          cpuUsage: typeof data.cpuUsage === 'number' ? data.cpuUsage : null,
          memoryUsage: typeof data.memoryUsage === 'number' ? data.memoryUsage : null,
          uptime: (data.uptime as string) || '',
        });
      }
    });
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
