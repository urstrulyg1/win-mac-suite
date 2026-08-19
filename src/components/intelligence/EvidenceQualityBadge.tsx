/**
 * v10.1 — Evidence quality badge (P1-A / P1-B #12)
 *
 * Every number the suite prints inherits the quality of the evidence behind it.
 * This badge is the single visual vocabulary for that, so an estimate can never be
 * rendered with the same authority as a measurement.
 */

const QUALITY_STYLE: Record<string, { glyph: string; label: string; color: string; bg: string; border: string }> = {
  observed:    { glyph: '✓', label: 'Observed',    color: '#15803d', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.30)' },
  inferred:    { glyph: '⇒', label: 'Inferred',    color: '#2563eb', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.30)' },
  estimated:   { glyph: '~', label: 'Estimated',   color: '#b45309', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.30)' },
  unavailable: { glyph: '⚠', label: 'Unavailable', color: '#b91c1c', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.30)' },
  stale:       { glyph: '⏳', label: 'Stale',       color: '#7c3aed', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.30)' },
};

export function EvidenceQualityBadge({ quality, title }: { quality: string; title?: string }) {
  const s = QUALITY_STYLE[quality] || QUALITY_STYLE.unavailable;
  return (
    <span
      title={title || `Evidence quality: ${s.label}`}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border"
      style={{ color: s.color, backgroundColor: s.bg, borderColor: s.border }}
    >
      <span aria-hidden>{s.glyph}</span>{s.label}
    </span>
  );
}

/**
 * Renders a single evidence record. `displayValue` already carries the honest
 * formatting from the server (`~18.4 GB (estimated)`, `Unavailable — reason`), so the
 * UI must print it verbatim rather than re-formatting the raw value.
 */
export function EvidenceRow({ ev, onClick }: { ev: any; onClick?: () => void }) {
  const clickable = Boolean(onClick);
  return (
    <div
      onClick={onClick}
      className={`flex items-start justify-between gap-3 py-2 px-3 rounded-lg border ${clickable ? 'cursor-pointer hover:opacity-80' : ''}`}
      style={{ borderColor: 'var(--color-line)', backgroundColor: 'var(--color-surface-2)' }}
    >
      <div className="min-w-0">
        <div className="text-[12px] font-semibold" style={{ color: 'var(--color-ink)' }}>{ev.label}</div>
        {ev.reason && (
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-ink-3)' }}>{ev.reason}</div>
        )}
        {ev.estimationMethod && (
          <div className="text-[11px] mt-0.5 italic" style={{ color: 'var(--color-ink-3)' }}>
            Method: {ev.estimationMethod}
          </div>
        )}
        {ev.source && (
          <div className="text-[10px] mt-0.5 font-mono" style={{ color: 'var(--color-ink-3)' }}>source: {ev.source}</div>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[12px] font-mono font-bold" style={{ color: 'var(--color-ink)' }}>
          {ev.displayValue}
        </span>
        <EvidenceQualityBadge quality={ev.quality} />
      </div>
    </div>
  );
}

/** The "N observed, M estimated, K unavailable" strip that sits under any conclusion. */
export function EvidenceBasisStrip({ summary }: { summary: any }) {
  if (!summary) return null;
  const c = summary.counts || {};
  const parts = [
    c.observed ? `${c.observed} observed` : null,
    c.inferred ? `${c.inferred} inferred` : null,
    c.estimated ? `${c.estimated} estimated` : null,
    c.stale ? `${c.stale} stale` : null,
    c.unavailable ? `${c.unavailable} unavailable` : null,
  ].filter(Boolean);
  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px]" style={{ color: 'var(--color-ink-3)' }}>
      <span className="font-bold uppercase tracking-wider">Evidence basis:</span>
      <span className="font-mono">{parts.length ? parts.join(' · ') : 'no evidence'}</span>
      {summary.grade && (
        <span className="pill" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
          Quality: {summary.grade}
        </span>
      )}
      {typeof summary.confidenceCeiling === 'number' && (
        <span className="pill" style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
          Confidence ceiling {summary.confidenceCeiling}%
        </span>
      )}
    </div>
  );
}

/** Banner used wherever coverage is incomplete — never let silence read as health. */
export function CoverageNotice({ qualifier }: { qualifier?: string | null }) {
  if (!qualifier) return null;
  return (
    <div
      className="flex items-start gap-2 p-3 rounded-xl border text-[12px]"
      style={{ backgroundColor: 'rgba(245,158,11,0.10)', borderColor: 'rgba(245,158,11,0.30)', color: '#b45309' }}
    >
      <span aria-hidden className="font-bold">⚠</span>
      <span>{qualifier}</span>
    </div>
  );
}

export default EvidenceQualityBadge;
