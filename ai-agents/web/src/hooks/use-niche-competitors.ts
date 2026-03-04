import useSWR from 'swr';
import type { CompetitiveAnalysis } from '@/lib/types';
import { fetcher } from '@/lib/fetcher';

export function useNicheCompetitors(validationId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<CompetitiveAnalysis[]>(
    validationId ? `/api/competitors?validationId=${validationId}&limit=1` : null,
    fetcher,
    { refreshInterval: 5_000 },
  );

  const analysis = data && data.length > 0 ? data[0]! : null;

  return { analysis, error, isLoading, mutate };
}
