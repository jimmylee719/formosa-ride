// /plan/shared/[token] — 分享行程唯讀頁（Phase 19B）
// 拿到連結的人不需登入即可查看，可一鍵複製成自己的行程。
// token 為 64 字元隨機值不可猜測；noindex 防搜尋引擎收錄。
import { Header } from '@/components/ui/Header';
import { BottomNavBar } from '@/components/mobile/BottomNavBar';
import { PlanReadonlyView } from '@/components/plan/PlanReadonlyView';
import { ImportPlanButton } from '@/components/plan/ImportPlanButton';
import { createServiceClient } from '@/lib/supabase-server';
import { getPlanDetailByToken } from '@/lib/plan-queries';

export const metadata = {
  title: 'Shared Trip Plan 分享的行程',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function SharedPlanPage(ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const plan = await getPlanDetailByToken(createServiceClient(), token);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header />
      <main className="flex-1 overflow-y-auto bg-neutral-bg p-4">
        {!plan ? (
          <p className="info-secondary rounded-2xl bg-white p-6 text-center text-neutral-text">
            This share link is invalid or has been disabled.
            <br />
            分享連結無效或已被停用。
          </p>
        ) : (
          <>
            <p className="info-secondary mb-2 rounded-xl bg-info-bg p-3 text-info-text">
              👀 Someone shared this trip plan with you (read-only).
              有人與你分享了這份行程（唯讀）。
            </p>
            <PlanReadonlyView plan={plan} />
            <div className="mt-4">
              <ImportPlanButton token={token} />
            </div>
          </>
        )}
      </main>
      <BottomNavBar />
    </div>
  );
}
