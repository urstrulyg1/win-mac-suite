import { useState, useCallback, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { RunMode, AppPhase, Section, LogEntry, RunSummary, SystemInfo } from './types';
import { SYSTEM_INFO, createSections, getSectionSimData, shouldSkipSection, generateTimestamp } from './data';
import { useToast } from './components/Toast';
import TopNav from './components/TopNav';
import LandingHero from './components/LandingHero';
import RunningDashboard from './components/RunningDashboard';

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
  const [phase, setPhase] = useState<AppPhase>('landing');
  const [mode, setMode] = useState<RunMode>('Safe');
  const [sections, setSections] = useState<Section[]>(createSections());
  const [allLogs, setAllLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [overallProgress, setOverallProgress] = useState(0);
  const [currentSectionName, setCurrentSectionName] = useState('');
  const [noReboot, setNoReboot] = useState(false);
  const [exportJson, setExportJson] = useState(true);

  // Live fluctuating telemetry (CPU / RAM / free disk)
  const [telemetry, setTelemetry] = useState({
    cpu: SYSTEM_INFO.cpuUsage,
    mem: SYSTEM_INFO.memoryUsage,
    freeDisk: SYSTEM_INFO.freeDiskGB,
  });
  const telemetryTargetRef = useRef({ cpu: SYSTEM_INFO.cpuUsage, mem: SYSTEM_INFO.memoryUsage });
  const runStartedAtRef = useRef<string>('');

  const cancelRef = useRef(false);
  const sectionsRef = useRef<Section[]>(createSections());
  const logsRef = useRef<LogEntry[]>([]);

  // Smoothly drift telemetry toward randomised targets for a "live" feel
  useEffect(() => {
    const id = window.setInterval(() => {
      if (isRunning) {
        telemetryTargetRef.current = {
          cpu: clamp(SYSTEM_INFO.cpuUsage + 18 + Math.random() * 45, 5, 99),
          mem: clamp(SYSTEM_INFO.memoryUsage + 8 + Math.random() * 28, 20, 96),
        };
      } else {
        telemetryTargetRef.current = {
          cpu: clamp(SYSTEM_INFO.cpuUsage + (Math.random() - 0.5) * 10, 4, 30),
          mem: clamp(SYSTEM_INFO.memoryUsage + (Math.random() - 0.5) * 8, 25, 60),
        };
      }
    }, 1900);
    return () => window.clearInterval(id);
  }, [isRunning]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setTelemetry((prev) => ({
        cpu: prev.cpu + (telemetryTargetRef.current.cpu - prev.cpu) * 0.06,
        mem: prev.mem + (telemetryTargetRef.current.mem - prev.mem) * 0.06,
        freeDisk: prev.freeDisk,
      }));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
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

    await sleep(250);
    log({ time: ts(), level: 'INFO', message: `Suite v5.0.0 initialized — Execution Mode: ${mode}` });
    await sleep(120);
    log({ time: ts(), level: 'INFO', message: `Host: ${SYSTEM_INFO.hostName} | OS: ${SYSTEM_INFO.os} (${SYSTEM_INFO.build})` });
    await sleep(120);
    log({ time: ts(), level: 'SUCCESS', message: '[OK] Network online · Administrator elevated credentials verified' });
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

    // Reflect reclaimed disk space after cleanup-type operations
    const reclaimedDisk = mode === 'ScanOnly' ? 0 : 3.1;
    const finalSummary: RunSummary = {
      healthScore: Math.round((passed / total) * 100),
      totalSections: total,
      passedSections: passed,
      durationMinutes: Math.round((3 + Math.random() * 4) * 10) / 10,
      totalUpdated: mode === 'ScanOnly' || mode === 'CleanupOnly' ? 0 : 15,
      spaceReclaimed: mode === 'ScanOnly' ? 0 : 3189,
      issuesFound: 1,
      issuesFixed: 0,
      rebootRequired: !noReboot && mode !== 'ScanOnly' && mode !== 'CleanupOnly',
      followUps: [
        'Update Intel Dynamic Tuning Driver (ACPI\\INTC1041\\1)',
        'Review DISM logs at C:\\Windows\\Logs\\DISM\\dism.log',
      ],
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
      if (exportJson) {
        const ok = downloadReport(sectionsRef.current, logsRef.current, finalSummary, mode);
        if (ok) toast('Diagnostics report exported to JSON', 'success');
        else toast('Could not export report automatically', 'warning');
      }
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
    setPhase('complete');
  }, [mode, log, patch, toast, noReboot, exportJson, downloadReport]);

  const cancelRun = useCallback(() => {
    cancelRef.current = true;
    toast('Cancelling run… finishing current step', 'info');
  }, [toast]);

  const reset = useCallback(() => {
    cancelRef.current = true;
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

  const liveSystem: SystemInfo = {
    ...SYSTEM_INFO,
    cpuUsage: Math.round(telemetry.cpu),
    memoryUsage: Math.round(telemetry.mem),
    freeDiskGB: Math.round(telemetry.freeDisk * 10) / 10,
  };

  return (
    <div className="min-h-screen app-bg text-slate-900 antialiased selection:bg-blue-200 selection:text-blue-900">
      <TopNav
        phase={phase}
        isRunning={isRunning}
        onHome={() => {
          if (isRunning) {
            toast('Stop the current run before returning home', 'warning');
            return;
          }
          cancelRef.current = true;
          setPhase('landing');
        }}
        onReset={reset}
        onBack={phase === 'configuring' ? () => setPhase('landing') : undefined}
      />
      <AnimatePresence mode="wait">
        {phase === 'landing' ? (
          <motion.div
            key="landing-page"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <LandingHero onStart={() => setPhase('configuring')} />
          </motion.div>
        ) : (
          <motion.div
            key="dashboard-page"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10"
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
