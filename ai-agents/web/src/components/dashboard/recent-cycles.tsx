'use client';

import { Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import type { Cycle } from '@/lib/types';

interface Props {
  cycles: Cycle[];
}

const statusConfig = {
  completed: { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
  failed: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
  running: { icon: Loader2, color: 'text-warning', bg: 'bg-warning/10' },
};

export function RecentCycles({ cycles }: Props) {
  const recent = cycles.slice(0, 5);

  if (recent.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Пока нет циклов
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {recent.map((cycle) => {
        const config = statusConfig[cycle.status];
        const Icon = config.icon;
        return (
          <div
            key={cycle.id}
            className="flex items-center gap-4 p-3 rounded-2xl bg-muted/30 transition-colors hover:bg-muted/50"
          >
            <div className={cn('p-2 rounded-xl', config.bg)}>
              <Icon
                className={cn('h-4 w-4', config.color, cycle.status === 'running' && 'animate-spin')}
                strokeWidth={1.5}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{cycle.agent_name}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {timeAgo(cycle.started_at)}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{cycle.niches_saved} сохранено</p>
              <p className="text-xs text-muted-foreground capitalize">{cycle.status}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
