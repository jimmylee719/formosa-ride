'use client';
// /plan/[id]/print — 行程列印/存 PDF（Phase 19B）
// 同行前備用卡做法：瀏覽器原生列印（另存 PDF），零 PDF 套件、離線可印。
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getDeviceId } from '@/lib/device-id';
import { PlanReadonlyView } from '@/components/plan/PlanReadonlyView';
import type { TripPlanDetail } from '@/types/plan';

export default function PlanPrintPage() {
  const { id } = useParams<{ id: string }>();
  const [plan, setPlan] = useState<TripPlanDetail | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const res = await fetch(`/api/plans/${id}?device_id=${getDeviceId()}`);
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as TripPlanDetail;
        if (!alive) return;
        setPlan(data);
        setState('ok');
      } catch {
        if (alive) setState('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <div className="print-card min-h-dvh bg-white p-4">
      <div className="no-print mb-3 flex items-center gap-3">
        <Link href={`/plan/${id}`} className="info-secondary text-neutral-text underline">
          ← Back 返回編輯
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="tap-target flex-1 rounded-xl bg-primary py-3 font-bold text-white"
        >
          🖨️ Print / Save as PDF 列印或存成 PDF
        </button>
      </div>

      {state === 'loading' && <p className="info-secondary">⏳ Loading… 載入中…</p>}
      {state === 'error' && (
        <p className="info-secondary text-neutral-text">
          Plan not found 找不到行程（列印頁僅限行程建立者本人的裝置開啟）
        </p>
      )}
      {state === 'ok' && plan && (
        <>
          <PlanReadonlyView plan={plan} />
          {/* 紙本頁腳：緊急資訊（手機沒電時紙本仍有用） */}
          <div className="mt-4 rounded-2xl border border-neutral-border p-3">
            <p className="info-secondary font-bold">
              🆘 Emergency 緊急：119 Ambulance 救護車 · 110 Police 警察 ·
              0800-011-765 Tourist Hotline 旅遊熱線（24hr EN/JP/CN）
            </p>
            <p className="info-secondary text-neutral-text">
              FormoSA Ride 環島通 · {process.env.NEXT_PUBLIC_SITE_URL || 'formosa-ride.vercel.app'}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
