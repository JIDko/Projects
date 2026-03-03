'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Search, Cpu, Zap, AlertTriangle, Swords, Loader2 } from 'lucide-react';
import type { Validation, ValidationBlock } from '@/lib/types';
import { VerdictBadge } from './verdict-badge';

interface Props {
  validation: Validation | null;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
}

const blockLabel: Record<string, string> = {
  market_demand: 'Рыночный спрос',
  competitive_landscape: 'Конкуренция',
  monetization: 'Монетизация',
  ai_automation_potential: 'AI автоматизация',
  organic_traffic: 'Органический трафик',
  unit_economics: 'Юнит-экономика',
  risk_assessment: 'Оценка рисков',
};

const statusColor: Record<string, string> = {
  GREEN: 'bg-emerald-500',
  YELLOW: 'bg-amber-500',
  RED: 'bg-red-500',
};

function ScoreBar({ block }: { block: ValidationBlock }) {
  const pct = Math.round((block.score / block.max_score) * 100);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${statusColor[block.status]}`} />
          <span className="text-sm font-medium">{blockLabel[block.name] ?? block.name}</span>
        </div>
        <span className="text-sm font-semibold text-gradient">{block.score}/{block.max_score}</span>
      </div>
      <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
        <div className="score-bar-gradient h-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function BlockDetail({ block }: { block: ValidationBlock }) {
  return (
    <div className="space-y-3">
      <ScoreBar block={block} />

      <p className="text-sm text-muted-foreground leading-relaxed">{block.analysis}</p>

      {block.key_findings.length > 0 && (
        <ul className="space-y-1">
          {block.key_findings.map((f, i) => (
            <li key={i} className="text-sm flex items-start gap-2">
              <span className="text-accent mt-0.5">•</span>
              {f}
            </li>
          ))}
        </ul>
      )}

      {block.data_gaps.length > 0 && (
        <div className="text-xs text-muted-foreground/70 flex items-start gap-1">
          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
          <span>Пробелы: {block.data_gaps.join('; ')}</span>
        </div>
      )}
    </div>
  );
}

export function ValidationDetailSheet({ validation, onClose, onStatusChange }: Props) {
  const router = useRouter();
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState('');

  if (!validation) return null;

  const blocks = validation.report.blocks ?? [];
  const recs = validation.report.strategic_recommendations;

  const handleAnalyzeCompetitors = async () => {
    setAnalyzing(true);
    setAnalyzeError('');
    try {
      const res = await fetch('/api/analyze-competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ validationId: validation.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      router.push('/competitors');
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : String(err));
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 sheet-backdrop-enter"
        onClick={onClose}
      />

      <div className="fixed right-0 top-0 bottom-0 w-[560px] bg-background/95 backdrop-blur-xl border-l border-border z-50 overflow-y-auto sheet-enter">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-4">
              <h3 className="text-xl font-semibold tracking-tight">{validation.idea}</h3>
              <div className="flex items-center gap-3 mt-2">
                <VerdictBadge verdict={validation.verdict} size="lg" />
                <span className="text-2xl font-bold text-gradient">{validation.total_score}</span>
                <span className="text-sm text-muted-foreground">/ 100</span>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted/50 transition-colors">
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* Opportunity Headline */}
          {validation.opportunity_headline && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 text-sm text-emerald-400 flex items-center gap-2">
              <Zap className="h-4 w-4 shrink-0" />
              {validation.opportunity_headline}
            </div>
          )}

          {/* Critical Insight */}
          {validation.critical_insight && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 text-sm text-amber-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {validation.critical_insight}
            </div>
          )}

          {/* 7 Blocks */}
          <div className="space-y-5">
            {blocks.map((block) => (
              <div key={block.name} className="glass-card p-4">
                <BlockDetail block={block} />
              </div>
            ))}
          </div>

          {/* Strategic Recommendations */}
          {recs && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Стратегические рекомендации</h4>

              {recs.mvp_hypothesis && (
                <div className="glass-card p-3">
                  <p className="text-xs text-muted-foreground mb-1">MVP гипотеза</p>
                  <p className="text-sm">{recs.mvp_hypothesis}</p>
                </div>
              )}

              {recs.target_customer_profile && (
                <div className="glass-card p-3">
                  <p className="text-xs text-muted-foreground mb-1">Целевой клиент</p>
                  <p className="text-sm">{recs.target_customer_profile}</p>
                </div>
              )}

              {recs.immediate_actions && recs.immediate_actions.length > 0 && (
                <div className="glass-card p-3 space-y-2">
                  <p className="text-xs text-muted-foreground">Немедленные действия</p>
                  {recs.immediate_actions.map((a, i) => (
                    <div key={i} className="text-sm flex items-start gap-2">
                      <span className="text-accent mt-0.5">→</span>
                      <div>
                        <span className="font-medium">{a.action}</span>
                        <span className="text-muted-foreground"> — {a.rationale}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {recs.kill_criteria && recs.kill_criteria.length > 0 && (
                <div className="glass-card p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Критерии отказа</p>
                  {recs.kill_criteria.map((k, i) => (
                    <div key={i} className="text-sm flex items-start gap-2 text-red-400">
                      <span className="mt-0.5">✕</span>
                      {k}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl bg-muted/20">
              <p className="text-xs text-muted-foreground">Уверенность</p>
              <p className="text-sm font-medium">{validation.confidence_level}</p>
            </div>
            <div className="p-3 rounded-2xl bg-muted/20">
              <p className="text-xs text-muted-foreground">Рынок</p>
              <p className="text-sm font-medium">{validation.market}</p>
            </div>
            <div className="p-3 rounded-2xl bg-muted/20 flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Поисков</p>
                <p className="text-sm font-medium">{validation.searches_performed.length}</p>
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-muted/20 flex items-center gap-2">
              <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Модель</p>
                <p className="text-sm font-medium truncate">{validation.model_used}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center gap-3">
              <button
                onClick={handleAnalyzeCompetitors}
                disabled={analyzing}
                className="btn-glow px-4 py-2 rounded-2xl text-sm font-medium bg-accent/20 hover:bg-accent/30 text-accent disabled:opacity-50 flex items-center gap-2"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Анализ...
                  </>
                ) : (
                  <>
                    <Swords className="h-4 w-4" />
                    Анализ конкурентов
                  </>
                )}
              </button>

              {validation.status === 'active' && (
                <button
                  onClick={() => onStatusChange(validation.id, 'archived')}
                  className="btn-glow px-4 py-2 rounded-2xl text-sm font-medium bg-zinc-600 hover:bg-zinc-500"
                >
                  В архив
                </button>
              )}
              {validation.status === 'archived' && (
                <button
                  onClick={() => onStatusChange(validation.id, 'active')}
                  className="btn-glow px-4 py-2 rounded-2xl text-sm font-medium bg-accent/20 hover:bg-accent/30 text-accent"
                >
                  Восстановить
                </button>
              )}
            </div>

            {analyzeError && (
              <p className="text-sm text-red-400">{analyzeError}</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
