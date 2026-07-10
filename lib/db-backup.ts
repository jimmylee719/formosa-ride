// lib/db-backup.ts — 資料庫 JSON 備份核心（Phase 18B）
// 供 scripts/backup-db.ts（本機手動）與 /api/cron/backup（Vercel Cron 每週自動）共用。
// 備份目的地：Supabase 私有 Storage bucket「db-backups」或本機資料夾。
// ⚠️ 公開 repo：備份絕不可放 GitHub Actions artifact（任何人可下載）。

const PAGE = 1000;

/** 不備份的系統表／檢視（檢視由來源表重建、PostGIS 系統表隨擴充套件而生） */
const EXCLUDED = new Set([
  'spatial_ref_sys',
  'geometry_columns',
  'geography_columns',
  'suspicious_multi_accounts',
  'admin_pending_alerts',
]);

function env(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !key) throw new Error('缺 Supabase 環境設定');
  return { url, key };
}

export async function listBackupTables(): Promise<string[]> {
  const { url, key } = env();
  const res = await fetch(`${url}/rest/v1/`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`OpenAPI 端點失敗 HTTP ${res.status}`);
  const spec = (await res.json()) as { paths?: Record<string, unknown> };
  return Object.keys(spec.paths ?? {})
    .filter((p) => p !== '/' && !p.includes('rpc'))
    .map((p) => p.slice(1))
    .filter((t) => !EXCLUDED.has(t));
}

export async function dumpTableRows(table: string): Promise<unknown[]> {
  const { url, key } = env();
  const rows: unknown[] = [];
  for (let from = 0; ; from += PAGE) {
    const res = await fetch(`${url}/rest/v1/${table}?select=*`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Range: `${from}-${from + PAGE - 1}`,
      },
    });
    if (!res.ok) throw new Error(`${table} HTTP ${res.status}`);
    const batch = (await res.json()) as unknown[];
    rows.push(...batch);
    if (batch.length < PAGE) break;
  }
  return rows;
}

const BUCKET = 'db-backups';

async function uploadToStorage(path: string, json: string): Promise<void> {
  const { url, key } = env();
  const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'x-upsert': 'true',
    },
    body: json,
  });
  if (!res.ok) throw new Error(`上傳 ${path} 失敗 HTTP ${res.status}`);
}

/** 執行雲端備份：每表一個 JSON 上傳到 db-backups/<時間戳>/，並清理 8 週前的舊備份 */
export async function runCloudBackup(): Promise<{
  stamp: string;
  tables: number;
  rows: number;
  pruned: number;
}> {
  const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
  const tables = await listBackupTables();
  let totalRows = 0;
  for (const t of tables) {
    const rows = await dumpTableRows(t);
    totalRows += rows.length;
    await uploadToStorage(`${stamp}/${t}.json`, JSON.stringify(rows));
  }

  // 保留 8 週：清掉更早的備份資料夾
  const { url, key } = env();
  let pruned = 0;
  const listRes = await fetch(`${url}/storage/v1/object/list/${BUCKET}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix: '', limit: 1000 }),
  });
  if (listRes.ok) {
    const entries = (await listRes.json()) as Array<{ name: string }>;
    const cutoff = Date.now() - 8 * 7 * 86400_000;
    const oldFolders = entries
      .map((e) => e.name)
      .filter((name) => {
        // 資料夾名即時間戳（YYYY-MM-DD-hh-mm）
        const d = new Date(name.slice(0, 10));
        return Number.isFinite(d.getTime()) && d.getTime() < cutoff;
      });
    for (const folder of oldFolders) {
      const delRes = await fetch(`${url}/storage/v1/object/${BUCKET}`, {
        method: 'DELETE',
        headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefixes: tables.map((t) => `${folder}/${t}.json`) }),
      });
      if (delRes.ok) pruned++;
    }
  }

  return { stamp, tables: tables.length, rows: totalRows, pruned };
}
