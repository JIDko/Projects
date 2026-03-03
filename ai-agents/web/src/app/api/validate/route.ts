import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { supabase } from '@/lib/supabase';

// UUID format check
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function runAgent(args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['tsx', ...args], {
      cwd,
      env: { ...process.env },
      shell: true, // required on Windows for npx
      timeout: 300_000,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

    child.on('error', (err) => reject(err));
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Process exited with code ${code}.\n${stderr || stdout}`));
      } else {
        resolve(stdout);
      }
    });
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      nicheId?: string;
      idea?: string;
      market?: string;
    };

    if (!body.nicheId && !body.idea) {
      return NextResponse.json(
        { error: 'Either nicheId or idea is required' },
        { status: 400 },
      );
    }

    if (body.nicheId && !UUID_RE.test(body.nicheId)) {
      return NextResponse.json(
        { error: 'Invalid nicheId format' },
        { status: 400 },
      );
    }

    // Build CLI args as array
    const args = ['src/agents/business-validator/index.ts'];
    if (body.nicheId) {
      args.push('--niche-id', body.nicheId);
    } else {
      args.push('--idea', body.idea!);
      args.push('--market', body.market ?? 'global english-speaking');
    }

    // Resolve monorepo root (one level up from web/)
    const webDir = process.cwd();
    const rootDir = webDir.endsWith(path.sep + 'web')
      ? path.resolve(webDir, '..')
      : webDir;

    console.log(`[api/validate] Running: npx tsx ${args.join(' ')} in ${rootDir}`);

    const stdout = await runAgent(args, rootDir);

    // Parse validation ID from stdout (agent prints "Validation saved: <uuid>")
    const idMatch = stdout.match(/Validation saved:\s*([0-9a-f-]{36})/i);

    let data = null;
    if (idMatch) {
      const result = await supabase
        .from('validations')
        .select('*')
        .eq('id', idMatch[1])
        .single();
      data = result.data;
    }

    // Fallback: fetch latest by niche_id
    if (!data && body.nicheId) {
      const result = await supabase
        .from('validations')
        .select('*')
        .eq('niche_id', body.nicheId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      data = result.data;
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Validation completed but could not fetch result' },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('[api/validate]', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
