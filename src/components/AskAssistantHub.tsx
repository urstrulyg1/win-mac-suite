import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { tabTransition } from '../motion';
import {
  MessageSquareCode, Send, Sparkles, Terminal, Activity,
  HardDrive, Cpu, Shield, ArrowRight, CheckCircle2, AlertTriangle, Layers
} from 'lucide-react';
import { usePlatform } from '../platform';

interface Props {
  onNavigateTab?: (tab: string) => void;
}

const suggestedPrompts = [
  'Why is my Mac getting hot?',
  'Why is my Mac using 70GB of System Data?',
  'Why did Chrome crash?',
  'Why is TCP port 3000 busy?',
  'Why did my Mac lose battery overnight?',
  'Why won’t my application open?',
  'Is my Mac ready for the macOS Sequoia update?',
];

export default function AskAssistantHub({ onNavigateTab }: Props) {
  const { config, isMac } = usePlatform();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);

  const handleAsk = async (userQuery: string) => {
    if (!userQuery.trim()) return;
    setLoading(true);
    setResponse(null);

    try {
      const res = await fetch('http://127.0.0.1:3131/api/actions/ask-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userQuery }),
      });

      if (res.ok) {
        const data = await res.json();
        setResponse(data);
      }
    } catch (err: any) {
      setResponse({
        topic: 'Telemetry Daemon Unreachable',
        diagnosis: `Unable to process query "${userQuery}". The local telemetry daemon is offline or did not respond.`,
        evidence: [
          'Live telemetry probe failed: POST http://127.0.0.1:3131/api/actions/ask-assistant',
          'Please ensure the backend daemon (node server.js) is running on port 3131.',
        ],
        confidence: 'Unavailable',
        confidenceScore: 0,
        suggestedAction: {
          label: 'Open Overview & Reconnect',
          tabTarget: 'overview',
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="flex justify-center">
          <img
            src="/logo.png"
            alt="Win/Mac Suite"
            className="w-14 h-14 object-contain drop-shadow-xl hover:scale-105 transition-transform"
          />
        </div>
        <div className="inline-flex items-center gap-2">
          <span className="pill bg-blue-500/10 text-blue-500 border-blue-500/25">
            <MessageSquareCode size={12} /> Structured Diagnostic Intelligence
          </span>
          <span className="pill" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-ink-3)', borderColor: 'var(--color-line)' }}>
            Probes → Evidence → Confidence → Action
          </span>
        </div>
        <h1 className="text-hero font-extrabold tracking-tight" style={{ color: 'var(--color-ink)' }}>
          Ask {config.productName}
        </h1>
        <p className="text-[14px]" style={{ color: 'var(--color-ink-3)' }}>
          Ask any question about your Mac in plain English. The engine correlates real live system telemetry, diagnostic logs, and APFS extents to provide evidence-backed root cause answers.
        </p>
      </div>

      {/* Query Bar */}
      <div className="card p-4 max-w-3xl mx-auto shadow-xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk(query);
          }}
          className="flex items-center gap-3"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything (e.g. 'Why is my Mac getting hot?', 'Why did Chrome crash?')..."
            className="field flex-1 text-sm py-2.5 px-4"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="btn btn-primary px-5 py-2.5 text-xs font-bold flex items-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
          >
            <Send size={14} />
            <span>{loading ? 'Diagnosing...' : 'Ask Assistant'}</span>
          </button>
        </form>

        {/* Suggested Chips */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t" style={{ borderColor: 'var(--color-line)' }}>
          <span className="text-[10px] font-bold uppercase text-slate-400">Try Asking:</span>
          {suggestedPrompts.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setQuery(p);
                handleAsk(p);
              }}
              className="text-[11px] px-2.5 py-1 rounded-lg border transition-all hover:scale-105 cursor-pointer"
              style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)', color: 'var(--color-ink-2)' }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Answer Presentation Card */}
      <AnimatePresence mode="wait">
        {response && (
          <motion.div
            {...tabTransition}
            className="card p-6 sm:p-8 max-w-3xl mx-auto space-y-6 border-l-4 border-l-blue-500 shadow-2xl"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4" style={{ borderColor: 'var(--color-line)' }}>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">{response.topic || 'Diagnostic Resolution'}</span>
                <h3 className="text-lg font-extrabold" style={{ color: 'var(--color-ink)' }}>
                  Root-Cause Diagnostic Verdict
                </h3>
              </div>
              <span className="pill bg-emerald-500/10 text-emerald-500 border-emerald-500/25 text-xs font-mono font-bold">
                Confidence: {response.confidence || 'High (96%)'}
              </span>
            </div>

            {/* Diagnosis Body */}
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-2)' }}>
              {response.diagnosis}
            </p>

            {/* Evidence Collection */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Multi-Probe Telemetry Evidence
              </h4>
              <div className="space-y-2">
                {(response.evidence || []).map((ev: string, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border text-xs font-mono flex items-start gap-2.5"
                    style={{ backgroundColor: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}
                  >
                    <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-slate-300">{ev}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Suggested Action */}
            {response.suggestedAction && onNavigateTab && (
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => onNavigateTab(response.suggestedAction.tabTarget || 'overview')}
                  className="btn btn-primary text-xs flex items-center gap-2 px-4 py-2 cursor-pointer shadow-md"
                >
                  <span>{response.suggestedAction.label}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
