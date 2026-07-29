'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function AdminHeader({ title }: { title: string }) {
  const router = useRouter();

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <div className="admin-toolbar">
      <div>
        <div className="badge">Panel interno</div>
        <h1 className="section-title">{title}</h1>
      </div>
      <div className="admin-nav">
        <Link className="btn btn-secondary btn-sm" href="/admin">Pedidos</Link>
        <Link className="btn btn-secondary btn-sm" href="/admin/productos">Productos</Link>
        <Link className="btn btn-secondary btn-sm" href="/admin/dashboard">Métricas</Link>
        <button className="btn btn-danger btn-sm" onClick={logout}>Salir</button>
      </div>
    </div>
  );
}
