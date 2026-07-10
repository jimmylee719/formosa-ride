// GET /api/admin/template/[type] — 下載上傳範本（Phase 14A，v4.0 C9）
// type: poi | route | correction。middleware 已驗證管理員身分。
import { NextResponse } from 'next/server';
import { buildPoiTemplate, buildRouteTemplate, buildCorrectionTemplate } from '@/lib/excel-templates';

const TEMPLATES = {
  poi: { build: buildPoiTemplate, filename: 'FormoSA_POI上傳範本.xlsx' },
  route: { build: buildRouteTemplate, filename: 'FormoSA_路線上傳範本.xlsx' },
  correction: { build: buildCorrectionTemplate, filename: 'FormoSA_資料修正範本.xlsx' },
} as const;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;
  const tpl = TEMPLATES[type as keyof typeof TEMPLATES];
  if (!tpl) {
    return NextResponse.json({ error: 'Invalid template type' }, { status: 400 });
  }
  const wb = tpl.build();
  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      // 中文檔名需 RFC 5987 編碼
      'Content-Disposition': `attachment; filename="template-${type}.xlsx"; filename*=UTF-8''${encodeURIComponent(tpl.filename)}`,
    },
  });
}
