'use client';

import { useState, useMemo, useCallback } from 'react';
import { useNiches } from '@/hooks/use-niches';
import { NichesFilters } from '@/components/niches/niches-filters';
import { NichesTable } from '@/components/niches/niches-table';
import { NicheDetailSheet } from '@/components/niches/niche-detail-sheet';
import type { Niche } from '@/lib/types';

export default function NichesPage() {
  const [status, setStatus] = useState('');
  const [competition, setCompetition] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortField, setSortField] = useState('total_score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedNiche, setSelectedNiche] = useState<Niche | null>(null);

  const { niches, isLoading, mutate } = useNiches({
    status,
    competition,
    search,
    dateFrom,
    dateTo,
    sort: sortField,
    order: sortOrder,
  });

  const handleSort = useCallback(
    (field: string) => {
      if (field === sortField) {
        setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortOrder('desc');
      }
    },
    [sortField],
  );

  const handleStatusChange = useCallback(
    async (id: string, newStatus: string) => {
      await fetch(`/api/niches/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      mutate();
      setSelectedNiche(null);
    },
    [mutate],
  );

  const counts = useMemo(() => {
    return {
      total: niches.length,
      active: niches.filter((n) => n.status === 'active').length,
    };
  }, [niches]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Ниши</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {counts.total} найдено &middot; {counts.active} активных
          </p>
        </div>
      </div>

      <NichesFilters
        status={status}
        competition={competition}
        search={search}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onStatusChange={setStatus}
        onCompetitionChange={setCompetition}
        onSearchChange={setSearch}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
      />

      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="space-y-0">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-12 border-b border-border/50 animate-pulse bg-muted/10"
              />
            ))}
          </div>
        ) : (
          <NichesTable
            niches={niches}
            sortField={sortField}
            sortOrder={sortOrder}
            onSort={handleSort}
            onSelect={setSelectedNiche}
          />
        )}
      </div>

      <NicheDetailSheet
        niche={selectedNiche}
        onClose={() => setSelectedNiche(null)}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
