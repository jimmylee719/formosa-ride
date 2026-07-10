'use client';
// /route/[id]/print-card — 行前備用卡（Phase 16B，v7.0 D 節）
// 最壞情況的最後防線：手機沒電/沒訊號時的紙本備援。
// 純前端 + 瀏覽器原生列印（Ctrl/Cmd+P 或按鈕），零 PDF 套件、零後端成本。
// 住宿與緊急聯絡人為可編輯欄位：列印前輸入，或印出後手寫。
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { POI_ICONS } from '@/lib/poi-icons';
import type { POIType } from '@/types/poi';

interface RouteInfo {
  id: string;
  name_zh: string;
  name_en: string;
  distance_km: number;
  suggested_days: number | null;
}

interface AlongPoi {
  id: string;
  name_zh: string;
  type: POIType;
  phone?: string | null;
}

export default function PrintCardPage() {
  const { id } = useParams<{ id: string }>();
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [pois, setPois] = useState<AlongPoi[]>([]);
  const [tooLong, setTooLong] = useState(false);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r1 = await fetch(`/api/routes/${id}`);
        if (!r1.ok) throw new Error(String(r1.status));
        const { route: rt } = (await r1.json()) as { route: RouteInfo };
        if (!alive) return;
        setRoute(rt);
        // 沿線重要地點：便利商店/醫院/維修店，取最近 5 個（v7.0 D2）
        const r2 = await fetch(
          `/api/routes/${id}/pois?types=convenience_store,hospital,bicycle_repair`
        );
        if (r2.ok && alive) {
          const d = (await r2.json()) as { pois: AlongPoi[]; too_long?: boolean };
          setPois((d.pois ?? []).slice(0, 5));
          setTooLong(Boolean(d.too_long));
        }
        setState('ok');
      } catch {
        if (alive) setState('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  if (state === 'loading') {
    return (
      <p className="info-secondary p-8 text-center">⏳ Loading… 載入中…</p>
    );
  }
  if (state === 'error' || !route) {
    return (
      <p className="info-secondary p-8 text-center">
        Route not found · 找不到路線
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      {/* 操作列（不列印） */}
      <div className="no-print mb-4 flex items-center justify-between gap-2">
        <Link href={`/route/${route.id}`} className="info-secondary underline">
          ← Back 返回
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="tap-target rounded-xl bg-primary px-5 py-3 font-bold text-white"
        >
          🖨️ Print / Save as PDF 列印
        </button>
      </div>
      <p className="no-print info-secondary mb-4 text-neutral-text">
        Fill in the blanks below before printing, or write by hand afterwards.
        列印前可先填寫空欄，或印出後手寫。
      </p>

      {/* A4 備用卡本體（v7.0 D2 版面） */}
      <div className="print-card rounded-xl border-2 border-neutral-border bg-white p-6">
        <h1 className="border-b-2 border-neutral-border pb-2 text-xl font-bold">
          FormoSA Ride 環島通 — Pre-Trip Backup Card 行前備用卡
        </h1>

        <p className="mt-3">
          <strong>Route 路線：</strong>
          {route.name_en}
          {route.name_zh !== route.name_en && `（${route.name_zh}）`}
        </p>
        <p className="mt-1">
          <strong>Distance 總距離：</strong>
          {route.distance_km} km
          {route.suggested_days != null && (
            <>
              　<strong>Days 預計天數：</strong>
              {route.suggested_days}
            </>
          )}
        </p>

        <h2 className="mt-4 font-bold">🆘 Emergency Numbers 緊急電話</h2>
        <p className="mt-1">
          Ambulance 救護車 <strong>119</strong>　Police 警察{' '}
          <strong>110</strong>
          <br />
          24hr Tourist Hotline 旅遊諮詢 <strong>0800-011-765</strong>
        </p>

        <h2 className="mt-4 font-bold">🏨 Lodging 住宿地點</h2>
        {[1, 2, 3].map((day) => (
          <p key={day} className="mt-1 flex items-baseline gap-2">
            <span className="shrink-0">Day{day}:</span>
            <input
              type="text"
              placeholder="名稱 name／電話 tel／地址 address"
              className="w-full border-b border-neutral-border bg-transparent outline-none"
            />
          </p>
        ))}

        <h2 className="mt-4 font-bold">🚴 Emergency Contact 緊急聯絡人</h2>
        <p className="mt-1 flex items-baseline gap-2">
          <input
            type="text"
            placeholder="姓名 name／電話 tel"
            className="w-full border-b border-neutral-border bg-transparent outline-none"
          />
        </p>

        <h2 className="mt-4 font-bold">
          📍 Key Places Along the Route 沿線重要地點
        </h2>
        {tooLong ? (
          <p className="mt-1 text-sm">
            Long route — check the app map for places along the way.
            長程路線，請以 App 地圖沿途查看（本卡僅列緊急資訊）。
          </p>
        ) : pois.length === 0 ? (
          <p className="mt-1 text-sm">— No data 暫無資料 —</p>
        ) : (
          <ul className="mt-1">
            {pois.map((p) => (
              <li key={p.id} className="mt-0.5">
                {POI_ICONS[p.type]} {p.name_zh}
                {p.phone ? `　☎ ${p.phone}` : ''}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 border-t border-neutral-border pt-2 text-sm">
          If you cannot speak Chinese, show this card to locals and point at
          what you need. 如果無法用中文溝通，請將本卡出示給在地人並指出所需項目。
        </p>
      </div>
    </div>
  );
}
