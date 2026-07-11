// GET /api/solar?lat=..&lng=..[&date=YYYY-MM-DD] — 日出日落（Phase 7，v3.0 B1）
// date 參數（Phase 19C）：旅程規劃的日落安全檢查需查未來日期，最多一年內。
// 來源：SunriseSunset.io（免 Key，原生支援 date）。快取 6 小時（solar_cache）。
// ⚠️ 實測欄位（2026-07-09）：civil twilight 結束 = `dusk`（規格原稿寫 civil_twilight_end，實際不存在）
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

export interface SolarData {
  date: string;
  sunrise: string; // '5:07:25 AM'
  sunset: string;
  dawn: string; // civil twilight 開始（天亮前）
  dusk: string; // civil twilight 結束（天完全黑）★夜間判斷用
  first_light: string;
  last_light: string;
  day_length: string;
  timezone: string;
  lat: number;
  lng: number;
}

const CACHE_HOURS = 6;

export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get('lat'));
  const lng = Number(req.nextUrl.searchParams.get('lng'));
  if (!Number.isFinite(lat) || lat < 20.5 || lat > 26.5) {
    return NextResponse.json({ error: 'Invalid lat' }, { status: 400 });
  }
  if (!Number.isFinite(lng) || lng < 117 || lng > 124.5) {
    return NextResponse.json({ error: 'Invalid lng' }, { status: 400 });
  }

  // 台北時區的今天日期 + 座標取 1 位小數作為快取鍵（約 11km 網格，日照差異可忽略）
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
  }).format(new Date());
  // 指定日期（規劃用）：限一年內，避免快取被灌爆
  const dateParam = req.nextUrl.searchParams.get('date');
  let queryDate = today;
  if (dateParam) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    }
    const diffDays = (new Date(dateParam).getTime() - new Date(today).getTime()) / 86400_000;
    if (diffDays < -1 || diffDays > 366) {
      return NextResponse.json({ error: 'Date out of range' }, { status: 400 });
    }
    queryDate = dateParam;
  }
  const cacheKey = `solar_${lat.toFixed(1)}_${lng.toFixed(1)}_${queryDate}`;

  const supabase = createServiceClient();
  const { data: cached } = await supabase
    .from('solar_cache')
    .select('solar_data, fetched_at')
    .eq('cache_key', cacheKey)
    .maybeSingle();

  if (
    cached?.solar_data &&
    Date.now() - new Date(cached.fetched_at).getTime() < CACHE_HOURS * 3600_000
  ) {
    return NextResponse.json(cached.solar_data, {
      headers: { 'Cache-Control': 'public, max-age=1800' },
    });
  }

  try {
    const res = await fetch(
      `https://api.sunrisesunset.io/json?lat=${lat}&lng=${lng}&timezone=Asia/Taipei&date=${queryDate}`,
      { signal: AbortSignal.timeout(15_000) }
    );
    if (!res.ok) throw new Error(`sunrisesunset ${res.status}`);
    const json = (await res.json()) as {
      status: string;
      results: Record<string, string>;
    };
    if (json.status !== 'OK') throw new Error('sunrisesunset status!=OK');
    const r = json.results;
    const solar: SolarData = {
      date: r.date ?? queryDate,
      sunrise: r.sunrise ?? '',
      sunset: r.sunset ?? '',
      dawn: r.dawn ?? '',
      dusk: r.dusk ?? '',
      first_light: r.first_light ?? '',
      last_light: r.last_light ?? '',
      day_length: r.day_length ?? '',
      timezone: r.timezone ?? 'Asia/Taipei',
      lat,
      lng,
    };
    await supabase.from('solar_cache').upsert(
      { cache_key: cacheKey, solar_data: solar, fetched_at: new Date().toISOString() },
      { onConflict: 'cache_key' }
    );
    return NextResponse.json(solar, {
      headers: { 'Cache-Control': 'public, max-age=1800' },
    });
  } catch (err) {
    console.error('[api/solar] failed:', (err as Error).message);
    if (cached?.solar_data) return NextResponse.json(cached.solar_data);
    return NextResponse.json({ error: 'Solar unavailable' }, { status: 502 });
  }
}
