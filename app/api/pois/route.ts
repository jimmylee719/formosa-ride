// GET /api/pois?lat=..&lng=..&radius=..&types=a,b,c
// 串接 get_pois_near_point RPC（v1.0 §7.4）；公開資料，使用 anon 權限查詢。
import { NextRequest, NextResponse } from 'next/server';
import { createAnonServerClient } from '@/lib/supabase-server';

const VALID_TYPES = new Set([
  'convenience_store', 'supermarket', 'water_station',
  'campsite_legal', 'campsite_wild', 'temple_overnight',
  'public_toilet', 'shower', 'bicycle_repair', 'pump_station',
  'bicycle_parking', 'train_station', 'hospital', 'police',
  'scenic_attraction', 'restaurant', 'accommodation',
]);

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const lat = Number(sp.get('lat'));
  const lng = Number(sp.get('lng'));
  const radius = Number(sp.get('radius') ?? '5');

  // 後端輸入驗證（台灣範圍，不依賴前端）
  if (!Number.isFinite(lat) || lat < 20.5 || lat > 26.5) {
    return NextResponse.json({ error: 'Invalid lat' }, { status: 400 });
  }
  if (!Number.isFinite(lng) || lng < 117 || lng > 124.5) {
    return NextResponse.json({ error: 'Invalid lng' }, { status: 400 });
  }
  if (!Number.isFinite(radius) || radius <= 0 || radius > 50) {
    return NextResponse.json({ error: 'Invalid radius (0–50 km)' }, { status: 400 });
  }

  const typesParam = sp.get('types');
  let types: string[] | null = null;
  if (typesParam) {
    types = typesParam.split(',').filter((t) => VALID_TYPES.has(t));
    if (types.length === 0) types = null;
  }

  const supabase = createAnonServerClient();
  const { data, error } = await supabase.rpc('get_pois_near_point', {
    p_lat: lat,
    p_lng: lng,
    p_radius_km: radius,
    p_types: types,
    p_free_tier_only: false, // Phase 9 會依會員等級調整
  });

  if (error) {
    console.error('[api/pois] RPC error:', error.message);
    // 不洩漏內部錯誤細節（安全規範 5.4）
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  // Phase 4A：合併社群驗證統計（RPC 回傳未含此欄位；Phase 9 改寫函數時一併收編）
  type RpcRow = { id: string } & Record<string, unknown>;
  const rows = (data ?? []) as RpcRow[];
  let pois: RpcRow[] = rows.map((r) => ({
    ...r,
    verification_count: 0,
    last_verified_at: null,
  }));

  if (rows.length > 0) {
    const ids = rows.map((r) => r.id);
    const { data: vData } = await supabase
      .from('pois')
      .select('id, verification_count, last_verified_at')
      .in('id', ids);
    if (vData) {
      const vMap = new Map(vData.map((v) => [v.id as string, v]));
      pois = pois.map((p) => {
        const v = vMap.get(p.id);
        return v
          ? {
              ...p,
              verification_count: v.verification_count ?? 0,
              last_verified_at: v.last_verified_at ?? null,
            }
          : p;
      });
    }
  }

  return NextResponse.json(
    { pois },
    { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } }
  );
}
