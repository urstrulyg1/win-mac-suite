import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, ShieldCheck, CheckCircle2, RefreshCw, Zap } from 'lucide-react';
import { usePlatform } from '../platform';
import RepairPreviewModal, { type RepairPreviewData } from './RepairPreviewModal';

interface Props {
  onNavigateTab?: (tab: string) => void;
}

export default function RecommendationCenter({ onNavigateTab }: Props) {
  const { config, isMac } = usePlatform();
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<RepairPreviewData | null>(null);
  const [executedMsg, setExecutedMsg] = useState<string | null>(null);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/diagnostics/recommendations');
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data.recommendations || []);
      }
    } catch {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const handleActionClick = (rec: any) => {
    setPreviewData({
      actionName: rec.title,
      actionDescription: rec.description,
      willChange: [
        `Reclaim approximately ${rec.reclaimedEstimate}`,
        'Clean inactive temporary buffers / caches',
      ],
      willNotChange: [
        'Personal documents in ~/Documents and ~/Desktop',
        'System root files (/System, /Library)',
        'User preferences and saved credentials',
      ],
      riskLevel: 'Low',
      reversible: rec.actionId === 'storage.purgeRam',
      onConfirm: async () => {
        if (rec.actionId === 'storage.purgeRam') {
          await fetch('/api/actions/purge-ram', { method: 'POST' });
          setExecutedMsg('Inactive memory buffers purged successfully.');
        } else if (rec.actionId === 'storage.cleanXcode') {
          await fetch('/api/actions/clean-xcode', { method: 'POST' });
          setExecutedMsg('Xcode DerivedData cleaned successfully.');
        } else if (onNavigateTab) {
          onNavigateTab(rec.category);
        }
        fetchRecommendations();
      },
    });
  };

  return (
    <div className="space-y-4">
      <RepairPreviewModal data={previewData} onClose={() => setPreviewData(null)} />

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-extrabold" style={{ color: 'var(--color-ink)' }}>
            Ranked Recommendations (Impact × Confidence × Safety)
          </h3>
          <p className="text-xs text-slate-400">Intelligent actions ranked by highest return with zero risk to personal files.</p>
        </div>
        <button onClick={fetchRecommendations} disabled={loading} className="btn btn-ghost text-xs cursor-pointer">
          <RefreshCw size={13} className={loading ? 'animate-spin-smooth' : ''} />
          <span>Refresh Recommendations</span>
        </button>
      </div>

      {executedMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-500 flex items-center justify-between">
          <span>✓ {executedMsg}</span>
          <button onClick={() => setExecutedMsg(null)} className="text-slate-400 hover:text-slate-200">×</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className="card p-5 space-y-3 flex flex-col justify-between border-l-4 border-l-blue-500 transition-all hover:scale-[1.01]"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="pill bg-blue-500/10 text-blue-400 border-blue-500/25 text-[10px] font-bold">
                  {rec.rankBadge} (Score {rec.compositeScore})
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {rec.reclaimedEstimate}
                </span>
              </div>
              <h4 className="text-sm font-bold" style={{ color: 'var(--color-ink)' }}>
                {rec.title}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {rec.description}
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between border-t" style={{ borderColor: 'var(--color-line)' }}>
              <span className="text-[10px] font-mono text-slate-500">
                Confidence: {rec.confidence}% · Safety: {rec.safety}%
              </span>
              <button
                onClick={() => handleActionClick(rec)}
                className="btn btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5 cursor-pointer font-bold"
              >
                <span>Execute Fix</span>
                <ArrowRight size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
