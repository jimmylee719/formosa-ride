/**
 * scripts/backup-db.ts — 資料庫 JSON 備份（Phase 18A）
 * 執行：npx tsx scripts/backup-db.ts
 * 產出：backups/<日期時間>/<資料表>.json（backups/ 已 gitignore，絕不進公開 repo）
 *
 * 設計說明：
 *   - 資料表清單取自 PostgREST OpenAPI 根端點（自動涵蓋未來新表，不用手動維護）
 *   - 這是「資料」備份（災難復原用），結構由 supabase/migrations 重建；
 *     幾何欄位以 GeoJSON 形式保存
 *   - 完整 pg_dump（含結構/索引/RLS）建議上線後另以 Supabase 後台或
 *     安裝 PostgreSQL client tools 執行；本腳本零額外安裝、隨時可跑
 *   - ⚠️ 公開 repo：備份絕不可放 GitHub Actions artifact（任何人可下載）
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const PAGE = 1000;

async function listTables(): Promise<string[]> {
  const res = await fetch(`${URL}/rest/v1/`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  if (!res.ok) throw new Error(`OpenAPI 端點失敗 HTTP ${res.status}`);
  const spec = (await res.json()) as { paths?: Record<string, unknown> };
  return Object.keys(spec.paths ?? {})
    .filter((p) => p !== '/' && !p.includes('rpc'))
    .map((p) => p.slice(1));
}

async function dumpTable(table: string, dir: string): Promise<number> {
  const rows: unknown[] = [];
  for (let from = 0; ; from += PAGE) {
    const res = await fetch(`${URL}/rest/v1/${table}?select=*`, {
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        Range: `${from}-${from + PAGE - 1}`,
      },
    });
    if (!res.ok) throw new Error(`${table} HTTP ${res.status}`);
    const batch = (await res.json()) as unknown[];
    rows.push(...batch);
    if (batch.length < PAGE) break;
  }
  writeFileSync(join(dir, `${table}.json`), JSON.stringify(rows));
  return rows.length;
}

async function main(): Promise<void> {
  if (!URL || !KEY) throw new Error('.env.local 缺 Supabase 設定');
  const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
  const dir = join('backups', stamp);
  mkdirSync(dir, { recursive: true });

  const tables = await listTables();
  console.log(`發現 ${tables.length} 個資料表/檢視，備份至 ${dir}/`);
  let total = 0;
  for (const t of tables) {
    try {
      const n = await dumpTable(t, dir);
      total += n;
      console.log(`  ${t}: ${n} 筆`);
    } catch (e) {
      console.warn(`  ⚠️ ${t} 失敗：${(e as Error).message}`);
    }
  }
  console.log(`\n✅ 備份完成：共 ${total} 筆資料`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
