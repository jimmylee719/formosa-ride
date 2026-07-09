/**
 * scripts/import-accident-data.ts — 政府事故資料 → 危險路段（Phase 8 骨架，Phase 15 完成）
 *
 * 資料來源：交通部道路交通事故開放資料（data.gov.tw，A1/A2 類事故明細）
 * 使用方式：
 *   1. 至 data.gov.tw 搜尋「道路交通事故」下載年度 CSV（含經緯度欄位）
 *   2. npx tsx scripts/import-accident-data.ts <csv路徑> <資料年度>
 *
 * 處理邏輯（v3.0 A1 規格）：
 *   - 解析 CSV 的事故座標（欄位名稱依實際下載檔案校準——各年度格式不一，
 *     ⚠️ 執行前先用文字編輯器確認欄位，本骨架預設欄名為佔位，不可未經查證直接跑）
 *   - 以 500m 網格聚合事故點，聚合數 ≥ 門檻者形成危險點/段
 *   - level 門檻：≥20 件 high、≥10 件 medium、≥5 件 low（可依年度資料量調整）
 *   - 寫入 danger_zones（accident_count、data_year、accident_source 誠實回填）
 *
 * 尚未實作原因：實際 CSV 欄位需拿到檔案後校準（鐵則一：不憑猜測寫解析器）。
 */

const [csvPath, dataYear] = process.argv.slice(2);

if (!csvPath || !dataYear) {
  console.log('用法：npx tsx scripts/import-accident-data.ts <事故CSV路徑> <資料年度>');
  console.log('請先至 data.gov.tw 下載「道路交通事故」開放資料。');
  process.exit(0);
}

console.error(
  '⚠️ 此腳本為骨架：實際欄位解析需在拿到 CSV 後校準（Phase 15 完成）。\n' +
    '   請將下載檔案的欄位名稱貼給 Claude，再完成解析器實作。'
);
process.exit(1);
