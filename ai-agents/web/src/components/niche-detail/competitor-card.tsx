'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink, Target, DollarSign, TrendingUp } from 'lucide-react';
import type { CompetitorProfile } from '@/lib/types';

interface Props {
  profile: CompetitorProfile;
  defaultOpen?: boolean;
}

export function CompetitorCard({ profile, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/20 transition-colors"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-accent" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
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
          <p className="text-sm text-muted-foreground leading-relaxed">{profile.description}</p>

          {profile.target_audience && (
            <div className="text-sm">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                <Target className="h-3 w-3" /> Целевая аудитория
              </p>
              <p>{profile.target_audience}</p>
            </div>
          )}

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
