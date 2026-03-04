import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const status = searchParams.get('status');
    const competition = searchParams.get('competition');
    const search = searchParams.get('search');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const sort = searchParams.get('sort') ?? 'total_score';
    const order = searchParams.get('order') ?? 'desc';

    let query = supabase.from('niches').select('*');

    if (status) query = query.eq('status', status);
    if (competition) query = query.eq('competition_level', competition);
    if (search) query = query.ilike('niche_name', `%${search}%`);
    if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00`);
    if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59`);

    query = query.order(sort, { ascending: order === 'asc' });

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Enrich with pipeline progress flags
    const { data: vals } = await supabase
      .from('validations')
      .select('id, niche_id');

    const { data: comps } = await supabase
      .from('competitive_analyses')
      .select('id, validation_id');

    const { data: specs } = await supabase
      .from('product_specs')
      .select('competitive_analysis_id')
      .eq('status', 'active');

    const validatedNicheIds = new Set(vals?.map(v => v.niche_id).filter(Boolean));
    const compValIds = new Set(comps?.map(c => c.validation_id));
    const analyzedNicheIds = new Set(
      vals?.filter(v => compValIds.has(v.id) && v.niche_id).map(v => v.niche_id)
    );

    // Build set of niche IDs that have product specs
    const specCompIds = new Set(specs?.map(s => s.competitive_analysis_id));
    const specValIds = new Set(
      comps?.filter(c => specCompIds.has(c.id)).map(c => c.validation_id)
    );
    const specNicheIds = new Set(
      vals?.filter(v => specValIds.has(v.id) && v.niche_id).map(v => v.niche_id)
    );

    const enriched = (data ?? []).map(n => ({
      ...n,
      has_validation: validatedNicheIds.has(n.id),
      has_competitors: analyzedNicheIds.has(n.id),
      has_product_spec: specNicheIds.has(n.id),
    }));

    return NextResponse.json(enriched);
  } catch (err) {
    console.error('[api/niches]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
