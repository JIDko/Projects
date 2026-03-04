import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const ALLOWED_SORT = ['created_at', 'total_score', 'idea', 'readiness'];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const competitiveAnalysisId = searchParams.get('competitiveAnalysisId');
    const search = searchParams.get('search');
    const limit = searchParams.get('limit');
    const sort = searchParams.get('sort') ?? 'created_at';
    const order = searchParams.get('order') ?? 'desc';

    let query = supabase
      .from('product_specs')
      .select('*')
      .eq('status', 'active');

    if (competitiveAnalysisId) query = query.eq('competitive_analysis_id', competitiveAnalysisId);
    if (search) query = query.ilike('idea', `%${search}%`);

    const sortCol = ALLOWED_SORT.includes(sort) ? sort : 'created_at';
    const rowLimit = limit ? Math.min(parseInt(limit, 10), 100) : 100;
    query = query.order(sortCol, { ascending: order === 'asc' }).limit(rowLimit);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error('[api/product-specs]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
