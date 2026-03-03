import useSWR from 'swr';
import type { Validation } from '@/lib/types';
import { fetcher } from '@/lib/fetcher';

interface UseValidationsOptions {
  verdict?: string;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

function buildUrl(opts: UseValidationsOptions): string {
  const params = new URLSearchParams();
  if (opts.verdict) params.set('verdict', opts.verdict);
  if (opts.search) params.set('search', opts.search);
  if (opts.sort) params.set('sort', opts.sort);
  if (opts.order) params.set('order', opts.order);
  const qs = params.toString();
  return `/api/validations${qs ? `?${qs}` : ''}`;
}

export function useValidations(opts: UseValidationsOptions = {}) {
  const url = buildUrl(opts);
  const { data, error, isLoading, mutate } = useSWR<Validation[]>(url, fetcher, {
    refreshInterval: 30_000,
  });

  return { validations: data ?? [], error, isLoading, mutate };
}
