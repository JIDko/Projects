import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const ALLOWED_SORT = ['created_at', 'total_score', 'idea', 'verdict', 'confidence_level'];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const verdict = searchParams.get('verdict');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') ?? 'created_at';
    const order = searchParams.get('order') ?? 'desc';

    let query = supabase
      .from('validations')
      .select('*')
      .eq('status', 'active');

    if (verdict) query = query.eq('verdict', verdict);
    if (search) query = query.ilike('idea', `%${search}%`);

    const sortCol = ALLOWED_SORT.includes(sort) ? sort : 'created_at';
    query = query.order(sortCol, { ascending: order === 'asc' }).limit(200);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error('[api/validations]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
