// components/ui/Header.tsx — 頂部固定 Header（48px，v1.0 §四）
// 右側預留：日出日落倒數（Phase 7）、語言切換（Phase 16）
export function Header() {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-border bg-white px-3">
      <span className="text-lg font-bold text-primary">🚴 環島通</span>
      <span className="text-sm text-neutral-text">FormoSA Ride</span>
    </header>
  );
}
