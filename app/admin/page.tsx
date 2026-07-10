// /admin — 一律轉向儀表板（middleware 已確保登入）
import { redirect } from 'next/navigation';

export default function AdminIndexPage() {
  redirect('/admin/dashboard');
}
