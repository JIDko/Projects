import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { supabase } from '@/lib/supabase';

const AGENT_SCRIPTS: Record<string, string> = {
  'niche-researcher': 'agent:niche',
  'business-validator': 'agent:validate',
  'competitive-intel': 'agent:competitive',
  'product-architect': 'agent:architect',
};

// In Next.js process.cwd() = web/, so parent = ai-agents/
// Can override via AGENT_ROOT env var if project layout changes
const AGENT_ROOT = process.env['AGENT_ROOT'] || path.resolve(process.cwd(), '..');

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;

  const script = AGENT_SCRIPTS[name];
  if (!script) {
    return NextResponse.json(
      { message: `Агент "${name}" не найден`, status: 'error' },
      { status: 404 },
    );
  }

  try {
    // Create cycle in DB immediately so the UI shows "running" instantly
    const { data: cycle } = await supabase
      .from('cycles')
      .insert({
        agent_name: name,
        started_at: new Date().toISOString(),
        status: 'running',
        niches_generated: 0,
        niches_after_dedup: 0,
        niches_after_filter: 0,
        niches_saved: 0,
        search_queries_used: [],
      })
      .select('id')
      .single();

    const cycleId = cycle?.id as string | undefined;

    // Fire-and-forget: spawn the agent process detached
    // Pass CYCLE_ID so the agent reuses this cycle instead of creating a new one
    const child = spawn('npm', ['run', script], {
      cwd: AGENT_ROOT,
      detached: true,
      stdio: 'ignore',
      shell: true,
      env: { ...process.env, ...(cycleId ? { CYCLE_ID: cycleId } : {}) },
    });
    child.unref();

    return NextResponse.json({
      message: `Агент "${name}" запущен.`,
      status: 'started',
      pid: child.pid,
      cycleId,
    });
  } catch (err) {
    return NextResponse.json(
      { message: `Ошибка запуска: ${err instanceof Error ? err.message : err}`, status: 'error' },
      { status: 500 },
    );
  }
}
