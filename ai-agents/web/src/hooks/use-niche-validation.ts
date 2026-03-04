import useSWR from 'swr';
import type { Validation } from '@/lib/types';
import { fetcher } from '@/lib/fetcher';

export function useNicheValidation(nicheId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<Validation[]>(
    nicheId ? `/api/validations?nicheId=${nicheId}&limit=1` : null,
    fetcher,
    { refreshInterval: 5_000 },
  );

  const validation = data && data.length > 0 ? data[0]! : null;

  return { validation, error, isLoading, mutate };
}
