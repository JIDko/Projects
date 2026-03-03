'use client';

import { Lightbulb, TrendingUp, Trophy, RotateCcw } from 'lucide-react';
import { useStats } from '@/hooks/use-stats';
import { useCycles } from '@/hooks/use-cycles';
import { useNiches } from '@/hooks/use-niches';
import { StatCard } from '@/components/dashboard/stat-card';
import { ScoresLineChart } from '@/components/dashboard/scores-line-chart';
import { CompetitionBarChart } from '@/components/dashboard/competition-bar-chart';
import { MetricsRadarChart } from '@/components/dashboard/metrics-radar-chart';
import { RecentCycles } from '@/components/dashboard/recent-cycles';

export default function DashboardPage() {
  const { stats, isLoading: statsLoading, error: statsError } = useStats();
  const { cycles, isLoading: cyclesLoading, error: cyclesError } = useCycles();
  const { niches, isLoading: nichesLoading, error: nichesError } = useNiches();

  const isLoading = statsLoading || cyclesLoading || nichesLoading;
  const hasError = statsError || cyclesError || nichesError;

  if (hasError) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Дашборд</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Обзор экосистемы AI-агентов
          </p>
        </div>
        <div className="glass-card p-12 text-center">
          <p className="text-destructive font-medium mb-2">Не удалось загрузить данные</p>
          <p className="text-sm text-muted-foreground">
            {String(statsError ?? cyclesError ?? nichesError)}
          </p>
          <p className="text-xs text-muted-foreground mt-3">
            Проверьте SUPABASE_URL и SUPABASE_SERVICE_KEY в .env.local
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div>
          <div className="h-8 w-48 bg-muted rounded-2xl" />
          <div className="h-4 w-64 bg-muted/50 rounded-xl mt-2" />
        </div>
        <div className="grid grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card p-6 h-32" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass-card p-6 h-80" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Дашборд</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Обзор экосистемы AI-агентов
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-6">
        <StatCard
          icon={Lightbulb}
          label="Всего ниш"
          value={stats?.totalNiches ?? 0}
          subtitle="за все циклы"
        />
        <StatCard
          icon={TrendingUp}
          label="Средний балл"
          value={stats?.avgScore ?? 0}
          subtitle="активные ниши"
        />
        <StatCard
          icon={Trophy}
          label="Лучшая ниша"
          value={stats?.bestNiche?.niche_name ?? '—'}
          subtitle={stats?.bestNiche ? `Балл: ${stats.bestNiche.total_score}` : undefined}
        />
        <StatCard
          icon={RotateCcw}
          label="Всего циклов"
          value={stats?.totalCycles ?? 0}
          subtitle="завершённых запусков"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-3 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">
            Средний балл по циклам
          </h3>
          <div className="h-64">
            <ScoresLineChart cycles={cycles} niches={niches} />
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">
            Распределение конкуренции
          </h3>
          <div className="h-64">
            <CompetitionBarChart niches={niches} />
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">
            Топ-10 средние метрики
          </h3>
          <div className="h-64">
            <MetricsRadarChart niches={niches} />
          </div>
        </div>
      </div>

      {/* Recent Cycles */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">
          Последние циклы
        </h3>
        <RecentCycles cycles={cycles} />
      </div>
    </div>
  );
}
