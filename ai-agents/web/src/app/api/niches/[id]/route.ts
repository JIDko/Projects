import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const { status } = body as { status: string };

  if (!['active', 'rejected', 'archived'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const { error } = await supabase
    .from('niches')
    .update({ status })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If rejecting, also insert into rejections table for dedup
  if (status === 'rejected') {
    const { data: niche } = await supabase
      .from('niches')
      .select('niche_name')
      .eq('id', id)
      .single();

    if (niche) {
      await supabase.from('rejections').insert({
        niche_name: niche.niche_name,
        reason: 'manual_rejection',
      });
    }
  }

  return NextResponse.json({ ok: true });
}
