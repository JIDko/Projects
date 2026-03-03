'use client';

import { ArrowUpDown } from 'lucide-react';
import type { Validation } from '@/lib/types';
import { VerdictBadge } from './verdict-badge';

interface Props {
  validations: Validation[];
  sortField: string;
  sortOrder: 'asc' | 'desc';
  onSort: (field: string) => void;
  onSelect: (v: Validation) => void;
}

const confidenceLabel: Record<string, string> = {
  HIGH: 'высокая',
  MEDIUM: 'средняя',
  LOW: 'низкая',
};

const confidenceColor: Record<string, string> = {
  HIGH: 'text-emerald-400',
  MEDIUM: 'text-amber-400',
  LOW: 'text-red-400',
};

const columns = [
  { key: 'idea', label: 'Идея', sortable: true },
  { key: 'verdict', label: 'Вердикт', sortable: false },
  { key: 'total_score', label: 'Баллы', sortable: true },
  { key: 'confidence_level', label: 'Уверенность', sortable: false },
  { key: 'market', label: 'Рынок', sortable: false },
  { key: 'created_at', label: 'Дата', sortable: true },
];

export function ValidationsTable({ validations, sortField, sortOrder, onSort, onSelect }: Props) {
  if (validations.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
        Валидации не найдены
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
          {validations.map((v) => (
            <tr
              key={v.id}
              onClick={() => onSelect(v)}
              className="table-row-animated border-b border-border/50 cursor-pointer"
            >
              <td className="py-3 px-4 font-medium max-w-[300px]">
                <span className="truncate block">{v.idea}</span>
              </td>
              <td className="py-3 px-4">
                <VerdictBadge verdict={v.verdict} />
              </td>
              <td className="py-3 px-4">
                <span className="text-gradient font-semibold">{v.total_score}</span>
                <span className="text-muted-foreground"> /100</span>
              </td>
              <td className="py-3 px-4">
                <span className={confidenceColor[v.confidence_level]}>
                  {confidenceLabel[v.confidence_level]}
                </span>
              </td>
              <td className="py-3 px-4 text-muted-foreground">{v.market}</td>
              <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                {new Date(v.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
