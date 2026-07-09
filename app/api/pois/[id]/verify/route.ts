// POST /api/pois/[id]/verify — 社群 POI 驗證（Phase 4A，v7.0 E 節）
// 需登入：以用戶的 access token 建立 RLS 客戶端，
// 插入政策（verifications_insert_own）確保只能以本人身分驗證；
// UNIQUE(poi_id, user_id) 確保同人同點僅一次（防刷）。
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: poiId } = await params;
  if (!UUID_RE.test(poiId)) {
    return NextResponse.json({ error: 'Invalid POI id' }, { status: 400 });
  }

  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json(
      {
        error: 'login_required',
        message_zh: '請先登入才能驗證地點',
        message_en: 'Please sign in to verify this place',
      },
      { status: 401 }
    );
  }

  // 以用戶 token 建立客戶端：後續操作全部受 RLS 約束
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    }
  );

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser(token);
  if (userErr || !user) {
    return NextResponse.json({ error: 'login_required' }, { status: 401 });
  }

  const { error } = await supabase
    .from('poi_verifications')
    .insert({ poi_id: poiId, user_id: user.id });

  if (error) {
    if (error.code === '23505') {
      // UNIQUE 違反 = 已驗證過
      return NextResponse.json(
        {
          status: 'already_verified',
          message_zh: '您已經驗證過這個地點了',
          message_en: 'You have already verified this place',
        },
        { status: 409 }
      );
    }
    if (error.code === '23503') {
      // 外鍵違反 = POI 不存在
      return NextResponse.json({ error: 'POI not found' }, { status: 404 });
    }
    console.error('[api/pois/verify] insert error:', error.code);
    return NextResponse.json({ error: 'Verify failed' }, { status: 500 });
  }

  return NextResponse.json({
    status: 'verified',
    message_zh: '感謝回報！已記錄您的驗證',
    message_en: 'Thanks! Your verification has been recorded',
  });
}
