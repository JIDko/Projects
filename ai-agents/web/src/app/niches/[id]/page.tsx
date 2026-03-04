'use client';

import { useState, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  TrendingUp,
  DollarSign,
  Clock,
  Target,
  Brain,
  BarChart3,
  ExternalLink,
  ShieldCheck,
  Swords,
  Loader2,
  Zap,
  AlertTriangle,
  ChevronDown,
  Search,
  Cpu,
  Blocks,
} from 'lucide-react';
import { useNiche } from '@/hooks/use-niche';
import { useNicheValidation } from '@/hooks/use-niche-validation';
import { useNicheCompetitors } from '@/hooks/use-niche-competitors';
import { useNicheProductSpec } from '@/hooks/use-niche-product-spec';
import { NicheRadarChart } from '@/components/niches/niche-radar-chart';
import { RiskFlagBadge } from '@/components/niches/risk-flag-badge';
import { ScoreCircle } from '@/components/niche-detail/score-circle';
import { BlockDetail } from '@/components/niche-detail/score-bar';
import { CompetitorCard } from '@/components/niche-detail/competitor-card';
import { VerdictBadge } from '@/components/validations/verdict-badge';
import { formatNumber } from '@/lib/utils';

const competitionColors: Record<string, string> = {
  low: 'text-emerald-400',
  medium: 'text-amber-400',
  high: 'text-red-400',
};
const competitionLabel: Record<string, string> = {
  low: 'низкая',
  medium: 'средняя',
  high: 'высокая',
};

const statusActions: Record<string, { label: string; next: string; color: string }[]> = {
  active: [
    { label: 'В архив', next: 'archived', color: 'bg-zinc-600 hover:bg-zinc-500' },
    { label: 'Отклонить', next: 'rejected', color: 'bg-red-500/20 hover:bg-red-500/30 text-red-400' },
  ],
  rejected: [
    { label: 'Восстановить', next: 'active', color: 'bg-accent/20 hover:bg-accent/30 text-accent' },
  ],
  archived: [
    { label: 'Восстановить', next: 'active', color: 'bg-accent/20 hover:bg-accent/30 text-accent' },
    { label: 'Отклонить', next: 'rejected', color: 'bg-red-500/20 hover:bg-red-500/30 text-red-400' },
  ],
};

const effortColor: Record<string, string> = { LOW: 'text-emerald-400', MEDIUM: 'text-amber-400', HIGH: 'text-red-400' };
const impactColor: Record<string, string> = { LOW: 'text-red-400', MEDIUM: 'text-amber-400', HIGH: 'text-emerald-400' };
const priorityBadge: Record<string, { label: string; cls: string }> = {
  MUST_HAVE: { label: 'Must Have', cls: 'bg-red-500/20 text-red-400' },
  SHOULD_HAVE: { label: 'Should Have', cls: 'bg-amber-500/20 text-amber-400' },
  NICE_TO_HAVE: { label: 'Nice to Have', cls: 'bg-blue-500/20 text-blue-400' },
};

export default function NicheDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { niche, isLoading: nicheLoading, mutate: mutateNiche } = useNiche(id);
  const { validation, isLoading: valLoading } = useNicheValidation(id);
  const { analysis, isLoading: compLoading } = useNicheCompetitors(validation?.id);
  const { productSpec, isLoading: specLoading } = useNicheProductSpec(analysis?.id);

  const [validationOpen, setValidationOpen] = useState(false);
  const [competitorsOpen, setCompetitorsOpen] = useState(false);
  const [specOpen, setSpecOpen] = useState(false);
  const [validating, setValidating] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [architecting, setArchitecting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  if (nicheLoading) {
    return (
      <div className="p-8 page-drill-in">
        <div className="space-y-6 animate-pulse">
          <div className="h-6 w-40 bg-muted rounded-xl" />
          <div className="glass-card p-6 h-64" />
          <div className="glass-card p-6 h-48" />
        </div>
      </div>
    );
  }

  if (!niche) {
    return (
      <div className="p-8 page-drill-in">
        <Link href="/niches" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm mb-4">
          <ArrowLeft className="h-4 w-4" />
          Ниши
        </Link>
        <div className="glass-card p-12 text-center">
          <p className="text-muted-foreground">Ниша не найдена</p>
        </div>
      </div>
    );
  }

  const actions = statusActions[niche.status] ?? [];

  async function handleStatusChange(newStatus: string) {
    await fetch(`/api/niches/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    mutateNiche();
    showToast(newStatus === 'rejected' ? 'Ниша отклонена' : newStatus === 'archived' ? 'Ниша в архиве' : 'Ниша восстановлена');
  }

  async function handleValidate() {
    setValidating(true);
    try {
      const res = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nicheId: id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Ошибка ${res.status}`);
      }
      showToast('Валидация запущена');
      setValidationOpen(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ошибка валидации');
    } finally {
      setValidating(false);
    }
  }

  async function handleAnalyzeCompetitors() {
    if (!validation) return;
    setAnalyzing(true);
    try {
      const res = await fetch('/api/analyze-competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ validationId: validation.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Ошибка ${res.status}`);
      }
      showToast('Анализ конкурентов запущен');
      setCompetitorsOpen(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ошибка анализа');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleArchitectProduct() {
    if (!analysis) return;
    setArchitecting(true);
    try {
      const res = await fetch('/api/architect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitiveAnalysisId: analysis.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Ошибка ${res.status}`);
      }
      showToast('Продуктовая спека создана');
      setSpecOpen(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ошибка проектирования');
    } finally {
      setArchitecting(false);
    }
  }

  const blocks = validation?.report.blocks ?? [];
  const recs = validation?.report.strategic_recommendations;
  const syn = analysis?.synthesis;

  return (
    <div className="p-8 page-drill-in">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-4 py-2.5 rounded-2xl bg-accent/20 border border-accent/30 text-accent text-sm font-medium">
          {toast}
        </div>
      )}

      <div className="space-y-8">
        {/* Back link */}
        <Link href="/niches" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm">
          <ArrowLeft className="h-4 w-4" />
          Ниши
        </Link>

        {/* ═════════════ NICHE INFO ═════════════ */}
        <div className="flex items-start gap-6">
          <ScoreCircle score={niche.total_score} size={100} />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">{niche.niche_name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={`text-sm ${competitionColors[niche.competition_level]}`}>
                {competitionLabel[niche.competition_level]} конкуренция
              </span>
              {niche.signal_count != null && (
                <span className="text-sm text-muted-foreground">{niche.signal_count} сигналов</span>
              )}
              {niche.unique_source_count != null && (
                <span className="text-sm text-muted-foreground">{niche.unique_source_count} источников</span>
              )}
            </div>
          </div>
        </div>

        {/* Radar chart + description */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          <div className="glass-card p-4 flex items-center justify-center">
            <div className="w-[280px] h-[280px]">
              <NicheRadarChart niche={niche} />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Описание</h4>
              <p className="text-sm leading-relaxed">{niche.description}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Почему привлекательна</h4>
              <p className="text-sm leading-relaxed">{niche.why_attractive}</p>
            </div>
            {niche.evidence_summary && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Доказательная база</h4>
                <p className="text-sm leading-relaxed">{niche.evidence_summary}</p>
              </div>
            )}
          </div>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard icon={TrendingUp} label="Рост рынка" value={`${niche.market_growth}%`} />
          <MetricCard icon={DollarSign} label="Маржа" value={`${niche.margin_potential}%`} />
          <MetricCard icon={BarChart3} label="Размер рынка" value={formatNumber(niche.market_size)} />
          <MetricCard icon={Brain} label="AI автоматизация" value={`${niche.ai_automation_score}/100`} />
          <MetricCard icon={DollarSign} label="Стартовый капитал" value={formatNumber(niche.startup_capital)} />
          <MetricCard icon={Clock} label="До первой прибыли" value={`${niche.time_to_revenue} дн.`} />
          <MetricCard icon={Target} label="Органический трафик" value={niche.organic_traffic_potential} />
          <MetricCard icon={Target} label="Уверенность" value={niche.confidence_level} />
        </div>

        {/* Risk flags */}
        {niche.risk_flags.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Флаги риска</h4>
            <div className="flex flex-wrap gap-2">
              {niche.risk_flags.map((flag) => (
                <RiskFlagBadge key={flag} flag={flag} />
              ))}
            </div>
          </div>
        )}

        {/* Sources */}
        {niche.sources.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Источники</h4>
            <div className="flex flex-wrap gap-2">
              {niche.sources.map((src, i) => (
                <span key={i} className="text-xs text-muted-foreground flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/20">
                  <ExternalLink className="h-3 w-3 shrink-0" />
                  <span className="truncate max-w-[200px]">{src}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center gap-3 pt-4 border-t border-border">
          <button
            onClick={handleValidate}
            disabled={validating}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium bg-accent/20 hover:bg-accent/30 text-accent disabled:opacity-50 transition-colors"
          >
            {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {validating ? 'Валидация...' : 'Валидировать'}
          </button>
          {actions.map((action) => (
            <button
              key={action.next}
              onClick={() => handleStatusChange(action.next)}
              className={`px-4 py-2 rounded-2xl text-sm font-medium transition-colors ${action.color}`}
            >
              {action.label}
            </button>
          ))}
        </div>

        {/* ═════════════ VALIDATION SECTION ═════════════ */}
        {!valLoading && validation && (
          <div className="border-t border-border pt-6">
            <button
              onClick={() => setValidationOpen(!validationOpen)}
              className="flex items-center gap-3 w-full group"
            >
              <ChevronDown className={`h-5 w-5 text-accent transition-transform duration-300 ${validationOpen ? '' : '-rotate-90'}`} />
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-accent" />
                <h2 className="text-lg font-semibold">Валидация</h2>
                <VerdictBadge verdict={validation.verdict} size="sm" />
                <span className="text-lg font-bold text-gradient">{validation.total_score}</span>
                <span className="text-sm text-muted-foreground">/ 100</span>
              </div>
            </button>

            <div className={`section-expand ${validationOpen ? 'open' : ''}`}>
              <div className="overflow-hidden">
                <div className="pt-6 space-y-5">
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

                  {/* Validation blocks */}
                  <div className="space-y-4">
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

                  {/* Validation meta */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

                  {/* Analyze competitors button */}
                  <button
                    onClick={handleAnalyzeCompetitors}
                    disabled={analyzing}
                    className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium bg-accent/20 hover:bg-accent/30 text-accent disabled:opacity-50 transition-colors"
                  >
                    {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Swords className="h-4 w-4" />}
                    {analyzing ? 'Анализ...' : 'Анализ конкурентов'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════ COMPETITORS SECTION ═════════════ */}
        {!compLoading && analysis && (
          <div className="border-t border-border pt-6">
            <button
              onClick={() => setCompetitorsOpen(!competitorsOpen)}
              className="flex items-center gap-3 w-full group"
            >
              <ChevronDown className={`h-5 w-5 text-accent transition-transform duration-300 ${competitorsOpen ? '' : '-rotate-90'}`} />
              <div className="flex items-center gap-3">
                <Swords className="h-5 w-5 text-accent" />
                <h2 className="text-lg font-semibold">Конкуренты</h2>
                <span className="text-sm text-muted-foreground">{analysis.competitors.length} найдено</span>
              </div>
            </button>

            <div className={`section-expand ${competitorsOpen ? 'open' : ''}`}>
              <div className="overflow-hidden">
                <div className="pt-6 space-y-5">
                  {/* Competitor profiles */}
                  <div className="space-y-3">
                    {analysis.competitors.map((comp, i) => (
                      <CompetitorCard key={`${comp.name}-${i}`} profile={comp} defaultOpen={i === 0} />
                    ))}
                  </div>

                  {/* Synthesis */}
                  {syn && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                        <Zap className="h-4 w-4 text-accent" />
                        Стратегический плейбук
                      </h4>

                      {syn.market_overview && (
                        <div className="glass-card p-4">
                          <p className="text-xs text-muted-foreground mb-2">Обзор рынка</p>
                          <p className="text-sm leading-relaxed whitespace-pre-line">{syn.market_overview}</p>
                        </div>
                      )}

                      {syn.attack_vectors && syn.attack_vectors.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">Вектора атаки</p>
                          {syn.attack_vectors.map((av, i) => (
                            <div key={i} className="glass-card p-3 space-y-1">
                              <p className="text-sm font-medium">{av.vector}</p>
                              <p className="text-xs text-muted-foreground">Слабость: {av.target_weakness}</p>
                              <div className="flex gap-3 text-xs">
                                <span>Усилие: <span className={effortColor[av.effort]}>{av.effort}</span></span>
                                <span>Импакт: <span className={impactColor[av.impact]}>{av.impact}</span></span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {syn.feature_priority_matrix && syn.feature_priority_matrix.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">Матрица приоритетов фич</p>
                          <div className="glass-card overflow-hidden">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-border">
                                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Фича</th>
                                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Приоритет</th>
                                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">У конкурентов</th>
                                </tr>
                              </thead>
                              <tbody>
                                {syn.feature_priority_matrix.map((f, i) => {
                                  const badge = priorityBadge[f.priority] ?? { label: f.priority, cls: 'bg-muted/30' };
                                  return (
                                    <tr key={i} className="border-b border-border/30">
                                      <td className="py-2 px-3">
                                        <p className="font-medium">{f.feature}</p>
                                        <p className="text-muted-foreground">{f.rationale}</p>
                                      </td>
                                      <td className="py-2 px-3">
                                        <span className={`px-2 py-0.5 rounded-lg text-xs ${badge.cls}`}>{badge.label}</span>
                                      </td>
                                      <td className="py-2 px-3 text-muted-foreground">
                                        {f.competitors_have}/{f.competitors_total}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {syn.pricing_recommendation && syn.pricing_recommendation.strategy && (
                        <div className="glass-card p-3 space-y-1">
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <DollarSign className="h-3 w-3" /> Рекомендация по ценообразованию
                          </p>
                          <p className="text-sm font-medium">{syn.pricing_recommendation.strategy}</p>
                          <p className="text-sm text-accent">{syn.pricing_recommendation.entry_price}</p>
                          <p className="text-xs text-muted-foreground">{syn.pricing_recommendation.rationale}</p>
                          {syn.pricing_recommendation.reference_competitors.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Ориентир: {syn.pricing_recommendation.reference_competitors.join(', ')}
                            </p>
                          )}
                        </div>
                      )}

                      {syn.go_to_market && syn.go_to_market.primary_channel && (
                        <div className="glass-card p-3 space-y-2">
                          <p className="text-xs text-muted-foreground">Go-to-Market стратегия</p>
                          <p className="text-sm">Основной канал: <span className="font-medium text-accent">{syn.go_to_market.primary_channel}</span></p>
                          {syn.go_to_market.quick_wins.length > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground">Быстрые победы:</p>
                              <ul className="space-y-0.5 text-sm">
                                {syn.go_to_market.quick_wins.map((w, i) => (
                                  <li key={i} className="flex items-start gap-1.5">
                                    <span className="text-emerald-400 mt-0.5">→</span>
                                    <span className="text-muted-foreground">{w}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {syn.go_to_market.content_gaps.length > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground">Контент-пробелы конкурентов:</p>
                              <ul className="space-y-0.5 text-sm">
                                {syn.go_to_market.content_gaps.map((g, i) => (
                                  <li key={i} className="flex items-start gap-1.5">
                                    <span className="text-amber-400 mt-0.5">•</span>
                                    <span className="text-muted-foreground">{g}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {syn.key_risks && syn.key_risks.length > 0 && (
                        <div className="glass-card p-3 space-y-1">
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <AlertTriangle className="h-3 w-3" /> Ключевые риски
                          </p>
                          {syn.key_risks.map((r, i) => (
                            <div key={i} className="text-sm flex items-start gap-2 text-red-400">
                              <span className="mt-0.5">⚠</span> {r}
                            </div>
                          ))}
                        </div>
                      )}

                      {syn.overall_assessment && (
                        <div className="glass-card p-4">
                          <p className="text-xs text-muted-foreground mb-2">Общая оценка</p>
                          <p className="text-sm leading-relaxed whitespace-pre-line">{syn.overall_assessment}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Competitor meta */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-2xl bg-muted/20 flex items-center gap-2">
                      <Search className="h-3.5 w-3.5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Поисков</p>
                        <p className="text-sm font-medium">{analysis.total_searches}</p>
                      </div>
                    </div>
                    <div className="p-3 rounded-2xl bg-muted/20 flex items-center gap-2">
                      <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Модель</p>
                        <p className="text-sm font-medium truncate">{analysis.model_used}</p>
                      </div>
                    </div>
                  </div>

                  {/* Architect product button */}
                  <button
                    onClick={handleArchitectProduct}
                    disabled={architecting}
                    className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium bg-accent/20 hover:bg-accent/30 text-accent disabled:opacity-50 transition-colors"
                  >
                    {architecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Blocks className="h-4 w-4" />}
                    {architecting ? 'Проектирование...' : 'Спроектировать продукт'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════ PRODUCT SPEC SECTION ═════════════ */}
        {!specLoading && productSpec && (
          <div className="border-t border-border pt-6">
            <button
              onClick={() => setSpecOpen(!specOpen)}
              className="flex items-center gap-3 w-full group"
            >
              <ChevronDown className={`h-5 w-5 text-accent transition-transform duration-300 ${specOpen ? '' : '-rotate-90'}`} />
              <div className="flex items-center gap-3">
                <Blocks className="h-5 w-5 text-accent" />
                <h2 className="text-lg font-semibold">Продуктовая спека</h2>
                <span className={`px-2 py-0.5 rounded-lg text-xs ${
                  productSpec.readiness === 'READY' ? 'bg-emerald-500/20 text-emerald-400' :
                  productSpec.readiness === 'NEEDS_REVIEW' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {productSpec.readiness === 'READY' ? 'Готов' : productSpec.readiness === 'NEEDS_REVIEW' ? 'Требует доработки' : 'Неполный'}
                </span>
                <span className="text-lg font-bold text-gradient">{productSpec.total_score}</span>
                <span className="text-sm text-muted-foreground">/ 100</span>
              </div>
            </button>

            <div className={`section-expand ${specOpen ? 'open' : ''}`}>
              <div className="overflow-hidden">
                <div className="pt-6 space-y-5">
                  {/* Vision */}
                  {productSpec.vision.product_name && (
                    <div className="glass-card p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-accent shrink-0" />
                        <h3 className="text-base font-semibold">{productSpec.vision.product_name}</h3>
                      </div>
                      {productSpec.vision.one_liner && (
                        <p className="text-sm text-accent">{productSpec.vision.one_liner}</p>
                      )}
                      {productSpec.vision.problem_statement && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Проблема</p>
                          <p className="text-sm">{productSpec.vision.problem_statement}</p>
                        </div>
                      )}
                      {productSpec.vision.solution_approach && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Решение</p>
                          <p className="text-sm">{productSpec.vision.solution_approach}</p>
                        </div>
                      )}
                      {productSpec.vision.key_differentiators.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Отличия от конкурентов</p>
                          {productSpec.vision.key_differentiators.map((d, i) => (
                            <div key={i} className="text-sm flex items-start gap-1.5">
                              <span className="text-accent mt-0.5">→</span> {d}
                            </div>
                          ))}
                        </div>
                      )}
                      {productSpec.vision.north_star_metric && (
                        <div className="pt-1 border-t border-border/30">
                          <p className="text-xs text-muted-foreground">North Star Metric</p>
                          <p className="text-sm font-medium text-accent">{productSpec.vision.north_star_metric}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Audience */}
                  {productSpec.audience.primary_persona.name && (
                    <div className="glass-card p-4 space-y-3">
                      <p className="text-xs text-muted-foreground">Целевая аудитория</p>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">{productSpec.audience.primary_persona.name} — {productSpec.audience.primary_persona.role}</p>
                        {productSpec.audience.primary_persona.pain_points.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground">Боли:</p>
                            {productSpec.audience.primary_persona.pain_points.map((p, i) => (
                              <p key={i} className="text-sm text-red-400/80">• {p}</p>
                            ))}
                          </div>
                        )}
                        {productSpec.audience.primary_persona.goals.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground">Цели:</p>
                            {productSpec.audience.primary_persona.goals.map((g, i) => (
                              <p key={i} className="text-sm text-emerald-400/80">• {g}</p>
                            ))}
                          </div>
                        )}
                      </div>
                      {productSpec.audience.tam_sam_som.tam && (
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/30">
                          <div><p className="text-xs text-muted-foreground">TAM</p><p className="text-xs">{productSpec.audience.tam_sam_som.tam}</p></div>
                          <div><p className="text-xs text-muted-foreground">SAM</p><p className="text-xs">{productSpec.audience.tam_sam_som.sam}</p></div>
                          <div><p className="text-xs text-muted-foreground">SOM</p><p className="text-xs">{productSpec.audience.tam_sam_som.som}</p></div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* MVP Features */}
                  {productSpec.features.mvp_features.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">MVP фичи</p>
                      <div className="glass-card overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-2 px-3 text-muted-foreground font-medium">Фича</th>
                              <th className="text-left py-2 px-3 text-muted-foreground font-medium">Приоритет</th>
                              <th className="text-left py-2 px-3 text-muted-foreground font-medium">Дней</th>
                            </tr>
                          </thead>
                          <tbody>
                            {productSpec.features.mvp_features.map((f, i) => {
                              const pBadge = f.priority === 'P0' ? 'bg-red-500/20 text-red-400' :
                                f.priority === 'P1' ? 'bg-amber-500/20 text-amber-400' :
                                'bg-blue-500/20 text-blue-400';
                              return (
                                <tr key={i} className="border-b border-border/30">
                                  <td className="py-2 px-3">
                                    <p className="font-medium">{f.name}</p>
                                    <p className="text-muted-foreground">{f.description}</p>
                                    {f.competitive_advantage && <p className="text-accent/70 mt-0.5">{f.competitive_advantage}</p>}
                                  </td>
                                  <td className="py-2 px-3">
                                    <span className={`px-2 py-0.5 rounded-lg text-xs ${pBadge}`}>{f.priority}</span>
                                  </td>
                                  <td className="py-2 px-3 text-muted-foreground">{f.effort_days}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Excluded features */}
                  {productSpec.features.explicitly_excluded.length > 0 && (
                    <div className="glass-card p-3 space-y-1">
                      <p className="text-xs text-muted-foreground">Сознательно исключено из MVP</p>
                      {productSpec.features.explicitly_excluded.map((e, i) => (
                        <p key={i} className="text-sm text-muted-foreground/70">✕ {e}</p>
                      ))}
                    </div>
                  )}

                  {/* User Flows */}
                  {(productSpec.user_flows.core_loop || productSpec.user_flows.onboarding_flow.length > 0) && (
                    <div className="glass-card p-4 space-y-3">
                      <p className="text-xs text-muted-foreground">Пользовательские флоу</p>
                      {productSpec.user_flows.onboarding_flow.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Онбординг:</p>
                          <div className="flex flex-wrap gap-1">
                            {productSpec.user_flows.onboarding_flow.map((step, i) => (
                              <span key={i} className="text-xs px-2 py-1 rounded-lg bg-muted/20">
                                {i + 1}. {step}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {productSpec.user_flows.core_loop && (
                        <div><p className="text-xs text-muted-foreground">Основной цикл:</p><p className="text-sm">{productSpec.user_flows.core_loop}</p></div>
                      )}
                      {productSpec.user_flows.aha_moment && (
                        <div><p className="text-xs text-muted-foreground">Aha-момент:</p><p className="text-sm text-accent">{productSpec.user_flows.aha_moment}</p></div>
                      )}
                      {productSpec.user_flows.retention_hooks.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground">Механизмы удержания:</p>
                          {productSpec.user_flows.retention_hooks.map((h, i) => (
                            <p key={i} className="text-sm">• {h}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Monetization */}
                  {productSpec.monetization.pricing_tiers.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <DollarSign className="h-3 w-3" /> Монетизация — {productSpec.monetization.model}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {productSpec.monetization.pricing_tiers.map((tier, i) => (
                          <div key={i} className="glass-card p-3 space-y-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">{tier.name}</p>
                              <p className="text-sm font-bold text-accent">{tier.price}</p>
                            </div>
                            <p className="text-xs text-muted-foreground">{tier.target}</p>
                            {tier.features.map((f, fi) => (
                              <p key={fi} className="text-xs text-muted-foreground/70">• {f}</p>
                            ))}
                          </div>
                        ))}
                      </div>
                      {productSpec.monetization.competitor_pricing_context && (
                        <p className="text-xs text-muted-foreground">{productSpec.monetization.competitor_pricing_context}</p>
                      )}
                    </div>
                  )}

                  {/* GTM */}
                  {productSpec.gtm.launch_strategy && (
                    <div className="glass-card p-4 space-y-3">
                      <p className="text-xs text-muted-foreground">Go-to-Market</p>
                      <p className="text-sm">{productSpec.gtm.launch_strategy}</p>
                      {productSpec.gtm.channels.length > 0 && (
                        <div className="space-y-1">
                          {productSpec.gtm.channels.map((ch, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                ch.priority === 'PRIMARY' ? 'bg-emerald-500/20 text-emerald-400' :
                                ch.priority === 'SECONDARY' ? 'bg-amber-500/20 text-amber-400' :
                                'bg-blue-500/20 text-blue-400'
                              }`}>{ch.priority}</span>
                              <span className="font-medium">{ch.channel}</span>
                              <span className="text-muted-foreground">— {ch.strategy}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {productSpec.gtm.first_100_users && (
                        <div className="pt-2 border-t border-border/30">
                          <p className="text-xs text-muted-foreground">Первые 100 пользователей:</p>
                          <p className="text-sm">{productSpec.gtm.first_100_users}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Success Criteria */}
                  {(productSpec.success_criteria.month_1.length > 0 || productSpec.success_criteria.kill_criteria.length > 0) && (
                    <div className="glass-card p-4 space-y-3">
                      <p className="text-xs text-muted-foreground">Критерии успеха</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {productSpec.success_criteria.week_1.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Неделя 1</p>
                            {productSpec.success_criteria.week_1.map((m, i) => <p key={i} className="text-xs">• {m}</p>)}
                          </div>
                        )}
                        {productSpec.success_criteria.month_1.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Месяц 1</p>
                            {productSpec.success_criteria.month_1.map((m, i) => <p key={i} className="text-xs">• {m}</p>)}
                          </div>
                        )}
                        {productSpec.success_criteria.month_3.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Месяц 3</p>
                            {productSpec.success_criteria.month_3.map((m, i) => <p key={i} className="text-xs">• {m}</p>)}
                          </div>
                        )}
                      </div>
                      {productSpec.success_criteria.kill_criteria.length > 0 && (
                        <div className="pt-2 border-t border-border/30">
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <AlertTriangle className="h-3 w-3" /> Критерии закрытия
                          </p>
                          {productSpec.success_criteria.kill_criteria.map((k, i) => (
                            <p key={i} className="text-sm text-red-400">✕ {k}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Score breakdown */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(productSpec.score_breakdown).map(([key, val]) => {
                      const labels: Record<string, string> = {
                        vision_clarity: 'Видение',
                        audience_definition: 'Аудитория',
                        feature_completeness: 'Фичи',
                        ux_coherence: 'UX',
                        monetization_viability: 'Монетизация',
                        gtm_actionability: 'GTM',
                        success_measurability: 'Метрики',
                      };
                      const max = key === 'success_measurability' ? 10 : 15;
                      return (
                        <div key={key} className="p-2 rounded-2xl bg-muted/20">
                          <p className="text-xs text-muted-foreground">{labels[key] ?? key}</p>
                          <p className="text-sm font-medium">{val}/{max}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Spec meta */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-2xl bg-muted/20 flex items-center gap-2">
                      <Search className="h-3.5 w-3.5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Поисков</p>
                        <p className="text-sm font-medium">{productSpec.total_searches}</p>
                      </div>
                    </div>
                    <div className="p-3 rounded-2xl bg-muted/20 flex items-center gap-2">
                      <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Модель</p>
                        <p className="text-sm font-medium truncate">{productSpec.model_used}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-muted/20 group/metric transition-all duration-200 hover:bg-muted/30">
      <Icon className="h-4 w-4 text-accent shrink-0 transition-transform duration-200 group-hover/metric:scale-110" strokeWidth={1.5} />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium capitalize truncate">{value}</p>
      </div>
    </div>
  );
}
