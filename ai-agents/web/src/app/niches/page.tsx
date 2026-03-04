'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, ArrowUpDown } from 'lucide-react';
import { useNiches } from '@/hooks/use-niches';
import { useFavorites } from '@/hooks/use-favorites';
import { NicheCard } from '@/components/niches/niche-card';
import { ParticleNetwork } from '@/components/niches/particle-network';

type Filter = 'active' | 'rejected';
type SortDir = 'desc' | 'asc';

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

export default function NichesPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('active');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [trashMode, setTrashMode] = useState(false);

  const { niches, isLoading } = useNiches({
    status: trashMode ? 'active' : filter,
    sort: 'created_at',
    order: sortDir,
  });

  const { isFavorited, toggle } = useFavorites();

  // Trash: active niches older than 7 days that are NOT favorited
  const displayed = useMemo(() => {
    if (!trashMode) return niches;
    const cutoff = Date.now() - SEVEN_DAYS;
    return niches.filter(n => {
      const created = new Date(n.created_at).getTime();
      return created < cutoff && !isFavorited(n.id);
    });
  }, [niches, trashMode, isFavorited]);

  return (
    <>
    <ParticleNetwork />
    <div className="p-6 pt-20 space-y-4 relative z-[1]">
      {/* Top bar: trash */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => setTrashMode(v => !v)}
          className="nav-glitch-icon"
        >
          <Trash2
            className={`h-6 w-6 transition-colors ${
              trashMode ? 'text-destructive' : 'text-muted-foreground/40 hover:text-muted-foreground'
            }`}
            strokeWidth={1.5}
          />
        </button>
      </div>

      {/* Filters row */}
      {!trashMode && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              filter === 'active'
                ? 'bg-accent/15 text-accent'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            В работе
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              filter === 'rejected'
                ? 'bg-destructive/15 text-destructive'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Отклонённые
          </button>

          <div className="flex-1" />

          <button
            onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowUpDown className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>{sortDir === 'desc' ? 'Новые' : 'Старые'}</span>
          </button>
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="glass-card aspect-square animate-pulse" />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-muted-foreground text-sm">
            {trashMode ? 'Корзина пуста' : 'Ниши не найдены'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {displayed.map((niche, i) => (
            <div key={niche.id} className="card-stagger" style={{ animationDelay: `${0.05 * Math.min(i, 11)}s` }}>
              <NicheCard
                niche={niche}
                onClick={() => router.push(`/niches/${niche.id}`)}
                favorited={isFavorited(niche.id)}
                onToggleFavorite={() => toggle(niche.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
    </>
  );
}
