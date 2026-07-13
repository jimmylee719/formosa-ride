// POST /api/trips/complete — 結束整趟旅程（Phase 11C，v8.0 A5）
// 行程標記 completed，所有分享連結設定 24 小時後自動失效（v7.0 A2，補 11A 尾巴）。
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { evaluateTripAchievements } from '@/lib/achievements-eval';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  let body: { deviceId?: string; tripId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { deviceId, tripId } = body;
  if (!deviceId || !UUID_RE.test(deviceId) || !tripId || !UUID_RE.test(tripId)) {
    return NextResponse.json({ error: 'Invalid ids' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: trip } = await supabase
    .from('trips')
    .select('id, device_id, status, total_distance_km')
    .eq('id', tripId)
    .maybeSingle();
  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  if (trip.device_id !== deviceId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const now = new Date();
  await supabase
    .from('trips')
    .update({ status: 'completed', ended_at: now.toISOString() })
    .eq('id', tripId);

  // 分享連結：行程結束後 24 小時自動失效（v7.0 A2）
  const expires = new Date(now.getTime() + 24 * 3600_000).toISOString();
  await supabase
    .from('trip_share_links')
    .update({ expires_at: expires })
    .eq('trip_id', tripId)
    .is('expires_at', null);

  // 環島認證（2026-07-13）：判定地標徽章與環島完賽證書並寫入。
  // 包在 try/catch——認證失敗絕不可影響「行程已完成」本身。
  let achievements: {
    newlyEarned: string[];
    landmarks: string[];
    certificate: boolean;
  } | null = null;
  try {
    const evalResult = await evaluateTripAchievements(
      supabase,
      tripId,
      Number(trip.total_distance_km ?? 0)
    );

    // 既有徽章（同裝置）→ 判斷哪些是本趟「新獲得」，供前端慶祝
    const { data: existing } = await supabase
      .from('achievements')
      .select('type, key')
      .eq('device_id', deviceId)
      .in('type', ['landmark', 'certificate']);
    const had = new Set(
      (existing ?? []).map((r) => `${r.type}:${r.key}`)
    );

    const rows: Array<Record<string, unknown>> = evalResult.landmarks.map((l) => ({
      device_id: deviceId,
      type: 'landmark',
      key: l.id,
      trip_id: tripId,
      proof_lat: l.proof.lat,
      proof_lng: l.proof.lng,
      proof_at: l.proof.recorded_at ?? null,
    }));
    if (evalResult.roundIsland.passed) {
      rows.push({
        device_id: deviceId,
        type: 'certificate',
        key: 'huandao',
        trip_id: tripId,
        distance_km: evalResult.roundIsland.distance_km,
        proof_at: now.toISOString(),
        meta: {
          landmarks: evalResult.landmarks.map((l) => l.id),
          loop_close_km: evalResult.roundIsland.loop_close_km,
          lat_span_km: Math.round(evalResult.roundIsland.lat_span_km),
        },
      });
    }

    if (rows.length > 0) {
      // 首次獲得即固定（ignoreDuplicates）——重跑不覆蓋 earned_at 與原始佐證
      await supabase
        .from('achievements')
        .upsert(rows, { onConflict: 'device_id,type,key', ignoreDuplicates: true });
    }

    const awardedKeys = rows.map((r) => `${r.type as string}:${r.key as string}`);
    achievements = {
      newlyEarned: awardedKeys.filter((k) => !had.has(k)),
      landmarks: evalResult.landmarks.map((l) => l.id),
      certificate: evalResult.roundIsland.passed,
    };
  } catch (err) {
    console.error('[complete] achievement eval failed:', (err as Error).message);
  }

  return NextResponse.json({
    completed: true,
    shareLinksExpireAt: expires,
    achievements,
  });
}
