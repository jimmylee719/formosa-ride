'use client';
// components/map/NightModeController.tsx — 夜間模式觸發器（Phase 7B，v3.0 C1）
// 判斷基準：civil twilight 結束（dusk）之後，非日落（v3.0 C1 明確要求）。
// 測試覆寫：/?night=1 強制夜間、/?night=0 強制日間（QA 與驗收用）。
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSolar } from '@/lib/solar';
import { useMapStore } from '@/store/map-store';

export function NightModeController() {
  const center = useMapStore((s) => s.center);
  const setNightMode = useMapStore((s) => s.setNightMode);
  const solar = useSolar(center[1], center[0]);
  const override = useSearchParams().get('night');

  useEffect(() => {
    if (override === '1') setNightMode(true);
    else if (override === '0') setNightMode(false);
    else if (solar) setNightMode(solar.isNight);
  }, [override, solar, setNightMode]);

  return null;
}
