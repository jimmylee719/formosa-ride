/**
 * scripts/backup-db.ts — 資料庫 JSON 備份（本機手動版，Phase 18A/18B）
 * 執行：npx tsx scripts/backup-db.ts [--cloud]
 *   預設：存到本機 backups/<時間戳>/（已 gitignore）
 *   --cloud：直接上傳 Supabase 私有 bucket「db-backups」（與每週 Vercel Cron 同路徑）
 * 核心邏輯共用 lib/db-backup.ts。
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });

async function main(): Promise<void> {
  const { listBackupTables, dumpTableRows, runCloudBackup } = await import('../lib/db-backup');

  if (process.argv.includes('--cloud')) {
    const r = await runCloudBackup();
    console.log(`✅ 雲端備份完成：${r.tables} 表 ${r.rows} 筆 → db-backups/${r.stamp}（清理 ${r.pruned} 份舊備份）`);
    return;
  }

  const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
  const dir = join('backups', stamp);
  mkdirSync(dir, { recursive: true });
  const tables = await listBackupTables();
  console.log(`備份 ${tables.length} 個資料表至 ${dir}/`);
  let total = 0;
  for (const t of tables) {
    const rows = await dumpTableRows(t);
    writeFileSync(join(dir, `${t}.json`), JSON.stringify(rows));
    total += rows.length;
    console.log(`  ${t}: ${rows.length} 筆`);
  }
  console.log(`\n✅ 備份完成：共 ${total} 筆資料`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
