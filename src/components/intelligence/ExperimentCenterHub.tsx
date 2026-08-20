/**
 * v10.1 — Diagnostic Experiment Center (P1-A #3)
 *
 * The controlled-experiment workflow as a first-class object:
 *
 *   Hypothesis → Evidence → Proposal → USER APPROVAL → Before snapshot
 *              → Controlled action → After snapshot → Difference → Evidence strength
 *
 * Two invariants this page exists to enforce visually:
 *   1. Nothing runs before the user approves it. The approval gate is a real server-side
 *      stage, and attempting to capture a baseline before it returns 409.
 *   2. A completed experiment prints, every time, that it does NOT establish permanent
 *      causal truth. Results accumulate as evidence strength across repeated runs;
 *      a contradicting repeat downgrades the working conclusion instead of being dropped.
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { tabTransition } from '../../motion';
import {
  FlaskConical, RefreshCw, ShieldAlert, CheckCircle2, XCircle,
  Play, Camera, BarChart3, AlertTriangle, Undo2, Layers,
} from 'lucide-react';
import { EvidenceBasisStrip } from './EvidenceQualityBadge';

const STAGE_ORDER = [
  'AWAITING_APPROVAL', 'APPROVED', 'BASELINE_CAPTURE', 'INTERVENTION', 'AFTER_CAPTURE', 'COMPLETE',
];
const STAGE_LABEL: Record<string, string> = {
  AWAITING_APPROVAL: 'Awaiting your approval',
  APPROVED: 'Approved',
  BASELINE_CAPTURE: 'Before snapshot taken',
  INTERVENTION: 'Action applied',
  AFTER_CAPTURE: 'After snapshot taken',
  COMPLETE: 'Analysed',
  REJECTED: 'Declined',
  ABORTED: 'Aborted',
};

const STRENGTH_STYLE: Record<string, { color: string; bg: string }> = {
  'Strong supporting evidence':        { color: '#15803d', bg: 'rgba(34,197,94,0.12)' },
  'Moderate supporting evidence':      { color: '#2563eb', bg: 'rgba(59,130,246,0.12)' },
  'Weak supporting evidence':          { color: '#b45309', bg: 'rgba(245,158,11,0.12)' },
  'No measurable effect':              { color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
  'Contradicts the hypothesis':        { color: '#b91c1c', bg: 'rgba(239,68,68,0.12)' },
  'Inconclusive — measurement unreliable': { color: '#7c3aed', bg: 'rgba(139,92,246,0.12)' },
};

export default function ExperimentCenterHub() {
  const [catalogue, setCatalogue] = useState<any[]>([]);
  const [limitation, setLimitation] = useState('');
  const [experiments, setExperiments] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [active, setActive] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const load = async () => {
    try {
      const [cRes, eRes, lRes] = await Promise.all([
        fetch('/api/intelligence/experiments/catalogue'),
        fetch('/api/intelligence/experiments'),
        fetch('/api/intelligence/evidence-ledger'),
      ]);
      if (cRes.ok) { const c = await cRes.json(); setCatalogue(c.experiments || []); setLimitation(c.limitation || ''); }
      if (eRes.ok) setExperiments((await eRes.json()).experiments || []);
      if (lRes.ok) { const l = await lRes.json(); setLedger(l.bodies || []); }
    } catch { /* the page degrades to empty rather than inventing content */ }
  };
  useEffect(() => { load(); }, []);

  const call = async (url: string, body?: any) => {
    setBusy(true); setNotice(null);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {}),
      });
      const json = await res.json();
      if (!res.ok) { setNotice({ kind: 'err', text: `${json.code}: ${json.error}${json.remediation ? ` — ${json.remediation}` : ''}` }); return null; }
      return json;
    } catch {
      setNotice({ kind: 'err', text: 'The experiment service is not reachable.' });
      return null;
    } finally { setBusy(false); }
  };

  const refreshActive = async (id: string) => {
    const res = await fetch(`/api/intelligence/experiments/${id}`);
    if (res.ok) setActive(await res.json());
    load();
  };

  const propose = async (catalogueId: string) => {
    const exp = await call('/api/intelligence/experiments/propose', { catalogueId });
    if (exp) { setActive(exp); load(); setNotice({ kind: 'ok', text: 'Proposed. Nothing has run — the experiment is waiting for your approval.' }); }
  };

  /** Deliberately exposed: proves the gate is real, not cosmetic. */
  const attemptBeforeApproval = async () => {
    if (!active) return;
    await call(`/api/intelligence/experiments/${active.experimentId}/before`, { telemetry: { memoryPressurePct: 87 } });
    refreshActive(active.experimentId);
  };

  const approve = async () => {
    if (!active) return;
    const r = await call(`/api/intelligence/experiments/${active.experimentId}/approve`, { approvedBy: 'user' });
    if (r) { setNotice({ kind: 'ok', text: 'Approved by you. The experiment may now capture its baseline.' }); refreshActive(active.experimentId); }
  };
  const reject = async () => {
    if (!active) return;
    const r = await call(`/api/intelligence/experiments/${active.experimentId}/reject`, { reason: 'Declined by user' });
    if (r) { setNotice({ kind: 'ok', text: 'Declined. Nothing was run.' }); refreshActive(active.experimentId); }
  };

  const snapshot = async (which: 'before' | 'after') => {
    if (!active) return;
    // Snapshots come from the live collector, never from numbers typed into the client.
    const tRes = await fetch('/api/intelligence/telemetry');
    if (!tRes.ok) { setNotice({ kind: 'err', text: 'Telemetry unavailable — a snapshot cannot be faked.' }); return; }
    const t = await tRes.json();
    const r = await call(`/api/intelligence/experiments/${active.experimentId}/${which}`, { telemetry: t.telemetry });
    if (r) refreshActive(active.experimentId);
  };

  const analyze = async () => {
    if (!active) return;
    const r = await call(`/api/intelligence/experiments/${active.experimentId}/analyze`, {});
    if (r) refreshActive(active.experimentId);
  };

  const stageIndex = active ? STAGE_ORDER.indexOf(active.stage) : -1;
  const result = active?.result;
  const strengthStyle = result ? (STRENGTH_STYLE[result.strength] || STRENGTH_STYLE['No measurable effect']) : null;

  return (
    <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="pill bg-cyan-500/10 text-cyan-500 border-cyan-500/25">
              <FlaskConical size={12} /> Controlled Experiments
            </span>
          </div>
          <h1 className="text-hero font-extrabold tracking-tight" style={{ color: 'var(--color-ink)' }}>
            Diagnostic Experiment Center
          </h1>
          <p className="mt-1 text-[14px]" style={{ color: 'var(--color-ink-3)' }}>
            Test a hypothesis by changing one thing under controlled conditions and measuring the difference.
            Nothing runs without your explicit approval.
          </p>
        </div>
        <button onClick={load} disabled={busy} className="btn btn-ghost text-xs cursor-pointer">
          <RefreshCw size={13} className={busy ? 'animate-spin-smooth' : ''} /><span>Refresh</span>
        </button>
      </div>

      {limitation && (
        <div className="flex items-start gap-2 p-3 rounded-xl border text-[12px]"
             style={{ backgroundColor: 'rgba(139,92,246,0.08)', borderColor: 'rgba(139,92,246,0.30)', color: '#7c3aed' }}>
          <ShieldAlert size={15} className="shrink-0 mt-0.5" />
          <span><strong>Epistemic limit:</strong> {limitation}</span>
        </div>
      )}

      {notice && (
        <div className="p-3 rounded-xl border text-[12px] flex items-start gap-2"
             style={notice.kind === 'ok'
               ? { backgroundColor: 'rgba(34,197,94,0.10)', borderColor: 'rgba(34,197,94,0.30)', color: '#15803d' }
               : { backgroundColor: 'rgba(239,68,68,0.10)', borderColor: 'rgba(239,68,68,0.30)', color: '#b91c1c' }}>
          {notice.kind === 'ok' ? <CheckCircle2 size={15} className="shrink-0 mt-0.5" /> : <AlertTriangle size={15} className="shrink-0 mt-0.5" />}
          <span>{notice.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Catalogue */}
        <div className="card p-5 space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--color-ink-3)' }}>
            Available experiments
          </h3>
          {catalogue.map((c) => (
            <div key={c.id} className="p-3 rounded-xl border space-y-2" style={{ borderColor: 'var(--color-line)', backgroundColor: 'var(--color-surface-2)' }}>
              <div className="text-[13px] font-bold" style={{ color: 'var(--color-ink)' }}>{c.title}</div>
              <div className="text-[11px]" style={{ color: 'var(--color-ink-3)' }}>{c.hypothesis}</div>
              <div className="flex flex-wrap gap-1.5 text-[10px]">
                <span className="pill" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-line)', color: 'var(--color-ink-3)' }}>
                  {c.intervention?.reversible ? 'Reversible' : 'Irreversible'}
                </span>
                <span className="pill" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-line)', color: 'var(--color-ink-3)' }}>
                  ~{c.durationSec}s
                </span>
              </div>
              <div className="text-[11px]" style={{ color: '#b45309' }}>{c.risk}</div>
              <button onClick={() => propose(c.id)} disabled={busy} className="btn btn-ghost text-[11px] w-full cursor-pointer">
                Propose experiment
              </button>
            </div>
          ))}
        </div>

        {/* Active workflow */}
        <div className="card p-5 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--color-ink-3)' }}>
              Workflow
            </h3>
            {experiments.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {experiments.slice(-6).map((e) => (
                  <button key={e.experimentId} onClick={() => refreshActive(e.experimentId)}
                    className="px-2 py-0.5 rounded font-mono text-[10px] cursor-pointer hover:opacity-80"
                    style={{
                      backgroundColor: active?.experimentId === e.experimentId ? '#3b82f6' : 'var(--color-surface-2)',
                      color: active?.experimentId === e.experimentId ? '#fff' : 'var(--color-ink-3)',
                    }}
                    title={`${e.hypothesis} — ${e.stage}`}>
                    {e.experimentId}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!active && (
            <p className="text-[13px]" style={{ color: 'var(--color-ink-3)' }}>
              Propose an experiment to begin. The workflow will pause at the approval gate.
            </p>
          )}

          {active && (
            <>
              <div className="space-y-1">
                <div className="text-[15px] font-extrabold" style={{ color: 'var(--color-ink)' }}>{active.title}</div>
                <div className="text-[12px]" style={{ color: 'var(--color-ink-3)' }}>
                  <strong>Hypothesis:</strong> {active.hypothesis}
                </div>
                <div className="text-[10px] font-mono" style={{ color: 'var(--color-ink-3)' }}>{active.experimentId}</div>
              </div>

              {/* Stage rail */}
              <div className="flex flex-wrap items-center gap-1.5">
                {STAGE_ORDER.map((s, i) => {
                  const done = stageIndex >= i && stageIndex !== -1;
                  const isNow = active.stage === s;
                  const isGate = s === 'AWAITING_APPROVAL';
                  return (
                    <div key={s} className="flex items-center gap-1.5">
                      <span
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold border whitespace-nowrap"
                        style={isNow
                          ? { backgroundColor: isGate ? '#f59e0b' : '#3b82f6', color: '#fff', borderColor: 'transparent' }
                          : done
                            ? { backgroundColor: 'rgba(34,197,94,0.12)', color: '#15803d', borderColor: 'rgba(34,197,94,0.30)' }
                            : { backgroundColor: 'var(--color-surface-2)', color: 'var(--color-ink-3)', borderColor: 'var(--color-line)' }}
                      >
                        {isGate && '🔒 '}{STAGE_LABEL[s] || s}
                      </span>
                      {i < STAGE_ORDER.length - 1 && <span style={{ color: 'var(--color-ink-3)' }}>→</span>}
                    </div>
                  );
                })}
              </div>

              {/* Proposal + approval gate */}
              {active.stage === 'AWAITING_APPROVAL' && (
                <motion.div {...tabTransition}
                  className="p-4 rounded-xl border-2 space-y-3"
                  style={{ borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.06)' }}>
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={16} style={{ color: '#b45309' }} />
                    <span className="text-[13px] font-extrabold" style={{ color: '#b45309' }}>Approval required — nothing has run</span>
                  </div>
                  <dl className="text-[12px] space-y-1" style={{ color: 'var(--color-ink-2)' }}>
                    <div><strong>What will happen:</strong> {active.proposal?.whatWillHappen}</div>
                    <div><strong>Reversible:</strong> {active.proposal?.reversible ? 'Yes' : 'No'}</div>
                    <div><strong>How to undo:</strong> {active.proposal?.howToUndo || '—'}</div>
                    <div><strong>Duration:</strong> ~{active.proposal?.estimatedDurationSec}s</div>
                  </dl>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={approve} disabled={busy} className="btn btn-primary text-xs cursor-pointer">
                      <CheckCircle2 size={13} /> Approve and run
                    </button>
                    <button onClick={reject} disabled={busy} className="btn btn-ghost text-xs cursor-pointer">
                      <XCircle size={13} /> Decline
                    </button>
                    <button onClick={attemptBeforeApproval} disabled={busy} className="btn btn-ghost text-xs cursor-pointer"
                      title="Demonstrates that the approval gate is enforced server-side">
                      Try to skip the gate
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Run controls */}
              {['APPROVED', 'BASELINE_CAPTURE', 'INTERVENTION', 'AFTER_CAPTURE'].includes(active.stage) && (
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => snapshot('before')} disabled={busy || active.stage !== 'APPROVED'} className="btn btn-ghost text-xs cursor-pointer">
                    <Camera size={13} /> Capture before
                  </button>
                  <button onClick={() => snapshot('after')} disabled={busy || !active.before} className="btn btn-ghost text-xs cursor-pointer">
                    <Play size={13} /> Capture after
                  </button>
                  <button onClick={analyze} disabled={busy || !active.after} className="btn btn-primary text-xs cursor-pointer">
                    <BarChart3 size={13} /> Analyse difference
                  </button>
                </div>
              )}

              {/* Result */}
              {result && (
                <div className="p-4 rounded-xl border space-y-3" style={{ borderColor: 'var(--color-line)', backgroundColor: 'var(--color-surface-2)' }}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-lg text-[12px] font-extrabold"
                          style={{ color: strengthStyle!.color, backgroundColor: strengthStyle!.bg }}>
                      {result.strength}
                    </span>
                    <span className="text-[11px] font-mono" style={{ color: 'var(--color-ink-3)' }}>
                      {result.durationSec}s
                    </span>
                  </div>
                  <p className="text-[12px]" style={{ color: 'var(--color-ink-2)' }}>{result.rationale}</p>

                  {/* Differences */}
                  <div className="space-y-1">
                    {Object.entries(result.deltas || {}).map(([k, d]: [string, any]) => (
                      <div key={k} className="flex items-center justify-between text-[12px] px-3 py-1.5 rounded-lg"
                           style={{ backgroundColor: 'var(--color-surface)' }}>
                        <span className="font-mono" style={{ color: 'var(--color-ink-3)' }}>{k}</span>
                        {d.readable ? (
                          <span className="font-mono font-bold" style={{ color: 'var(--color-ink)' }}>
                            {d.before} → {d.after} <span style={{ color: d.delta < 0 ? '#15803d' : '#b91c1c' }}>({d.delta > 0 ? '+' : ''}{d.delta})</span>
                          </span>
                        ) : (
                          <span className="font-mono text-[11px]" style={{ color: '#b45309' }}>not measurable — excluded from the result</span>
                        )}
                      </div>
                    ))}
                  </div>
                  {result.unreadableMetrics > 0 && (
                    <div className="text-[11px]" style={{ color: '#b45309' }}>
                      ⚠ {result.unreadableMetrics} metric(s) could not be read in both snapshots and were excluded rather than treated as unchanged.
                    </div>
                  )}

                  {/* The non-negotiable disclaimer */}
                  <div className="p-3 rounded-lg border-l-4 text-[12px]"
                       style={{ borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.08)', color: '#6d28d9' }}>
                    <strong>Not proof.</strong> {result.causalStatus?.statement}
                    {(result.causalStatus?.confounders || []).length > 0 && (
                      <ul className="mt-2 space-y-0.5 list-disc list-inside">
                        {result.causalStatus.confounders.map((c: string, i: number) => <li key={i}>{c}</li>)}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {active.evidenceQuality && <EvidenceBasisStrip summary={active.evidenceQuality} />}
            </>
          )}
        </div>
      </div>

      {/* Evidence ledger */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Layers size={16} style={{ color: 'var(--color-ink-3)' }} />
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--color-ink-3)' }}>
            Evidence ledger — accumulated across runs
          </h3>
        </div>
        <p className="text-[12px]" style={{ color: 'var(--color-ink-3)' }}>
          A single result is one observation. Conclusions strengthen only with replication, and a contradicting
          repeat downgrades the working conclusion rather than being discarded.
        </p>
        {ledger.length === 0 && (
          <p className="text-[12px]" style={{ color: 'var(--color-ink-3)' }}>No experiments have been run yet.</p>
        )}
        {ledger.map((h: any) => (
          <div key={h.hypothesisKey} className="p-3 rounded-xl border space-y-1" style={{ borderColor: 'var(--color-line)', backgroundColor: 'var(--color-surface-2)' }}>
            <div className="text-[12px] font-bold" style={{ color: 'var(--color-ink)' }}>{h.hypothesisKey}</div>
            <div className="flex flex-wrap gap-2 text-[11px]" style={{ color: 'var(--color-ink-3)' }}>
              <span className="pill" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-line)' }}>
                {h.totalRuns ?? 0} run(s)
              </span>
              {h.replicationTier && (
                <span className="pill" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-line)' }}>
                  {h.replicationTier}
                </span>
              )}
              {h.contradictingRuns > 0 && (
                <span className="pill" style={{ backgroundColor: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.30)', color: '#b91c1c' }}>
                  <Undo2 size={10} /> {h.contradictingRuns} contradicting
                </span>
              )}
            </div>
            {h.workingConclusion && (
              <div className="text-[12px]" style={{ color: 'var(--color-ink-2)' }}>
                <strong>Working conclusion:</strong> {h.workingConclusion}
              </div>
            )}
            {h.epistemicStatus && (
              <div className="text-[11px] italic" style={{ color: '#7c3aed' }}>{h.epistemicStatus}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
