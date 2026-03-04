import useSWR from 'swr';
import type { Niche } from '@/lib/types';
import { fetcher } from '@/lib/fetcher';

export function useNiche(id: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<Niche>(
    id ? `/api/niches/${id}` : null,
    fetcher,
    { refreshInterval: 30_000 },
  );

  return { niche: data ?? null, error, isLoading, mutate };
}
