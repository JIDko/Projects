'use client';

import { useState } from 'react';
import { X, ChevronDown, ChevronRight, Search, Cpu, ExternalLink, Swords, Target, DollarSign, TrendingUp, AlertTriangle, Zap } from 'lucide-react';
import type { CompetitiveAnalysis, CompetitorProfile } from '@/lib/types';

interface Props {
  analysis: CompetitiveAnalysis | null;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
}

const effortColor: Record<string, string> = {
  LOW: 'text-emerald-400',
  MEDIUM: 'text-amber-400',
  HIGH: 'text-red-400',
};

const impactColor: Record<string, string> = {
  LOW: 'text-red-400',
  MEDIUM: 'text-amber-400',
  HIGH: 'text-emerald-400',
};

const priorityBadge: Record<string, { label: string; cls: string }> = {
  MUST_HAVE: { label: 'Must Have', cls: 'bg-red-500/20 text-red-400' },
  SHOULD_HAVE: { label: 'Should Have', cls: 'bg-amber-500/20 text-amber-400' },
  NICE_TO_HAVE: { label: 'Nice to Have', cls: 'bg-blue-500/20 text-blue-400' },
};

function CompetitorCard({ profile, defaultOpen }: { profile: CompetitorProfile; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/20 transition-colors"
      >
        {open ? <ChevronDown className="h-4 w-4 shrink-0 text-accent" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{profile.name}</span>
            {profile.url && (
              <a
                href={profile.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-accent hover:text-accent/80"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{profile.positioning || profile.description}</p>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-border/50 pt-3">
          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed">{profile.description}</p>

          {/* Target Audience */}
          {profile.target_audience && (
            <div className="text-sm">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                <Target className="h-3 w-3" /> Целевая аудитория
              </p>
              <p>{profile.target_audience}</p>
            </div>
          )}

          {/* Pricing */}
          {profile.pricing && (
            <div className="text-sm">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                <DollarSign className="h-3 w-3" /> Ценообразование
              </p>
              <p className="font-medium">{profile.pricing.model} — {profile.pricing.avg_price}</p>
              {profile.pricing.tiers.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {profile.pricing.tiers.map((t, i) => (
                    <li key={i} className="text-muted-foreground flex items-start gap-1.5">
                      <span className="text-accent mt-0.5">•</span> {t}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Core Features */}
          {profile.product.core_features.length > 0 && (
            <div className="text-sm">
              <p className="text-xs text-muted-foreground mb-1">Ключевые фичи</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.product.core_features.map((f, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-lg bg-muted/30 text-xs">{f}</span>
                ))}
              </div>
            </div>
          )}

          {/* USP */}
          {profile.product.unique_selling_points.length > 0 && (
            <div className="text-sm">
              <p className="text-xs text-muted-foreground mb-1">Уникальные преимущества</p>
              <ul className="space-y-0.5">
                {profile.product.unique_selling_points.map((u, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-accent mt-0.5">→</span> {u}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Marketing */}
          {profile.marketing.channels.length > 0 && (
            <div className="text-sm">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3" /> Маркетинг
              </p>
              <div className="flex flex-wrap gap-1.5">
                {profile.marketing.channels.map((c, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-lg bg-accent/10 text-accent text-xs">{c}</span>
                ))}
              </div>
              {profile.marketing.content_strategy && (
                <p className="text-muted-foreground mt-1">{profile.marketing.content_strategy}</p>
              )}
            </div>
          )}

          {/* Strengths / Weaknesses */}
          <div className="grid grid-cols-2 gap-3">
            {profile.strengths.length > 0 && (
              <div>
                <p className="text-xs text-emerald-400 mb-1">Сильные стороны</p>
                <ul className="space-y-0.5 text-sm">
                  {profile.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-400 mt-0.5">+</span>
                      <span className="text-muted-foreground">{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {profile.weaknesses.length > 0 && (
              <div>
                <p className="text-xs text-red-400 mb-1">Слабые стороны</p>
                <ul className="space-y-0.5 text-sm">
                  {profile.weaknesses.map((w, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-red-400 mt-0.5">−</span>
                      <span className="text-muted-foreground">{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Customer Sentiment */}
          {(profile.customer_sentiment.positive.length > 0 || profile.customer_sentiment.negative.length > 0) && (
            <div className="grid grid-cols-2 gap-3">
              {profile.customer_sentiment.positive.length > 0 && (
                <div>
                  <p className="text-xs text-emerald-400 mb-1">Хвалят</p>
                  <ul className="space-y-0.5 text-sm text-muted-foreground">
                    {profile.customer_sentiment.positive.map((p, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-emerald-400 mt-0.5">♥</span> {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {profile.customer_sentiment.negative.length > 0 && (
                <div>
                  <p className="text-xs text-red-400 mb-1">Жалуются</p>
                  <ul className="space-y-0.5 text-sm text-muted-foreground">
                    {profile.customer_sentiment.negative.map((n, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-red-400 mt-0.5">✕</span> {n}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function CompetitorDetailSheet({ analysis, onClose, onStatusChange }: Props) {
  if (!analysis) return null;

  const syn = analysis.synthesis;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 sheet-backdrop-enter"
        onClick={onClose}
      />

      <div className="fixed right-0 top-0 bottom-0 w-[600px] bg-background/95 backdrop-blur-xl border-l border-border z-50 overflow-y-auto sheet-enter">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-4">
              <h3 className="text-xl font-semibold tracking-tight">{analysis.idea}</h3>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-accent/10 text-accent text-sm font-medium">
                  <Swords className="h-4 w-4" />
                  {analysis.competitors.length} конкурентов
                </div>
                <span className="text-sm text-muted-foreground">{analysis.market}</span>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted/50 transition-colors">
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* Competitor Profiles */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Профили конкурентов</h4>
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

              {/* Market Overview */}
              {syn.market_overview && (
                <div className="glass-card p-4">
                  <p className="text-xs text-muted-foreground mb-2">Обзор рынка</p>
                  <p className="text-sm leading-relaxed whitespace-pre-line">{syn.market_overview}</p>
                </div>
              )}

              {/* Attack Vectors */}
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

              {/* Feature Priority Matrix */}
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

              {/* Pricing Recommendation */}
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

              {/* Go-to-Market */}
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

              {/* Key Risks */}
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

              {/* Overall Assessment */}
              {syn.overall_assessment && (
                <div className="glass-card p-4">
                  <p className="text-xs text-muted-foreground mb-2">Общая оценка</p>
                  <p className="text-sm leading-relaxed whitespace-pre-line">{syn.overall_assessment}</p>
                </div>
              )}
            </div>
          )}

          {/* Meta */}
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

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2 border-t border-border">
            {analysis.status === 'active' && (
              <button
                onClick={() => onStatusChange(analysis.id, 'archived')}
                className="btn-glow px-4 py-2 rounded-2xl text-sm font-medium bg-zinc-600 hover:bg-zinc-500"
              >
                В архив
              </button>
            )}
            {analysis.status === 'archived' && (
              <button
                onClick={() => onStatusChange(analysis.id, 'active')}
                className="btn-glow px-4 py-2 rounded-2xl text-sm font-medium bg-accent/20 hover:bg-accent/30 text-accent"
              >
                Восстановить
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
