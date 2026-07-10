// /route/[id] — 路線詳情頁（Phase 5）
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Header } from '@/components/ui/Header';
import { BottomNavBar } from '@/components/mobile/BottomNavBar';
import { RouteDetailMap } from '@/components/route/RouteDetailMap';
import { ElevationProfile } from '@/components/route/ElevationProfile';
import { OfflineDownloadButton } from '@/components/route/OfflineDownloadButton';
import { getRoute } from '@/lib/route-queries';
import { createAnonServerClient } from '@/lib/supabase-server';
import { DIFFICULTY_LABELS, ROUTE_TYPE_LABELS } from '@/types/route';
import { POI_ICONS, POI_LABELS } from '@/lib/poi-icons';
import type { POIType } from '@/types/poi';

export const revalidate = 300;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface AlongPoi {
  id: string;
  name_zh: string;
  type: POIType;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (!UUID_RE.test(id)) return { title: '路線 Route' };
  const route = await getRoute(id);
  if (!route) return { title: '路線 Route' };
  return {
    title: `${route.name_en} ${route.distance_km}km`,
    description: `${route.name_en} (${route.name_zh}): ${route.distance_km} km cycling route in Taiwan — supplies, lodging and repair shops along the way. ${route.distance_km} 公里自行車路線，沿途補給、住宿、維修店一覽。`,
    alternates: { canonical: `/route/${id}` },
    openGraph: {
      title: `${route.name_en} — Taiwan Cycling Route`,
      description: `${route.distance_km} km cycling route in Taiwan.`,
    },
  };
}

export default async function RouteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const route = await getRoute(id);
  if (!route) notFound();

  // 沿線 POI（3km 緩衝，v1.0 §7.4）
  // 超長路線（>150km，如環島1號線 939km）緩衝查詢會逾時且結果達數千筆無閱讀價值，
  // 改引導使用者在主地圖沿途查看（Phase 15A）
  const tooLongForAlongPois = Number(route.distance_km) > 150;
  let pois: AlongPoi[] = [];
  if (!tooLongForAlongPois) {
    const supabase = createAnonServerClient();
    const { data: alongPois } = await supabase.rpc('get_pois_along_route', {
      p_route_id: id,
      p_buffer_km: 3,
      p_types: null,
      p_free_tier_only: false,
    });
    pois = (alongPois ?? []) as AlongPoi[];
  }

  const typeLabel = ROUTE_TYPE_LABELS[route.type];
  const diff = DIFFICULTY_LABELS[route.difficulty];

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header />
      <main className="flex-1 overflow-y-auto bg-neutral-bg p-4">
        <Link href="/routes" className="info-secondary text-info-border underline">
          ← Back to routes 返回路線列表
        </Link>

        <h1 className="alert-warning mt-2 text-neutral-text">
          {typeLabel.icon} {route.name_en}
        </h1>
        {route.name_zh !== route.name_en && (
          <p className="info-secondary text-neutral-text">{route.name_zh}</p>
        )}

        <div className="mt-2 flex flex-wrap gap-2">
          <span className="rounded-full bg-info-bg px-3 py-0.5 text-sm text-info-text">
            {typeLabel.en} {typeLabel.zh}
          </span>
          <span className={`rounded-full px-3 py-0.5 text-sm font-bold ${diff.className}`}>
            {diff.en} {diff.zh}
          </span>
        </div>

        {/* 統計數字 */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white p-3 text-center">
            <p className="text-2xl font-bold text-primary">{route.distance_km}</p>
            <p className="info-secondary text-neutral-text">公里 km</p>
          </div>
          <div className="rounded-xl bg-white p-3 text-center">
            <p className="text-2xl font-bold text-primary">
              {route.suggested_days ?? '—'}
            </p>
            <p className="info-secondary text-neutral-text">days 建議天數</p>
          </div>
          <div className="rounded-xl bg-white p-3 text-center">
            <p className="text-2xl font-bold text-primary">
              {route.total_ascent_m ?? '…'}
            </p>
            <p className="info-secondary text-neutral-text">ascent 總爬升 m</p>
          </div>
          <div className="rounded-xl bg-white p-3 text-center">
            <p className="text-2xl font-bold text-primary">
              {route.max_elevation_m ?? '…'}
            </p>
            <p className="info-secondary text-neutral-text">max elev. 最高海拔 m</p>
          </div>
        </div>

        {/* 路線地圖 */}
        <div className="mt-3">
          <RouteDetailMap geometry={route.geometry} />
        </div>

        {/* 海拔剖面（Phase 6） */}
        <section className="mt-3 rounded-xl bg-white p-4">
          <h2 className="info-primary font-bold">⛰️ Elevation · 海拔剖面</h2>
          <div className="mt-2">
            <ElevationProfile routeId={route.id} />
          </div>
        </section>
        <Link
          href={`/?route=${route.id}`}
          className="tap-target mt-3 flex items-center justify-center rounded-xl bg-primary py-3 font-bold text-white"
        >
          🗺️ View on main map · 在主地圖檢視
        </Link>

        {/* 行前備用卡（Phase 16B）：紙本備援，手機沒電/沒訊號的最後防線 */}
        <Link
          href={`/route/${route.id}/print-card`}
          className="tap-target mt-2 flex items-center justify-center rounded-xl border border-neutral-border bg-white py-3 font-bold"
        >
          🖨️ Pre-trip backup card · 行前備用卡
        </Link>

        {/* 離線下載包（Phase 11B） */}
        <OfflineDownloadButton routeId={route.id} />

        {/* 介紹 */}
        {(route.description_en || route.description_zh) && (
          <section className="mt-4 rounded-xl bg-white p-4">
            <h2 className="info-primary font-bold">About 路線介紹</h2>
            {route.description_en && (
              <p className="info-secondary mt-1">{route.description_en}</p>
            )}
            {route.description_zh && (
              <p className="info-secondary mt-1 text-neutral-text">
                {route.description_zh}
              </p>
            )}
          </section>
        )}
        {route.tips_zh && (
          <section className="mt-3 rounded-xl bg-caution-bg p-4">
            <h2 className="info-primary font-bold text-caution-text">💡 Riding Tips 騎行建議</h2>
            <p className="info-secondary mt-1 text-caution-text">{route.tips_zh}</p>
          </section>
        )}

        {/* 沿線 POI */}
        <section className="mt-3 rounded-xl bg-white p-4">
          <h2 className="info-primary font-bold">
            📍 Along the route · 沿線地點（3km 內）
          </h2>
          {tooLongForAlongPois ? (
            <p className="info-secondary mt-1 text-neutral-text">
              Long route — open the main map to browse places along the way
              <br />
              長程路線，請點「在主地圖檢視」沿途查看地點
            </p>
          ) : pois.length === 0 ? (
            <p className="info-secondary mt-1 text-neutral-text">
              尚無沿線地點資料 · No POI data yet
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-neutral-border">
              {pois.slice(0, 12).map((p) => (
                <li key={p.id} className="flex items-center gap-2 py-2">
                  <span aria-hidden>{POI_ICONS[p.type]}</span>
                  <span className="info-secondary flex-1">{p.name_zh}</span>
                  <span className="text-sm text-neutral-text">
                    {POI_LABELS[p.type].zh}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {pois.length > 12 && (
            <p className="info-secondary mt-2 text-neutral-text">
              …等共 {pois.length} 個地點
            </p>
          )}
        </section>

        {/* 資料來源標示（v4.0 A5，政府資料開放授權要求） */}
        <section className="mt-3 rounded-xl border border-neutral-border bg-white p-4">
          <h2 className="info-secondary font-bold">📋 資料來源</h2>
          <p className="mt-1 text-sm text-neutral-text">
            {route.data_source === 'osm' && '路線幾何：OpenStreetMap 貢獻者（ODbL 授權）'}
            {route.data_source === 'taiwanbike' && '路線主體：交通部觀光署「臺灣騎跡」'}
            {route.data_source === 'moi_land' && '路段資料：內政部國土管理署開放資料'}
            {route.managing_authority && (
              <>
                <br />
                管養單位：{route.managing_authority}
              </>
            )}
            {route.source_last_updated && (
              <>
                <br />
                資料日期：{route.source_last_updated}
              </>
            )}
          </p>
        </section>
      </main>
      <BottomNavBar />
    </div>
  );
}
