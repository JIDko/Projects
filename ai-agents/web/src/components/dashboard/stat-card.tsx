import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtitle?: string;
}

export function StatCard({ icon: Icon, label, value, subtitle }: StatCardProps) {
  return (
    <div className="glass-card p-6 group">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2.5 rounded-2xl bg-accent/10 transition-all duration-300 group-hover:bg-accent/20 group-hover:shadow-[0_0_16px_rgba(6,182,212,0.15)]">
          <Icon className="h-5 w-5 text-accent transition-transform duration-300 group-hover:scale-110" strokeWidth={1.5} />
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className="text-3xl font-semibold tracking-tight text-gradient">{value}</p>
      {subtitle && (
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      )}
    </div>
  );
}
