import { NextRequest, NextResponse } from 'next/server';
import { EXAMPLE_CONTRACTS } from '@/lib/examples';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key');

  if (key) {
    const example = EXAMPLE_CONTRACTS[key];
    if (!example) {
      return NextResponse.json({ error: 'Example not found' }, { status: 404 });
    }
    return NextResponse.json(example);
  }

  // Return list of available examples (without source)
  const list = Object.entries(EXAMPLE_CONTRACTS).map(([key, ex]) => ({
    key,
    title: ex.title,
    description: ex.description,
    severity: ex.severity,
  }));

  return NextResponse.json(list);
}
