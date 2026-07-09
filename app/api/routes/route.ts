// GET /api/routes — 路線列表（Phase 5）
import { NextResponse } from 'next/server';
import { listRoutes } from '@/lib/route-queries';

export async function GET() {
  const routes = await listRoutes();
  return NextResponse.json(
    { routes },
    { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' } }
  );
}
