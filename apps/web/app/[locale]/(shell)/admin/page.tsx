import { redirect } from 'next/navigation';

/** `/admin` → operations dashboard (no index existed before). */
export default function AdminIndexPage() {
  redirect('/admin/operations');
}
