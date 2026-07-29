'use client';

import { Link, useNavigate } from 'react-router-dom';

export function AdminHeader({ title }: { title: string }) {
  const navigate = useNavigate();

  async function logout() {
    await fetch(import.meta.env.VITE_API_INTERNAL_URL ? `${import.meta.env.VITE_API_INTERNAL_URL}/auth/admin/logout` : 'https://tienda-cerebro.onrender.com/api/v1/auth/admin/logout', { method: 'POST' });
    navigate('/admin/login');
  }

  return (
    <div className="admin-toolbar">
      <div>
        <div className="badge">Panel interno</div>
        <h1 className="section-title">{title}</h1>
      </div>
      <div className="admin-nav">
        <Link className="btn btn-secondary btn-sm" to="/admin">Pedidos</Link>
        <Link className="btn btn-secondary btn-sm" to="/admin/productos">Productos</Link>
        <Link className="btn btn-secondary btn-sm" to="/admin/dashboard">Métricas</Link>
        <button className="btn btn-danger btn-sm" onClick={logout}>Salir</button>
      </div>
    </div>
  );
}
