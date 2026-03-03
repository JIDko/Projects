import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;

  const { data, error } = await supabase
    .from('agent_configs')
    .select('*')
    .eq('agent_name', name)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  const body = await req.json();

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.system_prompt !== undefined) updates.system_prompt = body.system_prompt;
  if (body.config !== undefined) updates.config = body.config;
  if (body.is_active !== undefined) updates.is_active = body.is_active;

  const { error } = await supabase
    .from('agent_configs')
    .update(updates)
    .eq('agent_name', name);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
