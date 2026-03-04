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
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="80%">
        <defs>
          <linearGradient id="radarFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <PolarGrid stroke="#27272a" strokeWidth={0.5} />
        <PolarAngleAxis
          dataKey="metric"
          stroke="#71717a"
          fontSize={11}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: 'rgba(24, 24, 27, 0.95)',
            border: '1px solid #27272a',
            borderRadius: '1rem',
            fontSize: 13,
            backdropFilter: 'blur(8px)',
          }}
          itemStyle={{ color: '#06b6d4' }}
        />
        <Radar
          dataKey="value"
          stroke="#06b6d4"
          fill="url(#radarFill)"
          strokeWidth={2}
          dot={{ r: 3, fill: '#06b6d4', stroke: '#09090b', strokeWidth: 1.5 }}
          activeDot={{ r: 5, fill: '#22d3ee', stroke: '#06b6d4', strokeWidth: 2 }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
