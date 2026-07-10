// app/sw.ts — Service Worker（Phase 17，v7.0 G2）
// Serwist（@serwist/next）；next-pwa 已停止維護，禁止使用（CLAUDE.md 鐵則）。
import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { CacheFirst, ExpirationPlugin, NetworkFirst, Serwist } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST ?? [], // exactOptionalPropertyTypes：不可為 undefined
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  // Serwist 9 API：handler 為策略實例（規格 v7.0 G2 範例為舊版字串寫法，語意相同）
  runtimeCaching: [
    {
      // 地圖底圖圖磚：快取優先（山區重複瀏覽同區域時省流量）
      matcher: /^https:\/\/api\.maptiler\.com/,
      handler: new CacheFirst({
        cacheName: 'maptiler-cache',
        plugins: [new ExpirationPlugin({ maxEntries: 400, maxAgeSeconds: 86400 })],
      }),
    },
    {
      // POI 查詢：網路優先，離線時回退快取
      matcher: /\/api\/pois/,
      handler: new NetworkFirst({
        cacheName: 'pois-cache',
        plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 3600 })],
      }),
    },
    {
      // 溝通小卡 + 使用說明：強制快取優先，離線必可開
      // （v7.0 B4：最需要小卡的時刻正是訊號最差的山區；v10.0 A4 同樣建議 guide）
      matcher: /\/(phrasebook|guide)$/,
      handler: new CacheFirst({ cacheName: 'phrasebook-cache' }),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
