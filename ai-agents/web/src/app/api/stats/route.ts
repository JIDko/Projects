import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const [nichesCount, activeNiches, bestNiche, cyclesCount] = await Promise.all([
      supabase.from('niches').select('*', { count: 'exact', head: true }),
      supabase.from('niches').select('total_score').eq('status', 'active'),
      supabase
        .from('niches')
        .select('*')
        .eq('status', 'active')
        .order('total_score', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from('cycles').select('*', { count: 'exact', head: true }),
    ]);

    const scores = (activeNiches.data ?? []).map((n) => Number(n.total_score));
    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    return NextResponse.json({
      totalNiches: nichesCount.count ?? 0,
      avgScore,
      bestNiche: bestNiche.data ?? null,
      totalCycles: cyclesCount.count ?? 0,
    });
  } catch (err) {
    console.error('[api/stats]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
