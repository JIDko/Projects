'use client';

import { useState, useCallback } from 'react';
import { useValidations } from '@/hooks/use-validations';
import { ValidationsFilters } from '@/components/validations/validations-filters';
import { ValidationsTable } from '@/components/validations/validations-table';
import { ValidationDetailSheet } from '@/components/validations/validation-detail-sheet';
import type { Validation } from '@/lib/types';

export default function ValidationsPage() {
  const [verdict, setVerdict] = useState('');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selected, setSelected] = useState<Validation | null>(null);

  const { validations, isLoading, mutate } = useValidations({
    verdict,
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
        const res = await fetch(`/api/validations/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) {
          console.error('Failed to update status:', await res.text());
        }
      } catch (err) {
        console.error('Failed to update status:', err);
      }
      mutate();
      setSelected(null);
    },
    [mutate],
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Валидации</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {isLoading ? 'Загрузка...' : `${validations.length} найдено`}
        </p>
      </div>

      <ValidationsFilters
        verdict={verdict}
        search={search}
        onVerdictChange={setVerdict}
        onSearchChange={setSearch}
      />

      <div className="glass-card overflow-hidden">
        <ValidationsTable
          validations={validations}
          sortField={sortField}
          sortOrder={sortOrder}
          onSort={handleSort}
          onSelect={setSelected}
        />
      </div>

      <ValidationDetailSheet
        validation={selected}
        onClose={() => setSelected(null)}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
