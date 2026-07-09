// GET /api/weather?county=花蓮縣 — 縣市天氣（Phase 7）
// weather_cache 快取 2 小時（v1.0 §7.7）；快取表 RLS 為 service-only。
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { fetchWeatherBundle, type WeatherBundle } from '@/lib/weather';
import { COUNTY_NAMES } from '@/lib/taiwan-counties';

const CACHE_HOURS = 2;

export async function GET(req: NextRequest) {
  const county = req.nextUrl.searchParams.get('county') ?? '';
  if (!COUNTY_NAMES.has(county)) {
    return NextResponse.json({ error: 'Invalid county' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // 1. 快取（2 小時內視為有效）
  const { data: cached } = await supabase
    .from('weather_cache')
    .select('current_data, fetched_at')
    .eq('location_key', county)
    .maybeSingle();

  if (
    cached?.current_data &&
    Date.now() - new Date(cached.fetched_at).getTime() < CACHE_HOURS * 3600_000
  ) {
    return NextResponse.json(
      { ...(cached.current_data as WeatherBundle), cachedAt: cached.fetched_at },
      { headers: { 'Cache-Control': 'public, max-age=600' } }
    );
  }

  // 2. 重新抓取 CWA
  try {
    const bundle = await fetchWeatherBundle(county);
    await supabase.from('weather_cache').upsert(
      {
        location_key: county,
        current_data: bundle,
        forecast_data: bundle.weekly,
        wind_data: bundle.weekly.map((d) => ({
          date: d.date,
          dir: d.windDirection,
          speed: d.windSpeed,
        })),
        typhoon_alert: bundle.typhoonAlert,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: 'location_key' }
    );
    return NextResponse.json(bundle, {
      headers: { 'Cache-Control': 'public, max-age=600' },
    });
  } catch (err) {
    console.error('[api/weather] fetch failed:', (err as Error).message);
    // CWA 失敗時退回過期快取（誠實標注時間），完全沒有才回 502
    if (cached?.current_data) {
      return NextResponse.json({
        ...(cached.current_data as WeatherBundle),
        cachedAt: cached.fetched_at,
        stale: true,
      });
    }
    return NextResponse.json({ error: 'Weather unavailable' }, { status: 502 });
  }
}
