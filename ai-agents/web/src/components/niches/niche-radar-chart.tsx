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
  niche: Niche;
}

export function NicheRadarChart({ niche }: Props) {
  const data = [
    { metric: 'Маржа', value: Math.min(niche.margin_potential, 100) },
    { metric: 'Рост', value: Math.min(niche.market_growth * 2, 100) },
    { metric: 'AI Авто', value: niche.ai_automation_score },
    {
      metric: 'Объём рынка',
      value: Math.min(
        (Math.log10(Math.max(niche.market_size, 1e8)) / 10.7) * 100,
        100,
      ),
    },
    {
      metric: 'Мало вложений',
      value: Math.max(0, ((20000 - niche.startup_capital) / 20000) * 100),
    },
    {
      metric: 'Быстрый доход',
      value: Math.max(0, ((365 - niche.time_to_revenue) / 365) * 100),
    },
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid stroke="#27272a" />
        <PolarAngleAxis dataKey="metric" stroke="#71717a" fontSize={11} />
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
          fillOpacity={0.25}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
