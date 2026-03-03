'use client';

import { Search } from 'lucide-react';

interface Props {
  verdict: string;
  search: string;
  onVerdictChange: (v: string) => void;
  onSearchChange: (s: string) => void;
}

export function ValidationsFilters({ verdict, search, onVerdictChange, onSearchChange }: Props) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Поиск по идее..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-muted/20 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>

      <select
        value={verdict}
        onChange={(e) => onVerdictChange(e.target.value)}
        className="px-4 py-2.5 rounded-2xl bg-muted/20 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
      >
        <option value="">Все вердикты</option>
        <option value="GO">GO</option>
        <option value="CONDITIONAL_GO">CONDITIONAL GO</option>
        <option value="NO_GO">NO GO</option>
      </select>
    </div>
  );
}
