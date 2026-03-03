import { cn } from '@/lib/utils';

interface Props {
  flag: string;
}

const flagColors: Record<string, { text: string; bg: string }> = {
  PLATFORM_DEPENDENCY: { text: 'text-amber-400', bg: 'bg-amber-400/10' },
  LEGAL_REGULATORY_RISK: { text: 'text-red-400', bg: 'bg-red-400/10' },
  DOMINATED_BY_GIANTS: { text: 'text-orange-400', bg: 'bg-orange-400/10' },
  HIGH_SEASONALITY: { text: 'text-purple-400', bg: 'bg-purple-400/10' },
};

const flagLabels: Record<string, string> = {
  PLATFORM_DEPENDENCY: 'Зависимость от платформы',
  LEGAL_REGULATORY_RISK: 'Юридические риски',
  DOMINATED_BY_GIANTS: 'Доминируют гиганты',
  HIGH_SEASONALITY: 'Высокая сезонность',
};

function formatFlag(flag: string): string {
  return flagLabels[flag] ?? flag
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function RiskFlagBadge({ flag }: Props) {
  const colors = flagColors[flag] ?? { text: 'text-zinc-400', bg: 'bg-zinc-400/10' };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-xl text-xs font-medium',
        colors.text,
        colors.bg,
      )}
    >
      {formatFlag(flag)}
    </span>
  );
}
