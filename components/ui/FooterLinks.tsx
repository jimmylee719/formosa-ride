// components/ui/FooterLinks.tsx — 全站 Footer 連結（Phase 16A，v5.0 D3）
// ⚠️ 依 v5.0 D3：此處與任何前台頁面都不得出現 /admin 連結。
// 使用說明（16C）、聯絡我們（16D）等頁面建好後再加入。
import Link from 'next/link';

const LINKS = [
  { href: '/guide', label: 'How to Use 使用說明' },
  { href: '/privacy', label: 'Privacy 隱私政策' },
  { href: '/resources', label: 'Gov Resources 政府資源' },
  { href: '/feedback', label: 'Feedback 回饋意見' },
];

export function FooterLinks() {
  return (
    <footer className="mt-6 pb-4 text-center">
      <nav className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-neutral-text">
        {LINKS.map((l, i) => (
          <span key={l.href} className="flex items-center gap-3">
            {i > 0 && <span aria-hidden>|</span>}
            <Link href={l.href} className="underline">
              {l.label}
            </Link>
          </span>
        ))}
      </nav>
      <p className="mt-2 text-sm text-neutral-text">
        © {new Date().getFullYear()} Camper Road Taiwan · FormoSA Ride 環島通
      </p>
    </footer>
  );
}
