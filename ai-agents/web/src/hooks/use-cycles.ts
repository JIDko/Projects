import useSWR from 'swr';
import type { Cycle } from '@/lib/types';
import { fetcher } from '@/lib/fetcher';

export function useCycles() {
  const { data, error, isLoading } = useSWR<Cycle[]>('/api/cycles', fetcher, {
    refreshInterval: 30_000,
  });

  return { cycles: data ?? [], error, isLoading };
}
