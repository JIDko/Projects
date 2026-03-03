'use client';

const verdictConfig: Record<string, { label: string; class: string }> = {
  GO: { label: 'GO', class: 'bg-emerald-500/20 text-emerald-400' },
  CONDITIONAL_GO: { label: 'CONDITIONAL', class: 'bg-amber-500/20 text-amber-400' },
  NO_GO: { label: 'NO GO', class: 'bg-red-500/20 text-red-400' },
};

export function VerdictBadge({ verdict, size = 'sm' }: { verdict: string; size?: 'sm' | 'lg' }) {
  const cfg = verdictConfig[verdict] ?? { label: verdict, class: 'bg-zinc-500/20 text-zinc-400' };
  const sizeClass = size === 'lg' ? 'text-sm px-3 py-1' : 'text-xs px-2 py-0.5';

  return (
    <span className={`font-semibold rounded-full ${sizeClass} ${cfg.class}`}>
      {cfg.label}
    </span>
  );
}
