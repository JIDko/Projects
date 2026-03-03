'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Bot, Swords, Lightbulb, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const nav = [
  { href: '/', label: 'Дашборд', icon: LayoutDashboard },
  { href: '/agents', label: 'Агенты', icon: Bot },
  { href: '/competitors', label: 'Конкуренты', icon: Swords },
  { href: '/niches', label: 'Ниши', icon: Lightbulb },
  { href: '/validations', label: 'Валидации', icon: ShieldCheck },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 border-r border-border bg-card/60 backdrop-blur-xl flex flex-col z-50">
      <div className="p-6 pb-4">
        <h1 className="text-lg font-semibold tracking-tight">
          <span className="text-gradient">AI</span>{' '}
          <span className="text-foreground">Командный Центр</span>
        </h1>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'nav-link flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-300',
                active
                  ? 'nav-link-active bg-accent/10 text-accent'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              )}
            >
              <span className="nav-icon-wrap">
                <Icon className="h-5 w-5" strokeWidth={1.5} />
              </span>
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 text-xs text-muted-foreground">
        v0.1.0
      </div>
    </aside>
  );
}
