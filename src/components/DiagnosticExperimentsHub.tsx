import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FlaskConical, Play, CheckCircle2, ArrowRight, Activity, RefreshCw } from 'lucide-react';
import { usePlatform } from '../platform';

export default function DiagnosticExperimentsHub() {
  const { config, isMac } = usePlatform();
  const [runningExp, setRunningExp] = useState(false);
  const [experimentResult, setExperimentResult] = useState<any>(null);

  const handleRunExperiment = async (expId: string) => {
    setRunningExp(true);
    try {
      const res = await fetch(`http://127.0.0.1:3131/api/diagnostics/run-experiment?hypothesisId=${expId}`);
      if (res.ok) {
        setExperimentResult(await res.json());
      }
    } catch {}
    finally {
      setRunningExp(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-extrabold" style={{ color: 'var(--color-ink)' }}>
            Diagnostic Experiments &amp; Hypothesis Testing
          </h3>
          <p className="text-xs text-slate-400">Prove root causes through non-destructive controlled experiments and before/after verification.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Experiment 1 */}
        <div className="card p-5 space-y-4 border-l-4 border-l-purple-500">
          <div className="space-y-1">
            <span className="pill bg-purple-500/10 text-purple-400 border-purple-500/25 text-[10px] font-bold">
              Memory Contention Hypothesis
            </span>
            <h4 className="text-sm font-bold" style={{ color: 'var(--color-ink)' }}>
              Docker Hypervisor Memory Impact Experiment
            </h4>
            <p className="text-xs text-slate-400">Hypothesis: Docker Desktop hypervisor is contributing 34% of active memory pressure.</p>
          </div>

          <button
            onClick={() => handleRunExperiment('exp-docker-ram')}
            disabled={runningExp}
            className="btn btn-primary text-xs flex items-center gap-1.5 cursor-pointer font-bold"
          >
            <Play size={12} />
            <span>{runningExp ? 'Evaluating Hypothesis...' : 'Run Controlled Experiment'}</span>
          </button>
        </div>

        {/* Experiment 2 */}
        <div className="card p-5 space-y-4 border-l-4 border-l-blue-500">
          <div className="space-y-1">
            <span className="pill bg-blue-500/10 text-blue-400 border-blue-500/25 text-[10px] font-bold">
              Network Latency Hypothesis
            </span>
            <h4 className="text-sm font-bold" style={{ color: 'var(--color-ink)' }}>
              DNS Resolver Latency &amp; Cache Invalidation
            </h4>
            <p className="text-xs text-slate-400">Hypothesis: Local DNS resolution latency is caused by stale mDNSResponder cache records.</p>
          </div>

          <button
            onClick={() => handleRunExperiment('exp-dns-latency')}
            disabled={runningExp}
            className="btn btn-primary text-xs flex items-center gap-1.5 cursor-pointer font-bold"
          >
            <Play size={12} />
            <span>{runningExp ? 'Evaluating Hypothesis...' : 'Run Controlled Experiment'}</span>
          </button>
        </div>
      </div>

      {/* Result Display */}
      <AnimatePresence>
        {experimentResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6 space-y-4 border-l-4 border-l-emerald-500 shadow-xl"
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-line)' }}>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">EXPERIMENT OUTCOME</span>
                <h4 className="text-sm font-bold" style={{ color: 'var(--color-ink)' }}>
                  {experimentResult.title}
                </h4>
              </div>
              <span className="pill bg-emerald-500/10 text-emerald-400 border-emerald-500/25 text-xs font-bold font-mono">
                Verdict: {experimentResult.hypothesisVerdict}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl border space-y-1" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                <p className="font-bold text-amber-400">Before State</p>
                <pre className="text-[11px] font-mono text-slate-300">{JSON.stringify(experimentResult.beforeState, null, 2)}</pre>
              </div>
              <div className="p-3.5 rounded-xl border space-y-1" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                <p className="font-bold text-emerald-400">After State</p>
                <pre className="text-[11px] font-mono text-slate-300">{JSON.stringify(experimentResult.afterState, null, 2)}</pre>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
