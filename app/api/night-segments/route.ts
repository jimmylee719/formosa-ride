// GET /api/night-segments — 夜間警示路段（Phase 7B）
// 全台僅數段（v10.0 C5：此類資料維持腳本管理），一次全量回傳即可。
import { NextResponse } from 'next/server';
import { createAnonServerClient } from '@/lib/supabase-server';

export async function GET() {
  const supabase = createAnonServerClient();
  const { data, error } = await supabase
    .from('night_warning_segments')
    .select('id, name_zh, name_en, geometry, warning_reason_zh, warning_reason_en, severity')
    .eq('is_active', true);

  if (error) {
    console.error('[api/night-segments] error:', error.message);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }
  return NextResponse.json(
    { segments: data ?? [] },
    { headers: { 'Cache-Control': 'public, max-age=3600' } }
  );
}
