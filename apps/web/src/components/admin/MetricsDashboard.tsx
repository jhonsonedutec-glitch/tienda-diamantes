'use client';

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminHeader } from './AdminHeader';
import { adminBackendFetch } from '@/lib/admin-session';

export function MetricsDashboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<'week' | 'month' | 'semester' | 'all'>('week');
  const [metrics, setMetrics] = useState<{ revenuePen: number; totalOrders: number; period: string } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminBackendFetch(`/admin/metrics?period=${period}`);
      if (response.status === 401) {
        navigate('/admin/login');
        return;
      }
      if (!response.ok) throw new Error('No se pudieron cargar las métricas');
      
      const data = await response.json();
      setMetrics(data);
      setError('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [period, navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <AdminHeader title="Dashboard & Métricas" />
      
      <div style={{ marginBottom: '24px', display: 'flex', gap: '10px' }}>
        <button className={`btn btn-sm ${period === 'week' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPeriod('week')}>Esta Semana</button>
        <button className={`btn btn-sm ${period === 'month' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPeriod('month')}>Este Mes</button>
        <button className={`btn btn-sm ${period === 'semester' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPeriod('semester')}>Últimos 6 Meses</button>
        <button className={`btn btn-sm ${period === 'all' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPeriod('all')}>Histórico Total</button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {metrics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '20px' }}>
          <div className="stat" style={{ padding: '30px', border: '1px solid #333', borderRadius: '12px', background: '#111' }}>
            <span className="muted small" style={{ fontSize: '18px', display: 'block', marginBottom: '8px' }}>Ingresos Aprobados (Soles)</span>
            <strong style={{ fontSize: '48px', color: '#25D366' }}>S/ {metrics.revenuePen.toFixed(2)}</strong>
          </div>
          <div className="stat" style={{ padding: '30px', border: '1px solid #333', borderRadius: '12px', background: '#111' }}>
            <span className="muted small" style={{ fontSize: '18px', display: 'block', marginBottom: '8px' }}>Pedidos Pagados</span>
            <strong style={{ fontSize: '48px', color: '#FFF' }}>{metrics.totalOrders}</strong>
          </div>
        </div>
      )}
      
      {loading && <div style={{ marginTop: '20px', color: '#888' }}>Cargando métricas...</div>}
    </>
  );
}
