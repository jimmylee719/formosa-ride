// /api/pois/search?q=關鍵字 — POI 名稱搜尋（Phase 19A，規劃停靠點用）
// 中英文名稱各查一次再合併（不用 .or() 字串拼接，避免 PostgREST filter 注入）。
import { NextRequest, NextResponse } from 'next/server';
import { createAnonServerClient } from '@/lib/supabase-server';

const COLS = 'id, name_zh, name_en, type';
const LIMIT = 12;

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 50);
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }
  // ilike 萬用字元跳脫：% _ 視為字面值
  const escaped = q.replace(/[%_]/g, (m) => `\\${m}`);
  const pattern = `%${escaped}%`;

  const supabase = createAnonServerClient();
  const [zh, en] = await Promise.all([
    supabase.from('pois').select(COLS).ilike('name_zh', pattern).limit(LIMIT),
    supabase.from('pois').select(COLS).ilike('name_en', pattern).limit(LIMIT),
  ]);
  if (zh.error && en.error) {
    console.error('[api/pois/search] error:', zh.error.message);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }
  const seen = new Set<string>();
  const results = [...(zh.data ?? []), ...(en.data ?? [])]
    .filter((r) => {
      if (seen.has(r.id as string)) return false;
      seen.add(r.id as string);
      return true;
    })
    .slice(0, LIMIT);
  return NextResponse.json(
    { results },
    { headers: { 'Cache-Control': 'public, max-age=300' } }
  );
}
