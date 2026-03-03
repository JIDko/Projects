'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, ExternalLink, TrendingUp, DollarSign, Clock, Target, Brain, BarChart3, ShieldCheck, Loader2 } from 'lucide-react';
import type { Niche } from '@/lib/types';
import { formatNumber } from '@/lib/utils';
import { RiskFlagBadge } from './risk-flag-badge';
import { NicheRadarChart } from './niche-radar-chart';

interface Props {
  niche: Niche | null;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
}

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

export function NicheDetailSheet({ niche, onClose, onStatusChange }: Props) {
  const router = useRouter();
  const [validating, setValidating] = useState(false);
  const [validateError, setValidateError] = useState<string | null>(null);

  // Reset validation state when niche changes
  useEffect(() => {
    setValidating(false);
    setValidateError(null);
  }, [niche?.id]);

  if (!niche) return null;

  const actions = statusActions[niche.status] ?? [];

  async function handleValidate() {
    if (!niche) return;
    setValidating(true);
    setValidateError(null);
    try {
      const res = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nicheId: niche.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Ошибка ${res.status}`);
      }
      router.push('/validations');
    } catch (err) {
      setValidateError(err instanceof Error ? err.message : String(err));
    } finally {
      setValidating(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 sheet-backdrop-enter"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed right-0 top-0 bottom-0 w-[520px] bg-background/95 backdrop-blur-xl border-l border-border z-50 overflow-y-auto sheet-enter">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-4">
              <h3 className="text-xl font-semibold tracking-tight">
                {niche.niche_name}
              </h3>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-2xl font-bold text-gradient">
                  {niche.total_score}
                </span>
                <span className="text-sm text-muted-foreground">/ 100</span>
                <span className={`text-sm ${competitionColors[niche.competition_level]}`}>
                  {competitionLabel[niche.competition_level]} конкуренция
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-muted/50 transition-colors"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* Radar Chart */}
          <div className="glass-card p-4">
            <div className="h-56">
              <NicheRadarChart niche={niche} />
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Описание</h4>
            <p className="text-sm leading-relaxed">{niche.description}</p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Почему привлекательна</h4>
            <p className="text-sm leading-relaxed">{niche.why_attractive}</p>
          </div>

          {/* Metrics Grid */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Ключевые метрики</h4>
            <div className="grid grid-cols-2 gap-3">
              <MetricItem icon={TrendingUp} label="Рост рынка" value={`${niche.market_growth}%`} />
              <MetricItem icon={DollarSign} label="Маржа" value={`${niche.margin_potential}%`} />
              <MetricItem icon={BarChart3} label="Размер рынка" value={formatNumber(niche.market_size)} />
              <MetricItem icon={Brain} label="AI автоматизация" value={`${niche.ai_automation_score}/100`} />
              <MetricItem icon={DollarSign} label="Стартовый капитал" value={formatNumber(niche.startup_capital)} />
              <MetricItem icon={Clock} label="До первой прибыли" value={`${niche.time_to_revenue} дн.`} />
              <MetricItem icon={Target} label="Органический трафик" value={niche.organic_traffic_potential} />
              <MetricItem icon={Target} label="Уверенность" value={niche.confidence_level} />
            </div>
          </div>

          {/* Risk Flags */}
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
              <div className="space-y-1">
                {niche.sources.map((src, i) => (
                  <div key={i} className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    <span className="truncate">{src}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Validate Error */}
          {validateError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-3 text-sm text-red-400">
              {validateError}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2 border-t border-border">
            <button
              onClick={handleValidate}
              disabled={validating}
              className="btn-glow px-4 py-2 rounded-2xl text-sm font-medium bg-accent/20 hover:bg-accent/30 text-accent flex items-center gap-2 disabled:opacity-50"
            >
              {validating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Валидация...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Валидировать
                </>
              )}
            </button>
            {actions.map((action) => (
              <button
                key={action.next}
                onClick={() => onStatusChange(niche.id, action.next)}
                className={`btn-glow px-4 py-2 rounded-2xl text-sm font-medium ${action.color}`}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function MetricItem({
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

