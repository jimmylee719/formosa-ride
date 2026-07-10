// GET /api/cron/backup — 每週自動資料庫備份（Phase 18B）
// 由 Vercel Cron 觸發（vercel.json：每週日 18:00 UTC ＝ 台北週一 02:00），
// 驗證 CRON_SECRET 後將全部資料表 JSON 上傳到私有 Storage bucket「db-backups」。
import { NextRequest, NextResponse } from 'next/server';
import { runCloudBackup } from '@/lib/db-backup';

export const maxDuration = 60; // 4 萬筆 POI 分頁抓取需要較長時間
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Vercel Cron 會帶 Authorization: Bearer <CRON_SECRET>
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runCloudBackup();
    console.log(
      `[cron/backup] 完成：${result.tables} 表 ${result.rows} 筆 → ${result.stamp}（清理 ${result.pruned} 份舊備份）`
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('[cron/backup] 失敗：', (err as Error).message);
    return NextResponse.json({ error: 'Backup failed' }, { status: 500 });
  }
}
