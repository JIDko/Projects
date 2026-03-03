'use client';

import { ArrowUpDown } from 'lucide-react';
import type { Niche } from '@/lib/types';
import { formatNumber } from '@/lib/utils';

interface Props {
  niches: Niche[];
  sortField: string;
  sortOrder: 'asc' | 'desc';
  onSort: (field: string) => void;
  onSelect: (niche: Niche) => void;
}

const statusDot: Record<string, string> = {
  active: 'bg-emerald-400',
  rejected: 'bg-red-400',
  archived: 'bg-zinc-500',
};

const competitionColor: Record<string, string> = {
  low: 'text-emerald-400',
  medium: 'text-amber-400',
  high: 'text-red-400',
};

const columns = [
  { key: 'niche_name', label: 'Ниша', sortable: true },
  { key: 'total_score', label: 'Балл', sortable: true },
  { key: 'market_growth', label: 'Рост', sortable: true },
  { key: 'margin_potential', label: 'Маржа', sortable: true },
  { key: 'competition_level', label: 'Конкуренция', sortable: false },
  { key: 'startup_capital', label: 'Капитал', sortable: true },
  { key: 'created_at', label: 'Дата', sortable: true },
  { key: 'status', label: 'Статус', sortable: false },
];

const competitionLabel: Record<string, string> = {
  low: 'низкая',
  medium: 'средняя',
  high: 'высокая',
};

const statusLabel: Record<string, string> = {
  active: 'активна',
  rejected: 'отклонена',
  archived: 'в архиве',
};

export function NichesTable({ niches, sortField, sortOrder, onSort, onSelect }: Props) {
  if (niches.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
        Ниши не найдены
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
          {niches.map((niche) => (
            <tr
              key={niche.id}
              onClick={() => onSelect(niche)}
              className="table-row-animated border-b border-border/50 cursor-pointer"
            >
              <td className="py-3 px-4 font-medium max-w-[240px] truncate">
                {niche.niche_name}
              </td>
              <td className="py-3 px-4">
                <span className="text-gradient font-semibold">{niche.total_score}</span>
              </td>
              <td className="py-3 px-4">{niche.market_growth}%</td>
              <td className="py-3 px-4">{niche.margin_potential}%</td>
              <td className="py-3 px-4">
                <span className={`${competitionColor[niche.competition_level]}`}>
                  {competitionLabel[niche.competition_level]}
                </span>
              </td>
              <td className="py-3 px-4">{formatNumber(niche.startup_capital)}</td>
              <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                {new Date(niche.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${statusDot[niche.status]}`} />
                  <span className="text-muted-foreground">{statusLabel[niche.status]}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
