'use client';

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { Heart } from 'lucide-react';
import type { Niche } from '@/lib/types';

interface Props {
  niche: Niche;
  onClick: () => void;
  favorited: boolean;
  onToggleFavorite: () => void;
}

/* ── Card Matrix Background ─────────────────────────── */

const MATRIX_CHARS = 'アイウエオカキクケコサシスセソタチツテト01ナニヌネノ10ハヒフヘホ';

function CardMatrix({ seed }: { seed: string }) {
  const text = useMemo(() => {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
    let result = '';
    for (let i = 0; i < 140; i++) {
      h = ((h << 5) - h + i) | 0;
      result += MATRIX_CHARS[Math.abs(h) % MATRIX_CHARS.length];
      if ((i + 1) % 12 === 0) result += '\n';
    }
    return result;
  }, [seed]);

  return (
    <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none card-matrix-wrap">
      <pre
        className="absolute inset-0 text-[7px] leading-[1.6] tracking-[0.35em] text-matrix-green font-mono select-none p-2 overflow-hidden whitespace-pre"
        style={{ opacity: 0.05 }}
      >
        {text}
      </pre>
    </div>
  );
}

/* ── Score Ring ──────────────────────────────────────── */

function ScoreRing({ score, size = 78, strokeWidth = 5 }: { score: number; size?: number; strokeWidth?: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = mounted ? circumference - (score / 100) * circumference : circumference;

  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  const glow = score >= 75 ? 'rgba(16,185,129,0.4)' : score >= 50 ? 'rgba(245,158,11,0.4)' : 'rgba(239,68,68,0.4)';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(39,39,42,0.5)" strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="score-ring-arc"
          style={{ filter: `drop-shadow(0 0 8px ${glow})` }}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center font-bold tabular-nums"
        style={{ color, fontSize: size * 0.3 }}
      >
        {score}
      </span>
    </div>
  );
}

/* ── Mini Metric Bar ────────────────────────────────── */

function MetricBar({ value, max, label, color }: { value: number; max: number; label: string; color: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 300); return () => clearTimeout(t); }, []);

  const pct = Math.min((value / max) * 100, 100);

  return (
    <div className="space-y-0.5">
      <div className="flex justify-between items-center">
        <span className="text-[11px] text-muted-foreground/50 uppercase tracking-wider">{label}</span>
        <span className="text-[11px] tabular-nums text-muted-foreground/70">{value}</span>
      </div>
      <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: mounted ? `${pct}%` : '0%',
            background: color,
            transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: `0 0 6px ${color}44`,
          }}
        />
      </div>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────── */

function compToVisual(level: string) {
  switch (level) {
    case 'low': return { value: 25, color: '#10b981' };
    case 'medium': return { value: 55, color: '#f59e0b' };
    case 'high': return { value: 85, color: '#ef4444' };
    default: return { value: 50, color: '#a1a1aa' };
  }
}

function confLabel(level: string) {
  switch (level) {
    case 'high': return { text: 'выс.', color: '#10b981' };
    case 'medium': return { text: 'сред.', color: '#f59e0b' };
    case 'low': return { text: 'низ.', color: '#ef4444' };
    default: return { text: level, color: '#a1a1aa' };
  }
}

/* ── Card ────────────────────────────────────────────── */

export function NicheCard({ niche, onClick, favorited, onToggleFavorite }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setTilt({
      x: (y - 0.5) * -14,
      y: (x - 0.5) * 14,
    });
  }, []);

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  const comp = compToVisual(niche.competition_level);
  const conf = confLabel(niche.confidence_level);

  const scoreGlow = niche.total_score >= 75
    ? 'rgba(16,185,129,0.12)'
    : niche.total_score >= 50
      ? 'rgba(245,158,11,0.12)'
      : 'rgba(239,68,68,0.12)';

  const date = new Date(niche.created_at);
  const dateStr = `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}`;

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className="glass-card niche-card-tilt p-4 text-left w-full group relative cursor-pointer aspect-square flex flex-col"
      style={{
        transform: `perspective(600px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)${isHovered ? ' translateY(-3px)' : ''}`,
        transition: isHovered
          ? 'transform 0.08s ease-out, box-shadow 0.3s ease, border-color 0.3s ease'
          : 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.3s ease, border-color 0.3s ease',
      }}
    >
      {/* Pipeline progress indicator */}
      {(niche.has_validation || niche.has_competitors || niche.has_product_spec) && (
        <div
          className="absolute top-0 left-6 right-6 h-[2px] rounded-b-full z-[2]"
          style={{
            background: niche.has_product_spec
              ? 'linear-gradient(90deg, #06b6d4, #8b5cf6, #f59e0b)'
              : niche.has_competitors
                ? 'linear-gradient(90deg, #06b6d4, #8b5cf6)'
                : '#06b6d4',
            boxShadow: niche.has_product_spec
              ? '0 0 8px rgba(6,182,212,0.5), 0 0 8px rgba(139,92,246,0.5), 0 0 8px rgba(245,158,11,0.5)'
              : niche.has_competitors
                ? '0 0 8px rgba(6,182,212,0.5), 0 0 8px rgba(139,92,246,0.5)'
                : '0 0 8px rgba(6,182,212,0.5)',
          }}
        />
      )}

      {/* Matrix character background */}
      <CardMatrix seed={niche.id} />

      {/* Score glow background */}
      <div
        className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 40%, ${scoreGlow} 0%, transparent 70%)`,
        }}
      />

      {/* Heart */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
        className="absolute top-3 right-3 z-10"
      >
        <Heart
          className={`h-5 w-5 transition-all duration-200 ${
            favorited
              ? 'text-red-500 fill-red-500 drop-shadow-[0_0_6px_rgba(239,68,68,0.5)]'
              : 'text-muted-foreground/20 hover:text-muted-foreground/50'
          }`}
          strokeWidth={1.5}
        />
      </button>

      {/* Content */}
      <div onClick={onClick} className="flex flex-col flex-1 relative z-[1]">
        {/* Name */}
        <p className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-accent transition-colors duration-300 pr-6">
          {niche.niche_name}
        </p>

        {/* Score ring — center */}
        <div className="flex-1 flex items-center justify-center min-h-0">
          <ScoreRing score={niche.total_score} />
        </div>

        {/* Metric bars */}
        <div className="space-y-1">
          <MetricBar value={niche.margin_potential} max={100} label="маржа" color="#06b6d4" />
          <MetricBar value={niche.ai_automation_score} max={100} label="ai" color="#8b5cf6" />
          <MetricBar value={comp.value} max={100} label="конкур." color={comp.color} />
        </div>

        {/* Bottom: confidence + signals + date */}
        <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-white/[0.04]">
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1">
              <span
                className="h-2 w-2 rounded-full ring-glow"
                style={{ background: conf.color, boxShadow: `0 0 4px ${conf.color}66` }}
              />
              <span className="text-[11px] text-muted-foreground/40">{conf.text}</span>
            </span>
            {niche.signal_count != null && niche.signal_count > 0 && (
              <span className="text-[11px] text-muted-foreground/30">
                {niche.signal_count} сиг.
              </span>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground/25 tabular-nums">{dateStr}</span>
        </div>
      </div>
    </div>
  );
}
