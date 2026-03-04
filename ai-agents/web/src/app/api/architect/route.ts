import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { supabase } from '@/lib/supabase';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function runAgent(args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['tsx', ...args], {
      cwd,
      env: { ...process.env },
      shell: true,
      timeout: 600_000,
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
    const body = (await req.json()) as { competitiveAnalysisId?: string };

    if (!body.competitiveAnalysisId || !UUID_RE.test(body.competitiveAnalysisId)) {
      return NextResponse.json(
        { error: 'Valid competitiveAnalysisId is required' },
        { status: 400 },
      );
    }

    const args = [
      'src/agents/product-architect/index.ts',
      '--competitive-analysis-id',
      body.competitiveAnalysisId,
    ];

    const webDir = process.cwd();
    const rootDir = webDir.endsWith(path.sep + 'web')
      ? path.resolve(webDir, '..')
      : webDir;

    console.log(`[api/architect] Running: npx tsx ${args.join(' ')} in ${rootDir}`);

    const stdout = await runAgent(args, rootDir);

    // Parse spec ID from stdout
    const idMatch = stdout.match(/Product spec saved:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);

    let data = null;
    if (idMatch) {
      const result = await supabase
        .from('product_specs')
        .select('*')
        .eq('id', idMatch[1])
        .single();
      data = result.data;
    }

    // Fallback: fetch latest by competitive_analysis_id
    if (!data) {
      const result = await supabase
        .from('product_specs')
        .select('*')
        .eq('competitive_analysis_id', body.competitiveAnalysisId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      data = result.data;
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Specification completed but could not fetch result' },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('[api/architect]', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
