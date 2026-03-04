import useSWR, { mutate as globalMutate } from 'swr';
import type { AgentConfig } from '@/lib/types';
import { fetcher } from '@/lib/fetcher';

export function useAgentConfig(name: string) {
  const { data, error, isLoading, mutate } = useSWR<AgentConfig>(
    `/api/agents/${name}/config`,
    fetcher,
  );

  const updateConfig = async (updates: Partial<Pick<AgentConfig, 'system_prompt' | 'config' | 'is_active'>>) => {
    await fetch(`/api/agents/${name}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    mutate();
  };

  const triggerRun = async () => {
    const res = await fetch(`/api/agents/${name}/run`, { method: 'POST' });
    const data = await res.json();
    // Immediately revalidate cycles so the main page picks up the running state
    globalMutate('/api/cycles');
    return data;
  };

  return { agent: data, error, isLoading, mutate, updateConfig, triggerRun };
}
