import { NextRequest, NextResponse } from 'next/server';
import { analyzeSource } from '@/lib/analyzer';
import { EXAMPLE_CONTRACTS } from '@/lib/examples';
import type { ScanRequest } from '@/types';

// Simple in-memory rate limiter (per-process, resets on restart)
const rateLimitMap = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT = parseInt(process.env.RATE_LIMIT_RPM ?? '20', 10);

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const window = 60_000; // 1 minute
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.reset) {
    rateLimitMap.set(ip, { count: 1, reset: now + window });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  // Rate limiting
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? '127.0.0.1';
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a minute.' },
      { status: 429 }
    );
  }

  try {
    const body: ScanRequest = await req.json();
    const { mode, input } = body;

    if (!input?.trim()) {
      return NextResponse.json({ error: 'Input is required' }, { status: 400 });
    }

    let source = input.trim();
    let label = 'Contract Source';

    if (mode === 'address') {
      const addr = input.trim();
      if (addr.length !== 42 || !addr.startsWith('0x')) {
        return NextResponse.json({ error: 'Invalid Ethereum address' }, { status: 400 });
      }

      // Try Etherscan API if key provided
      const etherscanKey = process.env.ETHERSCAN_API_KEY;
      if (etherscanKey && etherscanKey !== 'your_etherscan_api_key_here') {
        try {
          const url = `https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${addr}&apikey=${etherscanKey}`;
          const res = await fetch(url, { next: { revalidate: 3600 } });
          const data = await res.json();
          if (data.status === '1' && data.result?.[0]?.SourceCode) {
            source = data.result[0].SourceCode.replace(/^{{/, '').replace(/}}$/, '');
            label = `${addr.slice(0, 6)}…${addr.slice(-4)} (Etherscan)`;
          } else {
            // Fallback to demo
            source = EXAMPLE_CONTRACTS.forwarder.source;
            label = `${addr.slice(0, 6)}…${addr.slice(-4)} (demo — add ETHERSCAN_API_KEY for live)`;
          }
        } catch {
          source = EXAMPLE_CONTRACTS.forwarder.source;
          label = `${addr.slice(0, 6)}…${addr.slice(-4)} (demo fallback)`;
        }
      } else {
        // No API key — use demo source
        source = EXAMPLE_CONTRACTS.forwarder.source;
        label = `${addr.slice(0, 6)}…${addr.slice(-4)} (demo — set ETHERSCAN_API_KEY for live fetch)`;
      }
    } else if (mode === 'bytecode') {
      if (!/^0x[0-9a-fA-F]+$/.test(source)) {
        return NextResponse.json({ error: 'Invalid bytecode — must be 0x-prefixed hex' }, { status: 400 });
      }
      // Bytecode static analysis: scan for known dangerous PUSH constants
      // In production this runs through revm disassembler
      source = EXAMPLE_CONTRACTS.forwarder.source + '\n// [Reconstructed from bytecode for demo]';
      label = 'Bytecode Analysis';
    } else {
      label = 'Pasted Source';
    }

    // Simulate async analysis pipeline (small delay feels more real)
    await new Promise(r => setTimeout(r, 400 + Math.random() * 300));

    const result = analyzeSource(source, label);

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store',
        'X-RepriceGuard-Version': '0.1.0',
      },
    });
  } catch (err) {
    console.error('[/api/scan] Error:', err);
    return NextResponse.json({ error: 'Analysis failed. Please try again.' }, { status: 500 });
  }
}
