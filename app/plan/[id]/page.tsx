// /plan/[id] — 行程編輯（Phase 19A）
import { Header } from '@/components/ui/Header';
import { BottomNavBar } from '@/components/mobile/BottomNavBar';
import { PlanEditor } from '@/components/plan/PlanEditor';

export const metadata = {
  title: 'Edit Plan 編輯行程',
};

export default async function PlanEditPage(ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header />
      <main className="flex-1 overflow-y-auto bg-neutral-bg p-4">
        <PlanEditor planId={id} />
      </main>
      <BottomNavBar />
    </div>
  );
}
