// lib/excel-templates.ts — 三種上傳範本產生（Phase 14A，v4.0 C9）
// 依需求即時產生（不預存二進位檔於 repo），下載內容永遠與驗證規則同步。
// exceljs 原生支援下拉選單資料驗證（規格原示意的 SheetJS CE 不支援此功能）。
import ExcelJS from 'exceljs';
import { VALID_POI_TYPES, ROUTE_TYPE_MAP, DIFFICULTY_MAP, CORRECTION_FIELD_MAP } from '@/lib/import-excel';

const CONTACT = 'skadoosh.ai.lab@gmail.com';
const DROPDOWN_ROWS = 500; // 下拉驗證套用列數（單次匯入上限 2000，500 列已遠超日常用量）

/** 對某欄第 2–DROPDOWN_ROWS 列套用清單下拉驗證（exceljs 官方 API 為逐儲存格設定） */
function addListValidation(ws: ExcelJS.Worksheet, colLetter: string, options: string[]): void {
  for (let row = 2; row <= DROPDOWN_ROWS; row++) {
    ws.getCell(`${colLetter}${row}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`"${options.join(',')}"`],
    };
  }
}

function addInstructionSheet(wb: ExcelJS.Workbook, title: string, lines: string[]): void {
  const ws = wb.addWorksheet('填寫說明');
  ws.addRow([title]);
  ws.addRow(['']);
  lines.forEach((l, i) => ws.addRow([`${i + 1}. ${l}`]));
  ws.addRow(['']);
  ws.addRow([`如有問題，請聯繫 ${CONTACT}`]);
  ws.getColumn(1).width = 90;
}

export function buildPoiTemplate(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('POI資料');
  const headers = [
    '中文名稱', '英文名稱', '類型', '緯度', '經度', '地址', '電話',
    '中文說明', '英文說明', '是否免費', '有腳踏車停放', '有淋浴設備',
    '可搭帳篷', '有充電插座', '有飲用水', '24小時營業', '資料來源說明', '免費版可見',
  ];
  ws.addRow(headers);
  ws.addRow([
    '全家便利商店花蓮店', 'FamilyMart Hualien', '便利商店',
    23.9871, 121.6015, '花蓮縣花蓮市中正路100號', '03-8312345',
    '24小時營業，有座位區', 'Open 24hrs, seating area',
    '是', '是', '否', '否', '是', '是', '是', '親自確認', '是',
  ]);
  ws.columns.forEach((col) => {
    col.width = 18;
  });
  ws.getRow(1).font = { bold: true };
  // 類型下拉選單（C 欄）＋ 是/否欄位下拉（J–P、R）
  addListValidation(ws, 'C', VALID_POI_TYPES);
  for (const colLetter of ['J', 'K', 'L', 'M', 'N', 'O', 'P', 'R']) {
    addListValidation(ws, colLetter, ['是', '否']);
  }
  addInstructionSheet(wb, 'FormoSA Ride POI 資料上傳範本 — 填寫說明', [
    '第一列為標題，請勿修改文字或順序',
    '「類型」欄位請從下拉選單選擇，不要自行輸入',
    '緯度經度：可以從 Google Maps 上點擊地點取得（緯度 21–26、經度 119–122.5）',
    '「是/否」類欄位請填「是」或「否」；留空時「是否免費」「免費版可見」視為「是」，其餘視為「否」',
    '第 2 列為範例資料，上傳前可刪除或直接覆蓋',
    '填寫完成後，至後台「批次資料上傳」頁面上傳此檔案',
  ]);
  return wb;
}

export function buildRouteTemplate(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('路線資料');
  ws.addRow([
    '中文路線名稱', '英文路線名稱', '路線類型', 'GPX檔案名稱', '總距離(公里)', '難度',
    '建議天數', '起點名稱', '終點名稱', '經過縣市', '中文介紹', '英文介紹', '騎行建議', '資料來源',
  ]);
  ws.addRow([
    '花東縱谷支線', 'Huadong Valley Branch', '支線', 'huadong-valley.gpx', 45.2, '中等',
    1, '花蓮火車站', '玉里火車站', '花蓮縣', '沿縱谷平原，風景優美', 'Scenic valley route',
    '建議避開中午高溫時段', '觀光署官方路線',
  ]);
  ws.columns.forEach((col) => {
    col.width = 18;
  });
  ws.getRow(1).font = { bold: true };
  addListValidation(ws, 'C', Object.keys(ROUTE_TYPE_MAP));
  addListValidation(ws, 'F', Object.keys(DIFFICULTY_MAP));
  addInstructionSheet(wb, 'FormoSA Ride 路線上傳範本 — 填寫說明', [
    '第一列為標題，請勿修改文字或順序',
    '路線座標無法填在 Excel 中：請將 GPX 檔與本檔一起上傳，「GPX檔案名稱」需與檔名完全相符',
    '「路線類型」「難度」請從下拉選單選擇',
    '第 2 列為範例資料，上傳前可刪除或直接覆蓋',
    '填寫完成後，至後台「批次資料上傳」頁面：選擇本檔 + 對應的 GPX 檔（可多選）',
  ]);
  return wb;
}

export function buildCorrectionTemplate(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('修正資料');
  ws.addRow(['資料ID', '資料名稱（供核對用）', '要修改的欄位', '新內容', '修改原因']);
  ws.addRow([
    '00000000-0000-0000-0000-000000000000', '全家便利商店花蓮店', '電話',
    '03-8999999', '店家電話已更換',
  ]);
  ws.columns.forEach((col) => {
    col.width = 26;
  });
  ws.getRow(1).font = { bold: true };
  addListValidation(ws, 'C', Object.keys(CORRECTION_FIELD_MAP));
  addInstructionSheet(wb, 'FormoSA Ride 資料修正範本 — 填寫說明', [
    '「資料ID」是系統內部 UUID，可從後台資料列表取得',
    '「資料名稱」填修改前的名稱，系統會核對一致才套用（防止改錯筆）',
    `「要修改的欄位」可用：${Object.keys(CORRECTION_FIELD_MAP).join(' / ')}`,
    '「下架」：新內容可留空，該筆資料將從地圖隱藏（資料保留供查核）',
    '「是否營業中」：新內容填「是」或「否」',
    '第 2 列為範例資料，上傳前請刪除或覆蓋',
  ]);
  return wb;
}
