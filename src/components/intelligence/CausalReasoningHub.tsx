/**
 * v10.1 — "Why NOT?" Causal Reasoning Hub (P1-A #2)
 *
 * Answers "Why is my Mac slow?" by ranking candidate causes with a percentage and a
 * bar, then — the part that matters — showing why each rejected cause was rejected and
 * which causes could not be evaluated at all.
 *
 * The page never computes a diagnosis client-side. It calls /api/intelligence/diagnose,
 * which collects real telemetry and runs the reasoner over it. If a discriminator could
 * not be measured, the cause depending on it is shown as UNDETERMINED — never as "fine".
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, RefreshCw, XCircle, HelpCircle, CheckCircle2,
  ChevronDown, AlertTriangle, FlaskConical, Search,
} from 'lucide-react';
import { EvidenceRow, EvidenceBasisStrip, CoverageNotice, EvidenceQualityBadge } from './EvidenceQualityBadge';

const VERDICT_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  LIKELY:        { color: '#b91c1c', bg: 'rgba(239,68,68,0.12)',  label: 'Likely' },
  POSSIBLE:      { color: '#b45309', bg: 'rgba(245,158,11,0.12)', label: 'Possible' },
  UNLIKELY:      { color: '#2563eb', bg: 'rgba(59,130,246,0.12)', label: 'Unlikely' },
  RULED_OUT:     { color: '#15803d', bg: 'rgba(34,197,94,0.12)',  label: 'Ruled out' },
  INDETERMINATE: { color: '#7c3aed', bg: 'rgba(139,92,246,0.12)', label: 'Undetermined' },
};

export default function CausalReasoningHub() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState('Why is my Mac slow?');
  const [openCause, setOpenCause] = useState<string | null>(null);
  const [showEvidence, setShowEvidence] = useState(false);

  const run = async (q: string) => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/intelligence/diagnose?question=${encodeURIComponent(q)}`);
      const body = await res.json();
      if (!res.ok) { setError(body.error || 'Diagnosis failed.'); setData(null); }
      else { setData(body); setOpenCause(body.leadingCause?.id || null); }
    } catch {
      setError('The diagnostic service is not reachable. No diagnosis is shown rather than a guessed one.');
      setData(null);
    } finally { setLoading(false); }
  };

  useEffect(() => { run(question); /* eslint-disable-next-line */ }, []);

  const ranking: any[] = data?.ranking || [];
  const ruledOut: any[] = data?.ruledOut || [];
  const undetermined: any[] = data?.undetermined || [];
  const leading = data?.leadingCause || null;
  const coverage = data?.collection?.coverage;

  return (
    <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="pill bg-violet-500/10 text-violet-500 border-violet-500/25">
              <Brain size={12} /> Causal Reasoning
            </span>
            <span className="pill" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-ink-3)', borderColor: 'var(--color-line)' }}>
              Ranked causes with explicit rejections
            </span>
          </div>
          <h1 className="text-hero font-extrabold tracking-tight" style={{ color: 'var(--color-ink)' }}>
            Why NOT? — Root Cause Analysis
          </h1>
          <p className="mt-1 text-[14px]" style={{ color: 'var(--color-ink-3)' }}>
            Every candidate cause is scored against real measurements. Causes that were excluded say why they were
            excluded; causes that could not be measured are reported as undetermined rather than healthy.
          </p>
        </div>
        <button onClick={() => run(question)} disabled={loading} className="btn btn-ghost text-xs cursor-pointer">
          <RefreshCw size={13} className={loading ? 'animate-spin-smooth' : ''} />
          <span>Re-run diagnosis</span>
        </button>
      </div>

      {/* Question */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <Search size={16} style={{ color: 'var(--color-ink-3)' }} className="shrink-0 hidden sm:block" />
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') run(question); }}
          className="flex-1 bg-transparent outline-none text-[14px] font-medium"
          style={{ color: 'var(--color-ink)' }}
          placeholder="Why is my Mac slow?"
        />
        <button onClick={() => run(question)} disabled={loading} className="btn btn-primary text-xs cursor-pointer">
          Analyse
        </button>
      </div>

      {error && (
        <div className="card p-4 flex items-start gap-3 border-l-4 border-l-red-500">
          <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-bold" style={{ color: 'var(--color-ink)' }}>No diagnosis available</div>
            <div className="text-[12px] mt-0.5" style={{ color: 'var(--color-ink-3)' }}>{error}</div>
          </div>
        </div>
      )}

      {data && (
        <>
          <CoverageNotice qualifier={coverage?.qualifier} />

          {/* Verdict */}
          <div className="card p-6 space-y-3" style={{ borderLeft: `4px solid ${leading ? '#ef4444' : '#8b5cf6'}` }}>
            <div className="flex items-center gap-2">
              {leading
                ? <CheckCircle2 size={18} className="text-red-500" />
                : <HelpCircle size={18} className="text-violet-500" />}
              <h2 className="text-lg font-extrabold" style={{ color: 'var(--color-ink)' }}>
                {leading
                  ? `Leading cause: ${leading.label}`
                  : 'No single cause is supported by the available evidence'}
              </h2>
            </div>
            {!leading && (
              <p className="text-[13px]" style={{ color: 'var(--color-ink-3)' }}>
                {data.ambiguity?.reason
                  || 'The measurements collected do not point decisively at one cause. Rather than name a likely-sounding culprit, the suite reports the ambiguity.'}
              </p>
            )}
            {leading && !data.isDecisive && (
              <p className="text-[13px]" style={{ color: '#b45309' }}>
                This cause leads the ranking but does not clearly beat the runner-up, so it is presented as the current
                best explanation rather than a settled conclusion.
              </p>
            )}
            <EvidenceBasisStrip summary={data.collection?.evidenceQuality} />
          </div>

          {/* Ranking */}
          <div className="card p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--color-ink-3)' }}>
              Ranked candidate causes
            </h3>
            <div className="space-y-2">
              {ranking.map((c) => {
                const vs = VERDICT_STYLE[c.verdict] || VERDICT_STYLE.INDETERMINATE;
                const isOpen = openCause === c.id;
                const full = (data.candidates || []).find((x: any) => x.id === c.id);
                return (
                  <div key={c.id} className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-line)' }}>
                    <button
                      onClick={() => setOpenCause(isOpen ? null : c.id)}
                      className="w-full flex items-center gap-3 p-3 text-left cursor-pointer"
                      style={{ backgroundColor: 'var(--color-surface-2)' }}
                    >
                      <span className="text-[13px] font-bold w-56 shrink-0 truncate" style={{ color: 'var(--color-ink)' }}>
                        {c.label}
                      </span>
                      <span className="font-mono text-[13px] font-extrabold w-12 text-right" style={{ color: vs.color }}>
                        {c.score}%
                      </span>
                      <span className="font-mono text-[13px] tracking-tighter flex-1 truncate" style={{ color: vs.color }}>
                        {c.bar || '—'}
                      </span>
                      <span className="pill text-[10px] font-bold shrink-0" style={{ color: vs.color, backgroundColor: vs.bg, borderColor: vs.bg }}>
                        {vs.label}
                      </span>
                      <span className="text-[10px] font-mono shrink-0 hidden md:inline" style={{ color: 'var(--color-ink-3)' }}>
                        {c.coveragePct}% measured
                      </span>
                      <ChevronDown size={14} className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--color-ink-3)' }} />
                    </button>

                    <AnimatePresence>
                      {isOpen && full && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 space-y-3 border-t" style={{ borderColor: 'var(--color-line)' }}>
                            <p className="text-[12px] italic" style={{ color: 'var(--color-ink-3)' }}>{full.mechanism}</p>

                            {full.reasoning?.question && (
                              <div className="text-[13px] font-bold" style={{ color: 'var(--color-ink)' }}>
                                {full.reasoning.question}
                              </div>
                            )}
                            {(full.reasoning?.basis || []).map((b: string, i: number) => (
                              <div key={i} className="flex items-start gap-2 text-[12px]" style={{ color: 'var(--color-ink-2)' }}>
                                <span className="text-emerald-500 font-bold shrink-0">✓</span><span>{b}</span>
                              </div>
                            ))}
                            {(full.reasoning?.counterpoints || []).length > 0 && (
                              <>
                                <div className="text-[11px] font-bold uppercase tracking-wider mt-2" style={{ color: 'var(--color-ink-3)' }}>
                                  Evidence against
                                </div>
                                {full.reasoning.counterpoints.map((b: string, i: number) => (
                                  <div key={i} className="flex items-start gap-2 text-[12px]" style={{ color: 'var(--color-ink-2)' }}>
                                    <span className="text-red-500 font-bold shrink-0">✗</span><span>{b}</span>
                                  </div>
                                ))}
                              </>
                            )}
                            {(full.reasoning?.caveats || []).map((b: string, i: number) => (
                              <div key={i} className="flex items-start gap-2 text-[12px]" style={{ color: '#b45309' }}>
                                <span className="font-bold shrink-0">⚠</span><span>{b}</span>
                              </div>
                            ))}

                            {full.evidenceQuality && <EvidenceBasisStrip summary={full.evidenceQuality} />}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Why NOT */}
          {ruledOut.length > 0 && (
            <div className="card p-6 space-y-3">
              <div className="flex items-center gap-2">
                <XCircle size={16} className="text-emerald-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--color-ink-3)' }}>
                  What was ruled out — and why
                </h3>
              </div>
              {ruledOut.map((r) => (
                <div key={r.id} className="p-3 rounded-xl border" style={{ borderColor: 'var(--color-line)', backgroundColor: 'var(--color-surface-2)' }}>
                  <div className="text-[13px] font-bold" style={{ color: 'var(--color-ink)' }}>{r.question}</div>
                  <div className="text-[12px] mt-1" style={{ color: 'var(--color-ink-2)' }}>{r.answer}</div>
                  {r.decisiveMeasurement && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[11px] font-mono" style={{ color: 'var(--color-ink-3)' }}>
                        Decided by {r.decisiveMeasurement.label}: <strong>{String(r.decisiveMeasurement.observedValue)}</strong>
                      </span>
                      <EvidenceQualityBadge quality={r.decisiveMeasurement.quality} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Undetermined */}
          {undetermined.length > 0 && (
            <div className="card p-6 space-y-3 border-l-4 border-l-violet-500">
              <div className="flex items-center gap-2">
                <HelpCircle size={16} className="text-violet-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--color-ink-3)' }}>
                  Could not be evaluated — neither confirmed nor excluded
                </h3>
              </div>
              <p className="text-[12px]" style={{ color: 'var(--color-ink-3)' }}>
                These causes are not "fine". The measurements needed to test them could not be read on this system, so
                the suite declines to draw a conclusion about them.
              </p>
              {undetermined.map((u) => (
                <div key={u.id} className="p-3 rounded-xl border" style={{ borderColor: 'rgba(139,92,246,0.30)', backgroundColor: 'rgba(139,92,246,0.06)' }}>
                  <div className="text-[13px] font-bold" style={{ color: 'var(--color-ink)' }}>{u.label}</div>
                  <div className="text-[12px] mt-1" style={{ color: 'var(--color-ink-2)' }}>
                    {u.reasoning?.answer || u.answer || 'None of the measurements needed to test this could be read.'}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Measurements */}
          <div className="card p-6 space-y-3">
            <button
              onClick={() => setShowEvidence((v) => !v)}
              className="w-full flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <FlaskConical size={16} style={{ color: 'var(--color-ink-3)' }} />
                <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--color-ink-3)' }}>
                  Underlying measurements ({data.collection?.evidence?.length || 0})
                </h3>
              </div>
              <ChevronDown size={16} className={`transition-transform ${showEvidence ? 'rotate-180' : ''}`} style={{ color: 'var(--color-ink-3)' }} />
            </button>
            {showEvidence && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-mono" style={{ color: 'var(--color-ink-3)' }}>
                  Collected {data.collection?.collectedAt} · platform {data.collection?.platform} ·
                  {' '}{coverage?.discriminatorsMeasured}/{coverage?.discriminatorsTotal} inputs measured
                </div>
                {(data.collection?.evidence || []).map((ev: any, i: number) => <EvidenceRow key={i} ev={ev} />)}
              </div>
            )}
          </div>

          {/* Plain-text rendering */}
          {data.rendered && (
            <details className="card p-4">
              <summary className="text-[12px] font-bold cursor-pointer uppercase tracking-wider" style={{ color: 'var(--color-ink-3)' }}>
                Plain-text report
              </summary>
              <pre className="mt-3 text-[11px] font-mono whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--color-ink-2)' }}>
                {data.rendered}
              </pre>
            </details>
          )}
        </>
      )}
    </div>
  );
}
