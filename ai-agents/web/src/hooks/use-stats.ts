import useSWR from 'swr';
import type { DashboardStats } from '@/lib/types';
import { fetcher } from '@/lib/fetcher';

export function useStats() {
  const { data, error, isLoading } = useSWR<DashboardStats>('/api/stats', fetcher, {
    refreshInterval: 30_000,
  });

  return { stats: data, error, isLoading };
}
