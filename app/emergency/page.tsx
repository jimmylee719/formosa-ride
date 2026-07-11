'use client';
// /emergency — SOS 緊急資訊頁（Phase 12，v1.0 §十 + v11.0 A9）
// 純資訊頁，離線也要能顯示靜態內容；撥號用 tel: 交給系統電話 App。
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/ui/Header';
import { BottomNavBar } from '@/components/mobile/BottomNavBar';
import { useMapStore } from '@/store/map-store';
import { nearestCounty } from '@/lib/taiwan-counties';

type GeoState =
  | { status: 'loading' }
  | { status: 'denied' }
  | { status: 'ok'; lat: number; lng: number; county: string };

export default function EmergencyPage() {
  const router = useRouter();
  const setActiveTypes = useMapStore((s) => s.setActiveTypes);
  const [geo, setGeo] = useState<GeoState>({ status: 'loading' });
  const [copied, setCopied] = useState(false);

  // 進頁面就定位：緊急情境下不該再多按一次按鈕
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setGeo({ status: 'denied' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setGeo({ status: 'ok', lat, lng, county: nearestCounty(lat, lng).name });
      },
      () => setGeo({ status: 'denied' }),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 }
    );
  }, []);

  const handleCopyLocation = async () => {
    if (geo.status !== 'ok') return;
    const text = `我的位置 My location: ${geo.county} ${geo.lat.toFixed(5)}, ${geo.lng.toFixed(5)}\nhttps://maps.google.com/?q=${geo.lat.toFixed(5)},${geo.lng.toFixed(5)}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      window.prompt('請手動複製 Copy manually:', text);
    }
  };

  const handleFindHospital = () => {
    setActiveTypes(['hospital']);
    router.push('/');
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header />
      <main className="flex-1 overflow-y-auto bg-neutral-bg p-4">
        <h1 className="alert-warning text-neutral-text">
          🆘 Emergency &amp; Safety 緊急安全資訊
        </h1>

        {/* 區塊 1：緊急撥號（大按鈕，警示文字 ≥22px） */}
        <div className="mt-3 flex flex-col gap-3">
          <a
            href="tel:119"
            className="tap-target flex items-center justify-center gap-2 rounded-2xl bg-danger-border py-5 text-white shadow-lg"
          >
            <span className="text-3xl" aria-hidden>
              🚑
            </span>
            <span className="alert-warning">Call 119 Ambulance 救護車</span>
          </a>
          <a
            href="tel:110"
            className="tap-target flex items-center justify-center gap-2 rounded-2xl bg-info-border py-5 text-white shadow-lg"
          >
            <span className="text-3xl" aria-hidden>
              🚔
            </span>
            <span className="alert-warning">Call 110 Police 報警</span>
          </a>
        </div>

        {/* 區塊 2：24 小時旅遊諮詢熱線 */}
        <section className="mt-4 rounded-2xl bg-white p-4">
          <h2 className="info-primary font-bold">🌏 24-Hour Tourist Hotline 旅遊諮詢熱線</h2>
          <p className="info-secondary mt-1 text-neutral-text">
            Toll-free · 24hr · CN/EN/JP service
            <br />
            免付費 · 24 小時 · 中/英/日語服務
          </p>
          <a
            href="tel:0800011765"
            className="tap-target mt-2 flex items-center justify-center rounded-xl border-2 border-safe-border bg-safe-bg py-3"
          >
            <span className="alert-warning text-safe-text">📞 0800-011-765</span>
          </a>
        </section>

        {/* 目前位置（v11.0 A9）：報案/求援時直接唸出或傳送 */}
        <section className="mt-3 rounded-2xl bg-white p-4">
          <h2 className="info-primary font-bold">📍 Your Location 目前位置</h2>
          {geo.status === 'loading' && (
            <p className="info-secondary mt-1 text-neutral-text">
              ⏳ 定位中… Locating…
            </p>
          )}
          {geo.status === 'denied' && (
            <p className="info-secondary mt-1 text-neutral-text">
              無法取得定位，請開啟定位權限
              <br />
              Location unavailable — please enable GPS permission
            </p>
          )}
          {geo.status === 'ok' && (
            <>
              <p className="info-primary mt-1 font-bold">
                {geo.county}（近似 approx.）
              </p>
              <p className="info-secondary text-neutral-text">
                {geo.lat.toFixed(5)}, {geo.lng.toFixed(5)}
              </p>
              <button
                type="button"
                onClick={handleCopyLocation}
                className="tap-target mt-2 w-full rounded-xl border border-neutral-border py-3 font-bold"
              >
                {copied ? '✅ 已複製 Copied!' : '📋 複製座標 Copy coordinates'}
              </button>
            </>
          )}
        </section>

        {/* 區塊 5：就近醫院（帶篩選回地圖） */}
        <button
          type="button"
          onClick={handleFindHospital}
          className="tap-target mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-bold text-white shadow"
        >
          🏥 Find Nearby Hospitals 查詢附近醫院
        </button>

        {/* 溝通小卡（2026-07-11 自地圖頁移入）：語言不通時拿卡片給對方看 */}
        <Link
          href="/phrasebook"
          className="tap-target mt-3 flex w-full flex-col items-center rounded-2xl border-2 border-info-border bg-info-bg py-4 shadow"
        >
          <span className="info-primary font-bold text-info-text">
            💬 Phrasebook 溝通小卡
          </span>
          <span className="info-secondary text-info-text">
            Can&apos;t speak Chinese? Show locals a card · 語言不通時拿卡片給對方看
          </span>
        </Link>

        {/* 區塊 3：腳踏車事故處理步驟 */}
        <section className="mt-3 rounded-2xl bg-white p-4">
          <h2 className="info-primary font-bold">
            🚴 Accident Steps · 事故處理步驟
          </h2>
          <ol className="info-secondary mt-2 list-decimal space-y-2 pl-5 text-neutral-text">
            <li>
              確保自身安全，移離危險路段
              <br />
              Move to safety, away from traffic
            </li>
            <li>
              若有受傷立即撥打 119
              <br />
              If injured, call 119 immediately
            </li>
            <li>
              若涉及車輛碰撞立即撥打 110 報案
              <br />
              If a vehicle is involved, call 110 to report
            </li>
            <li>
              拍照紀錄現場（事後保險用）
              <br />
              Photograph the scene (for insurance)
            </li>
            <li>
              聯繫旅行保險公司（若有投保）
              <br />
              Contact your travel insurance (if insured)
            </li>
          </ol>
        </section>

        {/* 區塊 4：常用急救資訊 — 熱衰竭/中暑（v11.0 A9 詳版取代 v1.0 一行版） */}
        <section className="mt-3 rounded-2xl bg-caution-bg p-4">
          <h2 className="info-primary font-bold text-caution-text">
            ⚕️ Heatstroke First Aid · 熱衰竭/中暑急救
          </h2>
          <ol className="info-secondary mt-2 list-decimal space-y-2 pl-5 text-caution-text">
            <li>移到陰涼通風處 Move to cool shade</li>
            <li>慢慢喝水 Drink water slowly</li>
            <li>用水濕敷頸部、腋下 Apply cool water to neck, armpits</li>
            <li>
              <strong>
                若 15 分鐘無改善，立即撥 119
                <br />
                If no improvement in 15 min, call 119
              </strong>
            </li>
          </ol>
        </section>

        <section className="mt-3 rounded-2xl bg-white p-4">
          <h2 className="info-primary font-bold">🔧 Other Situations · 其他常見狀況</h2>
          <ul className="info-secondary mt-2 space-y-2 text-neutral-text">
            <li>
              <strong>爆胎 Flat tire：</strong>
              移至路旁，用地圖篩選「維修站」找最近的自行車行
              <br />
              Move roadside; filter “bike shop” on the map
            </li>
            <li>
              <strong>迷路 Lost：</strong>
              開啟 GPS 定位確認位置，聯繫旅館或在地朋友
              <br />
              Check GPS position; contact your hotel or a local friend
            </li>
          </ul>
        </section>

        {/* 政府資源（v5.0 D2：緊急頁也放，旅客有需要時容易找到） */}
        <a
          href="/resources"
          className="tap-target mt-3 flex w-full items-center justify-center rounded-xl border border-neutral-border bg-white py-3 font-bold"
        >
          🏛️ Official Gov Resources 政府觀光資源
        </a>

        <p className="info-secondary mt-4 pb-4 text-center text-neutral-text">
          本頁資訊定期更新。若需進一步協助：
          <br />
          <a href="mailto:skadoosh.ai.lab@gmail.com" className="underline">
            skadoosh.ai.lab@gmail.com
          </a>
        </p>
      </main>
      <BottomNavBar />
    </div>
  );
}
