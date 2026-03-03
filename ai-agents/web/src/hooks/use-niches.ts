import useSWR from 'swr';
import type { Niche } from '@/lib/types';
import { fetcher } from '@/lib/fetcher';

interface UseNichesOptions {
  status?: string;
  competition?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

function buildUrl(opts: UseNichesOptions): string {
  const params = new URLSearchParams();
  if (opts.status) params.set('status', opts.status);
  if (opts.competition) params.set('competition', opts.competition);
  if (opts.search) params.set('search', opts.search);
  if (opts.dateFrom) params.set('dateFrom', opts.dateFrom);
  if (opts.dateTo) params.set('dateTo', opts.dateTo);
  if (opts.sort) params.set('sort', opts.sort);
  if (opts.order) params.set('order', opts.order);
  const qs = params.toString();
  return `/api/niches${qs ? `?${qs}` : ''}`;
}

export function useNiches(opts: UseNichesOptions = {}) {
  const url = buildUrl(opts);
  const { data, error, isLoading, mutate } = useSWR<Niche[]>(url, fetcher, {
    refreshInterval: 30_000,
  });

  return { niches: data ?? [], error, isLoading, mutate };
}
