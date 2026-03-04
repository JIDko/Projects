import useSWR from 'swr';
import type { ProductSpec } from '@/lib/types';
import { fetcher } from '@/lib/fetcher';

export function useNicheProductSpec(competitiveAnalysisId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<ProductSpec[]>(
    competitiveAnalysisId
      ? `/api/product-specs?competitiveAnalysisId=${competitiveAnalysisId}&limit=1`
      : null,
    fetcher,
    { refreshInterval: 5_000 },
  );

  const productSpec = data && data.length > 0 ? data[0]! : null;

  return { productSpec, error, isLoading, mutate };
}
