import { useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { RunMode, AppPhase, Section, LogEntry, RunSummary } from './types';
import { SYSTEM_INFO, createSections, getSectionSimData, shouldSkipSection, generateTimestamp } from './data';
import ParticleBackground from './components/ParticleBackground';
import LandingHero from './components/LandingHero';
import RunningDashboard from './components/RunningDashboard';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function App() {
  const [phase, setPhase] = useState<AppPhase>('landing');
  const [mode, setMode] = useState<RunMode>('Safe');
  const [sections, setSections] = useState<Section[]>(createSections());
  const [allLogs, setAllLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [overallProgress, setOverallProgress] = useState(0);
  const [currentSectionName, setCurrentSectionName] = useState('');
  const cancelRef = useRef(false);

  const log = useCallback((entry: LogEntry) => setAllLogs((p) => [...p, entry]), []);
  const patch = useCallback((id: string, u: Partial<Section>) => {
    setSections((p) => p.map((s) => (s.id === id ? { ...s, ...u } : s)));
  }, []);

  const run = useCallback(async () => {
    cancelRef.current = false;
    setIsRunning(true);
    setOverallProgress(0);
    const secs = createSections();
    setSections(secs);
    setAllLogs([]);
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

    for (let i = 0; i < total; i++) {
      if (cancelRef.current) break;
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

    setOverallProgress(100);
    await sleep(300);
    log({ time: ts(), level: 'SUCCESS', message: '═ SYSTEM MAINTENANCE AND UPDATE COMPLETED SUCCESSFULLY' });

    setSummary({
      healthScore: Math.round((passed / total) * 100),
      totalSections: total,
      passedSections: passed,
      durationMinutes: Math.round((3 + Math.random() * 4) * 10) / 10,
      totalUpdated: mode === 'ScanOnly' || mode === 'CleanupOnly' ? 0 : 15,
      spaceReclaimed: mode === 'ScanOnly' ? 0 : 3189,
      issuesFound: 1,
      issuesFixed: 0,
      rebootRequired: mode !== 'ScanOnly' && mode !== 'CleanupOnly',
      followUps: [
        'Update Intel Dynamic Tuning Driver (ACPI\\INTC1041\\1)',
        'Review DISM logs at C:\\Windows\\Logs\\DISM\\dism.log',
      ],
    });
    setIsRunning(false);
    setCurrentSectionName('');
    await sleep(600);
    setPhase('complete');
  }, [mode, log, patch]);

  const reset = () => {
    cancelRef.current = true;
    setPhase('configuring');
    setSections(createSections());
    setAllLogs([]);
    setIsRunning(false);
    setSummary(null);
    setOverallProgress(0);
    setCurrentSectionName('');
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] antialiased selection:bg-blue-500/30 selection:text-white">
      <ParticleBackground />
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
              systemInfo={SYSTEM_INFO}
              summary={summary}
              overallProgress={overallProgress}
              currentSectionName={currentSectionName}
              onModeChange={setMode}
              onStart={() => {
                setPhase('running');
                run();
              }}
              onReset={reset}
              onBack={() => setPhase('landing')}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

