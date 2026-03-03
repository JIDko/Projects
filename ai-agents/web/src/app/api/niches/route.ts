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

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error('[api/niches]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
