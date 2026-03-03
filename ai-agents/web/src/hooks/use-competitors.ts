import useSWR from 'swr';
import type { CompetitiveAnalysis } from '@/lib/types';
import { fetcher } from '@/lib/fetcher';

interface UseCompetitorsOptions {
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

function buildUrl(opts: UseCompetitorsOptions): string {
  const params = new URLSearchParams();
  if (opts.search) params.set('search', opts.search);
  if (opts.sort) params.set('sort', opts.sort);
  if (opts.order) params.set('order', opts.order);
  const qs = params.toString();
  return `/api/competitors${qs ? `?${qs}` : ''}`;
}

export function useCompetitors(opts: UseCompetitorsOptions = {}) {
  const url = buildUrl(opts);
  const { data, error, isLoading, mutate } = useSWR<CompetitiveAnalysis[]>(url, fetcher, {
    refreshInterval: 30_000,
  });

  return { analyses: data ?? [], error, isLoading, mutate };
}
