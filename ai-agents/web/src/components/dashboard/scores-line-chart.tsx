'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { Cycle, Niche } from '@/lib/types';

interface Props {
  cycles: Cycle[];
  niches: Niche[];
}

export function ScoresLineChart({ cycles, niches }: Props) {
  const sortedCycles = [...cycles]
    .filter((c) => c.status === 'completed')
    .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());

  const data = sortedCycles.map((cycle, i) => {
    const cycleNiches = niches.filter((n) => n.cycle_id === cycle.id);
    const avg =
      cycleNiches.length > 0
        ? Math.round(cycleNiches.reduce((s, n) => s + n.total_score, 0) / cycleNiches.length)
        : 0;
    return {
      name: `#${i + 1}`,
      score: avg,
      saved: cycle.niches_saved,
    };
  });

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Нет завершённых циклов
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
        <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
        <XAxis dataKey="name" stroke="#71717a" fontSize={12} />
        <YAxis stroke="#71717a" fontSize={12} domain={[0, 100]} />
        <Tooltip
          contentStyle={{
            background: '#18181b',
            border: '1px solid #27272a',
            borderRadius: '1rem',
            fontSize: 13,
          }}
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#06b6d4"
          strokeWidth={2}
          dot={{ fill: '#06b6d4', r: 4 }}
          activeDot={{ r: 6, fill: '#22d3ee' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
