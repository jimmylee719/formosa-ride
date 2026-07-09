'use client';
// lib/trip-share-image.ts — 旅程分享圖片卡（Phase 11C，v8.0 A4）
// 重用 html2canvas，輸出 1080×1920（IG Story 規格），觸發瀏覽器下載。
import html2canvas from 'html2canvas';

export async function generateTripShareImage(elementId: string): Promise<string> {
  const element = document.getElementById(elementId);
  if (!element) throw new Error('找不到要分享的內容');

  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: 2,
    useCORS: true,
    logging: false,
  });
  return canvas.toDataURL('image/png');
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
