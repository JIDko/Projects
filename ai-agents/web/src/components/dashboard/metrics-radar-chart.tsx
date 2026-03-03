'use client';

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { Niche } from '@/lib/types';

interface Props {
  niches: Niche[];
}

function avg(arr: number[]): number {
  return arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
}

export function MetricsRadarChart({ niches }: Props) {
  const active = niches.filter((n) => n.status === 'active');
  const top = active.sort((a, b) => b.total_score - a.total_score).slice(0, 10);

  if (top.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Нет активных ниш
      </div>
    );
  }

  const data = [
    { metric: 'Маржа', value: avg(top.map((n) => Math.min(n.margin_potential, 100))) },
    { metric: 'Рост', value: avg(top.map((n) => Math.min(n.market_growth * 2, 100))) },
    { metric: 'AI Авто', value: avg(top.map((n) => n.ai_automation_score)) },
    { metric: 'Рынок', value: avg(top.map((n) => Math.min(Math.log10(Math.max(n.market_size, 1e8)) / 10.7 * 100, 100))) },
    { metric: 'Капитал', value: avg(top.map((n) => Math.max(0, (20000 - n.startup_capital) / 200))) },
    { metric: 'Окупаемость', value: avg(top.map((n) => Math.max(0, (365 - n.time_to_revenue) / 3.65))) },
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid stroke="#27272a" />
        <PolarAngleAxis dataKey="metric" stroke="#71717a" fontSize={12} />
        <Tooltip
          contentStyle={{
            background: '#18181b',
            border: '1px solid #27272a',
            borderRadius: '1rem',
            fontSize: 13,
          }}
        />
        <Radar
          dataKey="value"
          stroke="#06b6d4"
          fill="#06b6d4"
          fillOpacity={0.2}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
