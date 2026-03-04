'use client';

import { AlertTriangle } from 'lucide-react';
import type { ValidationBlock } from '@/lib/types';

const blockLabel: Record<string, string> = {
  market_demand: 'Рыночный спрос',
  competitive_landscape: 'Конкуренция',
  monetization: 'Монетизация',
  ai_automation_potential: 'AI автоматизация',
  organic_traffic: 'Органический трафик',
  unit_economics: 'Юнит-экономика',
  risk_assessment: 'Оценка рисков',
};

const statusColor: Record<string, string> = {
  GREEN: 'bg-emerald-500',
  YELLOW: 'bg-amber-500',
  RED: 'bg-red-500',
};

export function ScoreBar({ block }: { block: ValidationBlock }) {
  const pct = Math.round((block.score / block.max_score) * 100);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${statusColor[block.status]}`} />
          <span className="text-sm font-medium">{blockLabel[block.name] ?? block.name}</span>
        </div>
        <span className="text-sm font-semibold text-gradient">{block.score}/{block.max_score}</span>
      </div>
      <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
        <div className="score-bar-gradient bar-animated h-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function BlockDetail({ block }: { block: ValidationBlock }) {
  return (
    <div className="space-y-3">
      <ScoreBar block={block} />

      <p className="text-sm text-muted-foreground leading-relaxed">{block.analysis}</p>

      {block.key_findings.length > 0 && (
        <ul className="space-y-1">
          {block.key_findings.map((f, i) => (
            <li key={i} className="text-sm flex items-start gap-2">
              <span className="text-accent mt-0.5">•</span>
              {f}
            </li>
          ))}
        </ul>
      )}

      {block.data_gaps.length > 0 && (
        <div className="text-xs text-muted-foreground/70 flex items-start gap-1">
          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
          <span>Пробелы: {block.data_gaps.join('; ')}</span>
        </div>
      )}
    </div>
  );
}
