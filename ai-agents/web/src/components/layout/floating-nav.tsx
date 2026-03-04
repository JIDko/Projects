'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Cpu, Lightbulb, Bot, Radar, ShieldCheck, Swords, Blocks } from 'lucide-react';

const agents = [
  { href: '/agents/niche-researcher', icon: Radar, label: 'Signal Detector' },
  { href: '/agents/business-validator', icon: ShieldCheck, label: 'Business Validator' },
  { href: '/agents/competitive-intel', icon: Swords, label: 'Competitive Intel' },
  { href: '/agents/product-architect', icon: Blocks, label: 'Product Architect' },
];

export function FloatingNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const handleEnter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };

  const handleLeave = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };

  const isHome = pathname === '/';
  const isNiches = pathname.startsWith('/niches');
  const isAgent = pathname.startsWith('/agents');

  return (
    <nav className="fixed top-5 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-6 pointer-events-auto">
      {/* Центр */}
      <Link href="/" className="pointer-events-auto">
        <Cpu
          className={`h-9 w-9 transition-all duration-200 nav-glitch-icon ${
            isHome
              ? 'text-accent drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]'
              : 'text-muted-foreground/50 hover:text-matrix-green hover:drop-shadow-[0_0_10px_rgba(0,255,65,0.5)]'
          }`}
          strokeWidth={1.5}
        />
      </Link>

      {/* Ниши */}
      <Link href="/niches" className="pointer-events-auto">
        <Lightbulb
          className={`h-9 w-9 transition-all duration-200 nav-glitch-icon ${
            isNiches
              ? 'text-accent drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]'
              : 'text-muted-foreground/50 hover:text-matrix-green hover:drop-shadow-[0_0_10px_rgba(0,255,65,0.5)]'
          }`}
          strokeWidth={1.5}
        />
      </Link>

      {/* Агенты — dropdown on hover */}
      <div
        className="relative pointer-events-auto w-9 h-9"
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        <Bot
          className={`h-9 w-9 transition-all duration-200 nav-glitch-icon cursor-pointer ${
            isAgent
              ? 'text-accent drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]'
              : 'text-muted-foreground/50 hover:text-matrix-green hover:drop-shadow-[0_0_10px_rgba(0,255,65,0.5)]'
          }`}
          strokeWidth={1.5}
        />

        {open && (
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 glass-card py-2 min-w-[200px] animate-fade-in">
            {agents.map(({ href, icon: Icon, label }) => {
              const active = pathname.startsWith(href);
              return (
                <button
                  key={href}
                  onClick={() => { router.push(href); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    active
                      ? 'text-accent'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/5'
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" strokeWidth={1.5} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}
