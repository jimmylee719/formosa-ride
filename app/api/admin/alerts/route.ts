// /api/admin/alerts — 後台偵錯警示（Phase 14D，v11.0 B3）
// GET：讀 admin_pending_alerts view；PATCH：依類型標記已處理。
// middleware 已驗證管理員身分。
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

export interface PendingAlert {
  alert_type: 'payment_webhook_failed' | 'user_error_report' | 'system_outage' | 'suggested_place';
  reference: string;
  message: string;
  created_at: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase.from('admin_pending_alerts').select('*');
  if (error) {
    return NextResponse.json({ error: '查詢失敗' }, { status: 500 });
  }
  const alerts = (data ?? []) as PendingAlert[];

  // 用戶建議地點（Phase 19A）：view 定義不動，於此追加。
  // 表未建（migration 0016 未貼）時靜默略過，不影響其他警示。
  const { data: suggested } = await supabase
    .from('suggested_places')
    .select('id, name, created_at')
    .eq('status', 'pending');
  for (const s of suggested ?? []) {
    alerts.push({
      alert_type: 'suggested_place',
      reference: s.id as string,
      message: `用戶建議新地點：「${s.name}」`,
      created_at: s.created_at as string,
    });
  }
  return NextResponse.json({ alerts });
}

export async function PATCH(req: NextRequest) {
  let body: { alert_type?: unknown; reference?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const alertType = String(body.alert_type ?? '');
  const reference = String(body.reference ?? '');
  if (!reference) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // 各類型的「已處理」語意（對應 view 的三個資料來源）
  if (alertType === 'payment_webhook_failed') {
    // 人工確認後補記處理時間（webhook event_id 為外部字串，非 UUID）
    const { error } = await supabase
      .from('processed_payment_events')
      .update({ processed_at: new Date().toISOString() })
      .eq('event_id', reference);
    if (error) return NextResponse.json({ error: '更新失敗' }, { status: 500 });
  } else if (alertType === 'user_error_report') {
    if (!UUID_RE.test(reference)) {
      return NextResponse.json({ error: 'Invalid reference' }, { status: 400 });
    }
    const { error } = await supabase
      .from('feedback')
      .update({ status: 'reviewed' })
      .eq('id', reference);
    if (error) return NextResponse.json({ error: '更新失敗' }, { status: 500 });
  } else if (alertType === 'system_outage') {
    if (!UUID_RE.test(reference)) {
      return NextResponse.json({ error: 'Invalid reference' }, { status: 400 });
    }
    const { error } = await supabase
      .from('system_outages')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', reference);
    if (error) return NextResponse.json({ error: '更新失敗' }, { status: 500 });
  } else {
    return NextResponse.json({ error: 'Invalid alert_type' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
