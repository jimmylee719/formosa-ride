'use client';
// lib/device-id.ts — 裝置識別（Phase 11，v2.0 裝置本位設計）
// 行程記錄不需帳號（會員系列 Phase 延後）；日後加入會員時以此 id 做「行程認領」。

const KEY = 'formosa_device_id';

export function getDeviceId(): string {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}
