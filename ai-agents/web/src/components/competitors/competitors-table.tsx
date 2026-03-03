'use client';

import { ArrowUpDown } from 'lucide-react';
import type { CompetitiveAnalysis } from '@/lib/types';

interface Props {
  analyses: CompetitiveAnalysis[];
  sortField: string;
  sortOrder: 'asc' | 'desc';
  onSort: (field: string) => void;
  onSelect: (a: CompetitiveAnalysis) => void;
}

const columns = [
  { key: 'idea', label: 'Идея', sortable: true },
  { key: 'competitors', label: 'Конкурентов', sortable: false },
  { key: 'total_searches', label: 'Поисков', sortable: true },
  { key: 'model_used', label: 'Модель', sortable: false },
  { key: 'created_at', label: 'Дата', sortable: true },
];

export function CompetitorsTable({ analyses, sortField, sortOrder, onSort, onSelect }: Props) {
  if (analyses.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
        Анализы не найдены
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`text-left py-3 px-4 text-muted-foreground font-medium ${
                  col.sortable ? 'cursor-pointer hover:text-foreground select-none' : ''
                }`}
                onClick={() => col.sortable && onSort(col.key)}
              >
                <div className="flex items-center gap-1.5">
                  {col.label}
                  {col.sortable && sortField === col.key && (
                    <ArrowUpDown className="h-3 w-3 text-accent" />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {analyses.map((a) => (
            <tr
              key={a.id}
              onClick={() => onSelect(a)}
              className="table-row-animated border-b border-border/50 cursor-pointer"
            >
              <td className="py-3 px-4 font-medium max-w-[300px]">
                <span className="truncate block">{a.idea}</span>
              </td>
              <td className="py-3 px-4">
                <span className="text-gradient font-semibold">{a.competitors.length}</span>
              </td>
              <td className="py-3 px-4 text-muted-foreground">{a.total_searches}</td>
              <td className="py-3 px-4 text-muted-foreground truncate max-w-[160px]">{a.model_used}</td>
              <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                {new Date(a.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
