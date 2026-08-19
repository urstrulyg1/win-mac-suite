import { useState, useCallback, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { RunMode, AppPhase, Section, LogEntry, RunSummary, SystemInfo } from './types';
import { SYSTEM_INFO, createSections, getSectionSimData, shouldSkipSection, generateTimestamp } from './data';
import { useToast } from './components/Toast';
import { useDarkMode } from './hooks/useDarkMode';
import TopNav from './components/TopNav';
import LandingHero from './components/LandingHero';
import RunningDashboard from './components/RunningDashboard';
import ReportsPage from './components/ReportsPage';

// Fetch real system data from the local backend. Falls back to SYSTEM_INFO if
// the server is not running (e.g. static build / no backend).
async function fetchSysInfo(): Promise<SystemInfo | null> {
  try {
    const res = await fetch('/api/sysinfo', { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return null;
    return await res.json() as SystemInfo;
  } catch {
    return null;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

function buildExportReport(
  mode: RunMode,
  sections: Section[],
  logs: LogEntry[],
  summary: RunSummary | null,
): string {
  const report = {
    suite: 'Windows System Update & Optimization Suite',
    version: '5.0.0',
    generatedAt: new Date().toISOString(),
    executionMode: mode,
    system: {
      host: SYSTEM_INFO.hostName,
      os: SYSTEM_INFO.os,
      build: SYSTEM_INFO.build,
      processor: SYSTEM_INFO.processor,
      ramGB: SYSTEM_INFO.ramGB,
    },
    summary,
    sections: sections.map((s) => ({
      number: s.number,
      title: s.title,
      status: s.status,
      progress: s.progress,
      durationSeconds: s.duration,
      result: s.result,
      details: s.details ?? {},
      logCount: s.logs.length,
    })),
    logs,
  };
  return JSON.stringify(report, null, 2);
}

export default function App() {
  const { toast } = useToast();
  const { dark, toggle: toggleDark } = useDarkMode();
  const [phase, setPhase] = useState<AppPhase>('landing');
  const [mode, setMode] = useState<RunMode>('Safe');
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [sections, setSections] = useState<Section[]>(createSections());
  const [allLogs, setAllLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [overallProgress, setOverallProgress] = useState(0);
  const [currentSectionName, setCurrentSectionName] = useState('');
  const [noReboot, setNoReboot] = useState(false);
  const [exportJson, setExportJson] = useState(false);

  // Real system telemetry — polled from /api/sysinfo every 3 s.
  // Falls back to SYSTEM_INFO constants when the backend is not running.
  const [realSysInfo, setRealSysInfo] = useState<SystemInfo>(SYSTEM_INFO);
  const [backendOnline, setBackendOnline] = useState(false);
  const runStartedAtRef = useRef<string>('');

  const cancelRef = useRef(false);
  const sectionsRef = useRef<Section[]>(createSections());
  const logsRef = useRef<LogEntry[]>([]);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      const data = await fetchSysInfo();
      if (cancelled) return;
      if (data) {
        setRealSysInfo(data);
        setBackendOnline(true);
      } else {
        setBackendOnline(false);
      }
    };

    poll(); // immediate first fetch
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
        const blob = new Blob([buildExportReport(runMode, secs, logs, summ)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        a.download = `windows-suite-report-${stamp}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return true;
      } catch {
        return false;
      }
    },
    [],
  );

  const run = useCallback(async () => {
    cancelRef.current = false;
    setIsRunning(true);
    setOverallProgress(0);
    setSummary(null);
    const secs = createSections();
    sectionsRef.current = secs;
    logsRef.current = [];
    setSections(secs);
    setAllLogs([]);
    runStartedAtRef.current = new Date().toISOString();
    const ts = generateTimestamp;

    const hostDisplay = realSysInfo.hostName || 'Local Computer';
    const osDisplay = realSysInfo.os || 'Windows';
    const buildDisplay = realSysInfo.build ? ` (${realSysInfo.build})` : '';

    await sleep(250);
    log({ time: ts(), level: 'INFO', message: `Suite v5.0.0 initialized — Execution Mode: ${mode}` });
    await sleep(120);
    log({ time: ts(), level: 'INFO', message: `Host: ${hostDisplay} | OS: ${osDisplay}${buildDisplay}` });
    await sleep(120);
    log({ time: ts(), level: 'SUCCESS', message: '[OK] Network online · Elevated administrative privileges verified' });
    await sleep(120);
    log({ time: ts(), level: 'INFO', message: '─'.repeat(48) });
    await sleep(350);

    const total = secs.length;
    let passed = 0;
    let cancelled = false;

    for (let i = 0; i < total; i++) {
      if (cancelRef.current) {
        cancelled = true;
        break;
      }
      const sec = secs[i];
      const sim = getSectionSimData(sec.id);

      if (shouldSkipSection(sec.id, mode)) {
        patch(sec.id, { status: 'skipped', result: 'SKIPPED (Mode Policy)', progress: 100 });
        log({ time: ts(), level: 'INFO', message: `[SKIP] ${sec.title} (Skipped for ${mode} mode)` });
        setOverallProgress(Math.round(((i + 1) / total) * 100));
        passed++;
        await sleep(180);
        continue;
      }

      setCurrentSectionName(sec.title);
      patch(sec.id, { status: 'running', progress: 0 });
      await sleep(150);
      log({ time: ts(), level: 'INFO', message: `═ [Phase ${sec.number}/${total}] ${sec.title.toUpperCase()}` });
      await sleep(250);

      if (sim) {
        const logs = sim.logs(mode);
        const dur = sim.minDuration + Math.random() * (sim.maxDuration - sim.minDuration);
        const delay = (dur * 1000) / logs.length;
        const secLogs: LogEntry[] = [];

        for (let j = 0; j < logs.length; j++) {
          if (cancelRef.current) break;
          const entry = { ...logs[j], time: ts() };
          secLogs.push(entry);
          log(entry);
          patch(sec.id, { progress: Math.round(((j + 1) / logs.length) * 100), logs: [...secLogs] });
          setOverallProgress(Math.round(((i + (j + 1) / logs.length) / total) * 100));
          await sleep(delay * (0.7 + Math.random() * 0.5));
        }

        if (cancelRef.current) {
          cancelled = true;
          break;
        }

        let status: Section['status'] = 'success';
        if (sim.successResult.match(/FAIL|ISSUES/)) status = 'error';
        else if (sim.successResult.match(/PARTIAL|WARNING/)) status = 'warning';

        patch(sec.id, {
          status,
          progress: 100,
          result: sim.successResult,
          duration: Math.round(dur * 10) / 10,
          logs: secLogs,
          details: sim.details,
        });
        if (status !== 'error') passed++;

        await sleep(100);
        log({
          time: ts(),
          level: status === 'success' ? 'SUCCESS' : status === 'warning' ? 'WARNING' : 'ERROR',
          message: `Done: ${sim.successResult} (${Math.round(dur * 10) / 10}s)`,
        });
      }
      await sleep(300);
    }

    // Dynamic follow-up recommendations based on the executed profile
    const followUps: string[] = [];
    if (!noReboot && mode !== 'ScanOnly' && mode !== 'CleanupOnly') {
      followUps.push('Restart system to finalize staged Windows component and driver updates.');
    }
    if (mode === 'ScanOnly' || mode === 'Safe' || mode === 'Aggressive') {
      followUps.push('Review Windows CBS integrity logs at C:\\Windows\\Logs\\CBS\\CBS.log.');
    }
    if (followUps.length === 0) {
      followUps.push('System is optimized and clean. All scheduled maintenance tasks completed.');
    }

    // Reflect reclaimed disk space after cleanup-type operations
    const reclaimedDisk = mode === 'ScanOnly' ? 0 : 3.1;
    const finalSummary: RunSummary = {
      healthScore: Math.round((passed / total) * 100),
      totalSections: total,
      passedSections: passed,
      durationMinutes: Math.round((3 + Math.random() * 4) * 10) / 10,
      totalUpdated: mode === 'ScanOnly' || mode === 'CleanupOnly' ? 0 : 15,
      spaceReclaimed: mode === 'ScanOnly' ? 0 : 3189,
      issuesFound: 0,
      issuesFixed: 0,
      rebootRequired: !noReboot && mode !== 'ScanOnly' && mode !== 'CleanupOnly',
      followUps,
      cancelled,
      mode,
      startedAt: runStartedAtRef.current,
    };

    if (cancelled) {
      log({ time: ts(), level: 'WARNING', message: '⚠ Execution aborted by user — partial report generated.' });
      toast('Run cancelled — partial results retained', 'warning');
    } else {
      setOverallProgress(100);
      log({ time: ts(), level: 'SUCCESS', message: '═ SYSTEM MAINTENANCE AND UPDATE COMPLETED SUCCESSFULLY' });
      toast('Maintenance suite completed successfully', 'success');
    }

    setSummary(finalSummary);
    setTelemetry((prev) => ({
      ...prev,
      freeDisk: +(prev.freeDisk + reclaimedDisk).toFixed(1),
    }));
    setIsRunning(false);
    setCurrentSectionName('');
    await sleep(600);
    setActiveTab('reports');
    setPhase('reports');
  }, [mode, log, patch, toast, noReboot, exportJson, downloadReport]);

  const cancelRun = useCallback(() => {
    cancelRef.current = true;
    toast('Cancelling run… finishing current step', 'info');
  }, [toast]);

  const reset = useCallback(() => {
    cancelRef.current = true;
    setActiveTab('maintenance');
    setPhase('configuring');
    const fresh = createSections();
    sectionsRef.current = fresh;
    logsRef.current = [];
    setSections(fresh);
    setAllLogs([]);
    setIsRunning(false);
    setSummary(null);
    setOverallProgress(0);
    setCurrentSectionName('');
  }, []);

  const clearLogs = useCallback(() => {
    setAllLogs([]);
    toast('Terminal cleared', 'info');
  }, [toast]);

  const handleManualExport = useCallback(() => {
    const ok = downloadReport(sections, allLogs, summary, mode);
    if (ok) toast('Report downloaded', 'success');
    else toast('Export failed', 'error');
  }, [downloadReport, sections, allLogs, summary, mode, toast]);

  const handleNavTab = useCallback((tab: string) => {
    if (tab === 'overview') {
      if (isRunning) { toast('Stop the current run before returning home', 'warning'); return; }
      cancelRef.current = true;
      setActiveTab('overview');
      setPhase('landing');
      return;
    }
    if (tab === 'updates' || tab === 'security' || tab === 'maintenance') {
      if (isRunning) { toast('Stop the current run first', 'warning'); return; }
      if (tab === 'security') setMode('ScanOnly');
      else if (tab === 'updates') setMode('Safe');
      else if (tab === 'maintenance') setMode('Aggressive');
      setActiveTab(tab);
      setPhase('configuring');
      return;
    }
    if (tab === 'reports') {
      if (isRunning) { toast('Stop the current run first', 'warning'); return; }
      setActiveTab('reports');
      setPhase('reports');
      return;
    }
  }, [isRunning, phase, toast]);

  const handleStartWithMode = useCallback((selectedMode?: RunMode) => {
    if (selectedMode) setMode(selectedMode);
    setActiveTab('maintenance');
    setPhase('configuring');
  }, []);

  // When the backend is live use real values; otherwise fall back to statics.
  const liveSystem: SystemInfo = backendOnline ? realSysInfo : SYSTEM_INFO;

  return (
    <div className="min-h-screen app-bg antialiased selection:bg-blue-200 selection:text-blue-900 overflow-x-hidden">
      <TopNav
        phase={phase}
        activeTab={activeTab}
        isRunning={isRunning}
        dark={dark}
        onToggleDark={toggleDark}
        summary={summary}
        systemInfo={liveSystem}
        onHome={() => handleNavTab('overview')}
        onReset={reset}
        onBack={phase === 'configuring' ? () => { setActiveTab('overview'); setPhase('landing'); } : undefined}
        onNavTab={handleNavTab}
      />
      <AnimatePresence mode="wait">
        {phase === 'landing' ? (
          <motion.div
            key="landing-page"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full"
            style={{ pointerEvents: 'auto' }}
          >
            <LandingHero
              onStart={handleStartWithMode}
              systemInfo={liveSystem}
              summary={summary}
              backendOnline={backendOnline}
            />
          </motion.div>
        ) : phase === 'reports' ? (
          <motion.div
            key="reports-page"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full"
            style={{ pointerEvents: 'auto' }}
          >
            <ReportsPage
              summary={summary}
              onStartNew={(m) => { handleStartWithMode(m); }}
              onExport={summary ? handleManualExport : undefined}
            />
          </motion.div>
        ) : (
          <motion.div
            key="dashboard-page"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full"
            style={{ pointerEvents: 'auto' }}
          >
            <RunningDashboard
              phase={phase}
              mode={mode}
              sections={sections}
              allLogs={allLogs}
              isRunning={isRunning}
              systemInfo={liveSystem}
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
