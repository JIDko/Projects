'use client';

import { useState, useCallback } from 'react';
import { useCompetitors } from '@/hooks/use-competitors';
import { CompetitorsFilters } from '@/components/competitors/competitors-filters';
import { CompetitorsTable } from '@/components/competitors/competitors-table';
import { CompetitorDetailSheet } from '@/components/competitors/competitor-detail-sheet';
import type { CompetitiveAnalysis } from '@/lib/types';

export default function CompetitorsPage() {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selected, setSelected] = useState<CompetitiveAnalysis | null>(null);

  const { analyses, isLoading, mutate } = useCompetitors({
    search,
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
      try {
        const res = await fetch(`/api/competitors/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) {
          console.error('Failed to update status:', await res.text());
          return;
        }
        mutate();
        setSelected(null);
      } catch (err) {
        console.error('Failed to update status:', err);
      }
    },
    [mutate],
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Конкурентный анализ</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {isLoading ? 'Загрузка...' : `${analyses.length} найдено`}
        </p>
      </div>

      <CompetitorsFilters
        search={search}
        onSearchChange={setSearch}
      />

      <div className="glass-card overflow-hidden">
        <CompetitorsTable
          analyses={analyses}
          sortField={sortField}
          sortOrder={sortOrder}
          onSort={handleSort}
          onSelect={setSelected}
        />
      </div>

      <CompetitorDetailSheet
        analysis={selected}
        onClose={() => setSelected(null)}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
