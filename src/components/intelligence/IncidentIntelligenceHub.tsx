/**
 * v10.1 — Incident Intelligence Center (P1-A #1, #4)
 *
 * One page per incident showing the whole evidentiary picture: identity, severity,
 * enforced lifecycle, root-cause candidates, what was ruled out, what could not be
 * evaluated, the causal timeline with correlation strength, experiments performed,
 * before/after verification and the operation IDs that tie every action back to an
 * audit record.
 *
 * Lifecycle: Detected → Investigating → Confirmed → Repairing → Verifying →
 *            Resolved / Unresolved. Illegal jumps are refused by the server, and
 *            RESOLVED additionally requires a PASSED verification.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { tabTransition } from '../../motion';
import {
  Siren, RefreshCw, Plus, ChevronRight, ShieldCheck, XCircle,
  HelpCircle, Clock, AlertTriangle, CheckCircle2, GitBranch, FlaskConical, Hash,
} from 'lucide-react';
import { EvidenceBasisStrip, CoverageNotice, EvidenceQualityBadge } from './EvidenceQualityBadge';

const LIFECYCLE = ['DETECTED', 'INVESTIGATING', 'CONFIRMED', 'REPAIRING', 'VERIFYING', 'RESOLVED'];

const STATUS_COLOR: Record<string, string> = {
  DETECTED: '#f59e0b', INVESTIGATING: '#3b82f6', CONFIRMED: '#ef4444',
  REPAIRING: '#8b5cf6', VERIFYING: '#06b6d4', RESOLVED: '#22c55e', UNRESOLVED: '#64748b',
};

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: '#b91c1c', HIGH: '#ef4444', MEDIUM: '#f59e0b', LOW: '#3b82f6', INFO: '#64748b',
};

export default function IncidentIntelligenceHub() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const load = async () => {
    try {
      const res = await fetch('/api/intelligence/incidents');
      if (res.ok) setIncidents((await res.json()).incidents || []);
    } catch { /* empty rather than invented */ }
  };
  useEffect(() => { load(); }, []);

  const open = async (id: string) => {
    const res = await fetch(`/api/intelligence/incidents/${id}`);
    if (res.ok) setSelected(await res.json());
  };

  /** Opens an incident from LIVE telemetry — never from numbers chosen by the client. */
  const openFromTelemetry = async () => {
    setBusy(true); setNotice(null);
    try {
      const res = await fetch('/api/intelligence/incidents/from-telemetry', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'System slowness reported', severity: 'HIGH', symptom: 'The system feels slow' }),
      });
      const body = await res.json();
      if (!res.ok) setNotice({ kind: 'err', text: `${body.code}: ${body.error}` });
      else { setSelected(body); load(); }
    } catch { setNotice({ kind: 'err', text: 'Telemetry unavailable — an incident is not opened without measurements.' }); }
    finally { setBusy(false); }
  };

  const transition = async (status: string) => {
    if (!selected) return;
    setBusy(true); setNotice(null);
    try {
      const res = await fetch(`/api/intelligence/incidents/${selected.id}/transition`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const body = await res.json();
      if (!res.ok) setNotice({ kind: 'err', text: `Refused — ${body.error}` });
      else { setSelected(body); load(); }
    } finally { setBusy(false); }
  };

  const d = selected;

  return (
    <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="pill bg-amber-500/10 text-amber-500 border-amber-500/25">
              <Siren size={12} /> Incident Intelligence
            </span>
          </div>
          <h1 className="text-hero font-extrabold tracking-tight" style={{ color: 'var(--color-ink)' }}>
            Incident Intelligence Center
          </h1>
          <p className="mt-1 text-[14px]" style={{ color: 'var(--color-ink-3)' }}>
            The full evidentiary record for each incident — including what was ruled out, what could not be evaluated,
            and every operation ID.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={openFromTelemetry} disabled={busy} className="btn btn-primary text-xs cursor-pointer">
            <Plus size={13} /> Open from live telemetry
          </button>
          <button onClick={load} disabled={busy} className="btn btn-ghost text-xs cursor-pointer">
            <RefreshCw size={13} className={busy ? 'animate-spin-smooth' : ''} />
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-3 rounded-xl border text-[12px] flex items-start gap-2"
             style={notice.kind === 'ok'
               ? { backgroundColor: 'rgba(34,197,94,0.10)', borderColor: 'rgba(34,197,94,0.30)', color: '#15803d' }
               : { backgroundColor: 'rgba(239,68,68,0.10)', borderColor: 'rgba(239,68,68,0.30)', color: '#b91c1c' }}>
          <AlertTriangle size={15} className="shrink-0 mt-0.5" /><span>{notice.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* List */}
        <div className="card p-4 space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--color-ink-3)' }}>
            Incidents ({incidents.length})
          </h3>
          {incidents.length === 0 && (
            <p className="text-[12px]" style={{ color: 'var(--color-ink-3)' }}>
              No incidents recorded. None are invented for display.
            </p>
          )}
          {incidents.map((i) => (
            <button key={i.id} onClick={() => open(i.id)}
              className="w-full text-left p-3 rounded-xl border cursor-pointer transition-all hover:opacity-80"
              style={{
                borderColor: d?.id === i.id ? STATUS_COLOR[i.status] : 'var(--color-line)',
                backgroundColor: 'var(--color-surface-2)',
                borderLeftWidth: 3, borderLeftColor: STATUS_COLOR[i.status] || 'var(--color-line)',
              }}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-bold truncate" style={{ color: 'var(--color-ink)' }}>{i.title}</span>
                <ChevronRight size={13} style={{ color: 'var(--color-ink-3)' }} className="shrink-0" />
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span className="text-[10px] font-mono" style={{ color: 'var(--color-ink-3)' }}>{i.id}</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                      style={{ backgroundColor: `${STATUS_COLOR[i.status]}22`, color: STATUS_COLOR[i.status] }}>
                  {i.status}
                </span>
                {i.severity && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                        style={{ backgroundColor: `${SEVERITY_COLOR[i.severity]}22`, color: SEVERITY_COLOR[i.severity] }}>
                    {i.severity}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Detail */}
        <div className="lg:col-span-3 space-y-6">
          {!d && (
            <div className="card p-8 text-center">
              <Siren size={28} className="mx-auto mb-3" style={{ color: 'var(--color-ink-3)' }} />
              <p className="text-[13px]" style={{ color: 'var(--color-ink-3)' }}>
                Select an incident, or open one from live telemetry.
              </p>
            </div>
          )}

          {d && (
            <AnimatePresence mode="wait">
              <motion.div key={d.id} {...tabTransition} className="space-y-6">
                {/* Identity */}
                <div className="card p-6 space-y-3" style={{ borderLeft: `4px solid ${STATUS_COLOR[d.status]}` }}>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-extrabold" style={{ color: 'var(--color-ink)' }}>{d.title}</h2>
                    <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold"
                          style={{ backgroundColor: `${STATUS_COLOR[d.status]}22`, color: STATUS_COLOR[d.status] }}>
                      {d.statusLabel || d.status}
                    </span>
                    {d.severity && (
                      <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold"
                            style={{ backgroundColor: `${SEVERITY_COLOR[d.severity]}22`, color: SEVERITY_COLOR[d.severity] }}>
                        {d.severity}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]" style={{ color: 'var(--color-ink-3)' }}>
                    <div><div className="font-bold uppercase tracking-wider">Incident ID</div><div className="font-mono">{d.id}</div></div>
                    <div><div className="font-bold uppercase tracking-wider">First observed</div><div className="font-mono">{d.firstObserved}</div></div>
                    <div><div className="font-bold uppercase tracking-wider">Last observed</div><div className="font-mono">{d.lastObserved}</div></div>
                    <div><div className="font-bold uppercase tracking-wider">Occurrences</div><div className="font-mono">{d.occurrenceCount}</div></div>
                  </div>
                  {d.symptom && <p className="text-[13px]" style={{ color: 'var(--color-ink-2)' }}>{d.symptom}</p>}
                  <EvidenceBasisStrip summary={d.evidenceQuality} />
                  {d.containsEstimates && (
                    <div className="text-[11px]" style={{ color: '#b45309' }}>
                      ⚠ Some figures in this incident are estimates, marked individually. They are not measurements.
                    </div>
                  )}
                </div>

                {/* Lifecycle */}
                <div className="card p-6 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--color-ink-3)' }}>Lifecycle</h3>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {LIFECYCLE.map((s, i) => {
                      const passed = d.lifecycle?.history?.some((h: any) => h.to === s || h.status === s);
                      const isNow = d.status === s;
                      return (
                        <div key={s} className="flex items-center gap-1.5">
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold border whitespace-nowrap"
                                style={isNow
                                  ? { backgroundColor: STATUS_COLOR[s], color: '#fff', borderColor: 'transparent' }
                                  : passed
                                    ? { backgroundColor: 'rgba(34,197,94,0.12)', color: '#15803d', borderColor: 'rgba(34,197,94,0.30)' }
                                    : { backgroundColor: 'var(--color-surface-2)', color: 'var(--color-ink-3)', borderColor: 'var(--color-line)' }}>
                            {s}
                          </span>
                          {i < LIFECYCLE.length - 1 && <span style={{ color: 'var(--color-ink-3)' }}>→</span>}
                        </div>
                      );
                    })}
                    {d.status === 'UNRESOLVED' && (
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold ml-2"
                            style={{ backgroundColor: STATUS_COLOR.UNRESOLVED, color: '#fff' }}>UNRESOLVED</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-ink-3)' }}>
                      Legal next:
                    </span>
                    {(d.lifecycle?.nextLegalStates || []).map((s: string) => (
                      <button key={s} onClick={() => transition(s)} disabled={busy}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold border cursor-pointer hover:opacity-80"
                        style={{ borderColor: STATUS_COLOR[s], color: STATUS_COLOR[s] }}>
                        {s}
                      </button>
                    ))}
                    {(d.lifecycle?.nextLegalStates || []).length === 0 && (
                      <span className="text-[11px]" style={{ color: 'var(--color-ink-3)' }}>Terminal state.</span>
                    )}
                  </div>
                  {d.status === 'VERIFYING' && d.verification?.status !== 'PASSED' && (
                    <div className="text-[11px] p-2 rounded-lg" style={{ backgroundColor: 'rgba(245,158,11,0.10)', color: '#b45309' }}>
                      RESOLVED is withheld until verification passes. A repair that has not been verified is not a resolution.
                    </div>
                  )}
                </div>

                {/* Root cause */}
                <div className="card p-6 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--color-ink-3)' }}>
                    Root-cause candidates
                  </h3>
                  <CoverageNotice qualifier={typeof d.dataCompleteness === 'object' ? d.dataCompleteness?.qualifier : null} />
                  {!d.leadingCause && (
                    <div className="p-3 rounded-xl border-l-4 text-[12px]"
                         style={{ borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.08)', color: '#6d28d9' }}>
                      No cause is decisively supported. {d.ambiguity?.reason || ''}
                    </div>
                  )}
                  {(d.rootCauseCandidates || []).map((c: any) => (
                    <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: 'var(--color-surface-2)' }}>
                      <span className="text-[12px] font-bold w-52 shrink-0 truncate" style={{ color: 'var(--color-ink)' }}>{c.label}</span>
                      <span className="font-mono text-[12px] font-extrabold w-11 text-right" style={{ color: 'var(--color-ink)' }}>{c.score}%</span>
                      <span className="font-mono text-[12px] flex-1 truncate" style={{ color: '#3b82f6' }}>{c.bar}</span>
                      <span className="text-[10px] font-mono shrink-0" style={{ color: 'var(--color-ink-3)' }}>{c.verdict}</span>
                    </div>
                  ))}

                  {(d.ruledOut || []).length > 0 && (
                    <>
                      <div className="flex items-center gap-2 mt-3">
                        <XCircle size={14} className="text-emerald-500" />
                        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-ink-3)' }}>Ruled out</span>
                      </div>
                      {d.ruledOut.map((r: any) => (
                        <div key={r.id} className="p-2.5 rounded-lg text-[12px]" style={{ backgroundColor: 'var(--color-surface-2)' }}>
                          <div className="font-bold" style={{ color: 'var(--color-ink)' }}>{r.question}</div>
                          <div style={{ color: 'var(--color-ink-2)' }}>{r.answer}</div>
                          {r.decisiveMeasurement && (
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-mono" style={{ color: 'var(--color-ink-3)' }}>
                                {r.decisiveMeasurement.label}: {String(r.decisiveMeasurement.observedValue)}
                              </span>
                              <EvidenceQualityBadge quality={r.decisiveMeasurement.quality} />
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  )}

                  {(d.undetermined || []).length > 0 && (
                    <>
                      <div className="flex items-center gap-2 mt-3">
                        <HelpCircle size={14} className="text-violet-500" />
                        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-ink-3)' }}>
                          Could not be evaluated
                        </span>
                      </div>
                      {d.undetermined.map((u: any) => (
                        <div key={u.id} className="p-2.5 rounded-lg text-[12px]" style={{ backgroundColor: 'rgba(139,92,246,0.06)' }}>
                          <span className="font-bold" style={{ color: 'var(--color-ink)' }}>{u.label}</span>
                          <span style={{ color: 'var(--color-ink-2)' }}> — neither confirmed nor excluded.</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {/* Recommended actions */}
                <div className="card p-6 space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--color-ink-3)' }}>
                    Recommended actions
                  </h3>
                  {d.recommendedActions?.available === false ? (
                    <div className="p-3 rounded-xl border-l-4 text-[12px]"
                         style={{ borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.08)', color: '#b45309' }}>
                      <strong>No actions offered.</strong> {d.recommendedActions.reason}
                    </div>
                  ) : (
                    (d.recommendedActions?.actions || []).map((a: any, i: number) => (
                      <div key={i} className="p-3 rounded-xl border space-y-1" style={{ borderColor: 'var(--color-line)', backgroundColor: 'var(--color-surface-2)' }}>
                        <div className="text-[13px] font-bold" style={{ color: 'var(--color-ink)' }}>{a.label || a.action}</div>
                        {a.why && <div className="text-[12px]" style={{ color: 'var(--color-ink-2)' }}><strong>Why:</strong> {a.why}</div>}
                        {a.evidence && <div className="text-[12px]" style={{ color: 'var(--color-ink-2)' }}><strong>Evidence:</strong> {a.evidence}</div>}
                        <div className="text-[11px]" style={{ color: 'var(--color-ink-3)' }}>
                          Reversible: {a.reversible ? 'Yes' : 'No'}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Causal timeline */}
                <div className="card p-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <GitBranch size={15} style={{ color: 'var(--color-ink-3)' }} />
                    <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--color-ink-3)' }}>Causal timeline</h3>
                  </div>
                  {(d.timeline || []).length === 0 && (
                    <p className="text-[12px]" style={{ color: 'var(--color-ink-3)' }}>No correlated events recorded for this incident.</p>
                  )}
                  {(d.timeline || []).map((e: any, i: number) => (
                    <div key={i}>
                      <div className="flex items-start gap-3 p-3 rounded-xl border" style={{ borderColor: 'var(--color-line)', backgroundColor: 'var(--color-surface-2)' }}>
                        <Clock size={13} className="shrink-0 mt-0.5" style={{ color: 'var(--color-ink-3)' }} />
                        <div className="min-w-0 flex-1">
                          <div className="text-[12px] font-bold" style={{ color: 'var(--color-ink)' }}>{e.label}</div>
                          <div className="text-[10px] font-mono" style={{ color: 'var(--color-ink-3)' }}>{e.at}</div>
                          {e.detail && <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-ink-2)' }}>{e.detail}</div>}
                          {e.source && <div className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--color-ink-3)' }}>source: {e.source}</div>}
                        </div>
                        {e.quality && <EvidenceQualityBadge quality={e.quality} />}
                      </div>
                      {i < d.timeline.length - 1 && (
                        <div className="flex justify-center py-0.5 text-[14px]" style={{ color: 'var(--color-ink-3)' }}>↓</div>
                      )}
                    </div>
                  ))}
                  {d.correlation && (
                    <div className="p-3 rounded-xl text-[12px] space-y-1" style={{ backgroundColor: 'rgba(139,92,246,0.06)' }}>
                      <div style={{ color: 'var(--color-ink-2)' }}>
                        <strong>Chain strength:</strong> {d.correlation.chainStrength} ({d.correlation.links} link{d.correlation.links === 1 ? '' : 's'})
                      </div>
                      <div style={{ color: '#6d28d9' }}>{d.correlation.disclaimer}</div>
                    </div>
                  )}
                </div>

                {/* Experiments + verification */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="card p-6 space-y-3">
                    <div className="flex items-center gap-2">
                      <FlaskConical size={15} style={{ color: 'var(--color-ink-3)' }} />
                      <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--color-ink-3)' }}>Experiments performed</h3>
                    </div>
                    {(d.experiments || []).length === 0
                      ? <p className="text-[12px]" style={{ color: 'var(--color-ink-3)' }}>None.</p>
                      : d.experiments.map((e: any) => (
                        <div key={e.experimentId} className="p-2.5 rounded-lg text-[12px]" style={{ backgroundColor: 'var(--color-surface-2)' }}>
                          <div className="font-bold" style={{ color: 'var(--color-ink)' }}>{e.title || e.experimentId}</div>
                          <div className="text-[10px] font-mono" style={{ color: 'var(--color-ink-3)' }}>{e.experimentId} · {e.stage}</div>
                          {e.strength && <div style={{ color: 'var(--color-ink-2)' }}>{e.strength}</div>}
                        </div>
                      ))}
                  </div>

                  <div className="card p-6 space-y-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={15} style={{ color: 'var(--color-ink-3)' }} />
                      <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--color-ink-3)' }}>Before / after verification</h3>
                    </div>
                    {!d.verification
                      ? <p className="text-[12px]" style={{ color: 'var(--color-ink-3)' }}>Not verified.</p>
                      : (
                        <div className="space-y-1.5 text-[12px]">
                          <div className="flex items-center gap-2">
                            {d.verification.status === 'PASSED'
                              ? <CheckCircle2 size={14} className="text-emerald-500" />
                              : <AlertTriangle size={14} className="text-amber-500" />}
                            <span className="font-bold" style={{ color: 'var(--color-ink)' }}>{d.verification.status}</span>
                          </div>
                          {d.verification.verdict && <div style={{ color: 'var(--color-ink-2)' }}>{d.verification.verdict}</div>}
                        </div>
                      )}
                  </div>
                </div>

                {/* Operation IDs */}
                <div className="card p-6 space-y-2">
                  <div className="flex items-center gap-2">
                    <Hash size={15} style={{ color: 'var(--color-ink-3)' }} />
                    <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--color-ink-3)' }}>Operation IDs</h3>
                  </div>
                  {(d.operationIds || []).length === 0
                    ? <p className="text-[12px]" style={{ color: 'var(--color-ink-3)' }}>No operations executed for this incident.</p>
                    : (
                      <div className="flex flex-wrap gap-1.5">
                        {d.operationIds.map((o: string) => (
                          <span key={o} className="px-2 py-0.5 rounded font-mono text-[10px]"
                                style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-ink-2)' }}>{o}</span>
                        ))}
                      </div>
                    )}
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
