// /api/achievements — 環島認證（2026-07-13）
// GET ?device_id=  → 該裝置已獲得的成就（地標徽章、環島完賽證書、縣市徽章）
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get('device_id') ?? '';
  if (!UUID_RE.test(deviceId)) {
    return NextResponse.json({ error: 'Invalid device id' }, { status: 400 });
  }
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('achievements')
    .select('type, key, distance_km, meta, earned_at')
    .eq('device_id', deviceId)
    .order('earned_at', { ascending: true });
  if (error) {
    console.error('[api/achievements] list error:', error.message);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  const rows = data ?? [];
  const landmarkKeys = rows.filter((r) => r.type === 'landmark').map((r) => r.key);
  const countyKeys = rows.filter((r) => r.type === 'county').map((r) => r.key);
  const cert = rows.find((r) => r.type === 'certificate') ?? null;

  return NextResponse.json({
    landmarks: landmarkKeys,
    counties: countyKeys,
    certificate: cert
      ? {
          distance_km: cert.distance_km,
          meta: cert.meta,
          earned_at: cert.earned_at,
        }
      : null,
  });
}
