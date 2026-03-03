'use client';

import { Search } from 'lucide-react';

interface Props {
  status: string;
  competition: string;
  search: string;
  dateFrom: string;
  dateTo: string;
  onStatusChange: (v: string) => void;
  onCompetitionChange: (v: string) => void;
  onSearchChange: (v: string) => void;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
}

const statusOptions = [
  { value: '', label: 'Все статусы' },
  { value: 'active', label: 'Активные' },
  { value: 'rejected', label: 'Отклонённые' },
  { value: 'archived', label: 'В архиве' },
];

const competitionOptions = [
  { value: '', label: 'Вся конкуренция' },
  { value: 'low', label: 'Низкая' },
  { value: 'medium', label: 'Средняя' },
  { value: 'high', label: 'Высокая' },
];

export function NichesFilters({
  status,
  competition,
  search,
  dateFrom,
  dateTo,
  onStatusChange,
  onCompetitionChange,
  onSearchChange,
  onDateFromChange,
  onDateToChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Поиск ниш..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-muted/30 border border-border rounded-2xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 transition-colors"
        />
      </div>

      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        className="px-4 py-2 bg-muted/30 border border-border rounded-2xl text-sm text-foreground focus:outline-none focus:border-accent/50 transition-colors appearance-none cursor-pointer"
      >
        {statusOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <select
        value={competition}
        onChange={(e) => onCompetitionChange(e.target.value)}
        className="px-4 py-2 bg-muted/30 border border-border rounded-2xl text-sm text-foreground focus:outline-none focus:border-accent/50 transition-colors appearance-none cursor-pointer"
      >
        {competitionOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">с</span>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="px-3 py-2 bg-muted/30 border border-border rounded-2xl text-sm text-foreground focus:outline-none focus:border-accent/50 transition-colors [color-scheme:dark]"
        />
        <span className="text-sm text-muted-foreground">по</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className="px-3 py-2 bg-muted/30 border border-border rounded-2xl text-sm text-foreground focus:outline-none focus:border-accent/50 transition-colors [color-scheme:dark]"
        />
        {(dateFrom || dateTo) && (
          <button
            onClick={() => { onDateFromChange(''); onDateToChange(''); }}
            className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            title="Сбросить даты"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
