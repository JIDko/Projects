import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

const AGENT_SCRIPTS: Record<string, string> = {
  'niche-researcher': 'agent:niche',
  'business-validator': 'agent:validate',
  'competitive-intel': 'agent:competitive',
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
    // Fire-and-forget: spawn the agent process detached
    const child = spawn('npm', ['run', script], {
      cwd: AGENT_ROOT,
      detached: true,
      stdio: 'ignore',
      shell: true,
    });
    child.unref();

    return NextResponse.json({
      message: `Агент "${name}" запущен. Результаты появятся в таблице циклов.`,
      status: 'started',
      pid: child.pid,
    });
  } catch (err) {
    return NextResponse.json(
      { message: `Ошибка запуска: ${err instanceof Error ? err.message : err}`, status: 'error' },
      { status: 500 },
    );
  }
}
