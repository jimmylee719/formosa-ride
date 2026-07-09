// GET /api/restricted-roads — 禁行路段（Phase 8）
// 全台僅少數路段（腳本管理，v10.0 C5），一次全量回傳。
import { NextResponse } from 'next/server';
import { createAnonServerClient } from '@/lib/supabase-server';

export async function GET() {
  const supabase = createAnonServerClient();
  const { data, error } = await supabase
    .from('restricted_roads')
    .select('id, name_zh, name_en, geometry, road_type, road_number, law_basis')
    .eq('is_active', true);
  if (error) {
    console.error('[api/restricted-roads] error:', error.message);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }
  return NextResponse.json(
    { roads: data ?? [] },
    { headers: { 'Cache-Control': 'public, max-age=3600' } }
  );
}
