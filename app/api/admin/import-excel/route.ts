// POST /api/admin/import-excel — 上傳 Excel 解析與驗證（Phase 14A，v4.0 C6）
// multipart：file（Excel）、type（poi|route|correction）、gpx（多檔，路線用）。
// 只驗證不寫庫；回傳錯誤明細 + 正確紀錄，確認匯入由 confirm-import 處理。
// （規格的 importToken 暫存設計在 serverless 上不可靠——驗證與確認可能落在
//   不同實例，故改由前端持有驗證結果、confirm-import 端複驗後匯入。）
import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import {
  sheetDataRows,
  validatePoiRows,
  validateRouteRows,
  validateCorrectionRows,
} from '@/lib/import-excel';

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_GPX_BYTES = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: '請以 multipart/form-data 上傳' }, { status: 400 });
  }

  const type = String(form.get('type') ?? '');
  const file = form.get('file');
  if (!['poi', 'route', 'correction'].includes(type)) {
    return NextResponse.json({ error: '上傳類型不正確' }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: '缺少 Excel 檔案' }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'Excel 檔案超過 5MB 上限' }, { status: 400 });
  }

  // 路線附帶 GPX 檔（檔名 → 內容）
  const gpxFiles = new Map<string, string>();
  for (const g of form.getAll('gpx')) {
    if (g instanceof File && g.size <= MAX_GPX_BYTES) {
      gpxFiles.set(g.name, await g.text());
    }
  }

  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(Buffer.from(await file.arrayBuffer()) as unknown as ArrayBuffer);
  } catch {
    return NextResponse.json(
      { error: '無法讀取檔案，請確認是 .xlsx 格式（由範本另存）' },
      { status: 400 }
    );
  }
  const ws = wb.worksheets[0];
  if (!ws) {
    return NextResponse.json({ error: '檔案中沒有工作表' }, { status: 400 });
  }

  const rows = sheetDataRows(ws);
  if (rows.length === 0) {
    return NextResponse.json({ error: '沒有資料列（第 1 列為標題）' }, { status: 400 });
  }

  const result =
    type === 'poi'
      ? validatePoiRows(rows)
      : type === 'route'
        ? validateRouteRows(rows, gpxFiles)
        : validateCorrectionRows(rows);

  return NextResponse.json({
    totalRows: rows.length,
    validCount: result.records.length,
    errorCount: result.errors.length,
    errors: result.errors,
    preview: result.records.slice(0, 10),
    records: result.records, // 前端持有，確認匯入時原樣送回 confirm-import
    fileName: file.name,
  });
}
