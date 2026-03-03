import useSWR from 'swr';
import type { AgentConfig } from '@/lib/types';
import { fetcher } from '@/lib/fetcher';

export function useAgents() {
  const { data, error, isLoading } = useSWR<AgentConfig[]>('/api/agents', fetcher, {
    refreshInterval: 30_000,
  });

  return { agents: data ?? [], error, isLoading };
}
