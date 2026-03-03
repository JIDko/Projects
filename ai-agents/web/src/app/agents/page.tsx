'use client';

import Link from 'next/link';
import { Bot, ChevronRight, Circle } from 'lucide-react';
import { useAgents } from '@/hooks/use-agents';
import { timeAgo } from '@/lib/utils';

export default function AgentsPage() {
  const { agents, isLoading } = useAgents();

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div>
          <div className="h-8 w-36 bg-muted rounded-2xl" />
          <div className="h-4 w-56 bg-muted/50 rounded-xl mt-2" />
        </div>
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="glass-card p-6 h-28" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Агенты</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Настройка и управление AI-агентами
        </p>
      </div>

      <div className="space-y-4">
        {agents.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Bot className="h-10 w-10 text-muted-foreground mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-muted-foreground text-sm">
              Агенты не настроены. Запустите SQL-миграцию для создания agent_configs.
            </p>
          </div>
        ) : (
          agents.map((agent) => (
            <Link
              key={agent.id}
              href={`/agents/${agent.agent_name}`}
              className="glass-card p-6 flex items-center justify-between group block"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-accent/10">
                  <Bot className="h-6 w-6 text-accent" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{agent.display_name}</h3>
                    <Circle
                      className={`h-2.5 w-2.5 ${
                        agent.is_active ? 'fill-emerald-400 text-emerald-400' : 'fill-zinc-500 text-zinc-500'
                      }`}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {agent.description}
                  </p>
                  {agent.last_run_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Последний запуск: {timeAgo(agent.last_run_at)}
                    </p>
                  )}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-accent transition-colors" />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
