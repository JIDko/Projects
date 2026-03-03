'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { Niche } from '@/lib/types';

interface Props {
  niches: Niche[];
}

const COLORS: Record<string, string> = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
};

export function CompetitionBarChart({ niches }: Props) {
  const counts = { low: 0, medium: 0, high: 0 };
  for (const n of niches) {
    if (n.status === 'active') counts[n.competition_level]++;
  }

  const data = [
    { level: 'Низкая', count: counts.low },
    { level: 'Средняя', count: counts.medium },
    { level: 'Высокая', count: counts.high },
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
        <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
        <XAxis dataKey="level" stroke="#71717a" fontSize={12} />
        <YAxis stroke="#71717a" fontSize={12} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            background: '#18181b',
            border: '1px solid #27272a',
            borderRadius: '1rem',
            fontSize: 13,
          }}
        />
        <Bar dataKey="count" radius={[8, 8, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.level} fill={
              entry.level === 'Низкая' ? COLORS.low
                : entry.level === 'Средняя' ? COLORS.medium
                : COLORS.high
            } />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
