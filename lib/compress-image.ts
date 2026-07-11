'use client';
// lib/compress-image.ts — 照片前端壓縮（Phase 照片牆，2026-07-11）
// 手機原圖動輒 4–12MB：長邊縮至 1600px、JPEG 0.8 → 通常 150–500KB，
// 省流量（山區訊號弱）也省 Storage 免費額度。

const MAX_DIM = 1600;
const QUALITY = 0.8;

export async function compressImage(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', QUALITY)
    );
    // 壓縮失敗或反而變大 → 用原檔
    return blob && blob.size < file.size ? blob : file;
  } catch {
    // HEIC 等瀏覽器不支援解碼的格式 → 交給伺服器端驗證擋下或原樣上傳
    return file;
  }
}
