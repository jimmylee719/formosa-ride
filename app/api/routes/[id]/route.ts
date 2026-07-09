// GET /api/routes/[id] — 路線詳情（含 GeoJSON geometry，Phase 5）
import { NextRequest, NextResponse } from 'next/server';
import { getRoute } from '@/lib/route-queries';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid route id' }, { status: 400 });
  }
  const route = await getRoute(id);
  if (!route) {
    return NextResponse.json({ error: 'Route not found' }, { status: 404 });
  }
  return NextResponse.json(
    { route },
    { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' } }
  );
}
