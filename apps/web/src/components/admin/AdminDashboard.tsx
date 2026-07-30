import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminHeader } from './AdminHeader';
import { adminBackendFetch, apiInternalUrl } from '@/lib/admin-session';

type Summary = {
  totalOrders: number;
  reviewRequired: number;
  readyForDispatch: number;
  completed: number;
  paidRevenuePen: string;
};

type AdminOrder = {
  id: string;
  publicCode: string;
  customerName: string | null;
  customerPhone: string;
  playerUid: string;
  productName: string;
  diamonds: number;
  amount: string;
  paymentMethod: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  createdAt: string;
  latestReceipt: null | {
    id: string;
    operationNumber: string | null;
    reviewStatus: string;
    rejectionReason: string | null;
  };
};

export function AdminDashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [error, setError] = useState('');
  const [loadingId, setLoadingId] = useState('');

  const load = useCallback(async () => {
    const [summaryResponse, ordersResponse] = await Promise.all([
      adminBackendFetch('/admin/dashboard/summary'),
      adminBackendFetch('/admin/orders'),
    ]);
    if (summaryResponse.status === 401 || ordersResponse.status === 401) {
      navigate('/admin/login');
      return;
    }
    if (!summaryResponse.ok || !ordersResponse.ok) {
      setError('No se pudo cargar el panel.');
      return;
    }
    setSummary(await summaryResponse.json());
    setOrders(await ordersResponse.json());
    setError('');
  }, [navigate]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 12_000);
    return () => window.clearInterval(timer);
  }, [load]);

  async function action(id: string, type: 'approve' | 'reject' | 'complete') {
    let body: Record<string, string> = {};
    if (type === 'reject') {
      const reason = window.prompt('Motivo de rechazo del comprobante:');
      if (!reason) return;
      body = { reason };
    }
    if (type === 'complete') {
      const reference = window.prompt('Referencia del distribuidor o despacho (opcional):') ?? '';
      body = { providerReference: reference };
    }

    setLoadingId(id);
    setError('');
    try {
      const response = await adminBackendFetch(`/admin/orders/${id}/${type}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) {
        const message = Array.isArray(data.message) ? data.message.join(' ') : data.message;
        throw new Error(message || 'No se pudo actualizar el pedido.');
      }
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingId('');
    }
  }

  async function deleteOrder(id: string) {
    const confirm = window.confirm('Advertencia: ¿Estás seguro de eliminar completamente este pedido? Esta acción es irreversible y SOLO DEBE USARSE para eliminar pedidos de prueba. Para cancelar un pedido real, utiliza el botón "Rechazar".');
    if (!confirm) return;
    setLoadingId(id);
    setError('');
    try {
      const response = await adminBackendFetch(`/admin/orders/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'No se pudo eliminar el pedido.');
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingId('');
    }
  }

  return (
    <>
      <AdminHeader title="Gestión de pedidos" />
      {summary && (
        <div className="status-grid" style={{ marginBottom: 22 }}>
          <div className="stat"><span className="muted small">Pedidos</span><strong>{summary.totalOrders}</strong></div>
          <div className="stat"><span className="muted small">Por revisar</span><strong>{summary.reviewRequired}</strong></div>
          <div className="stat"><span className="muted small">Por despachar</span><strong>{summary.readyForDispatch}</strong></div>
          <div className="stat"><span className="muted small">Ventas aprobadas</span><strong>S/ {summary.paidRevenuePen}</strong></div>
        </div>
      )}
      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Pedido</th><th>Cliente / UID</th><th>Producto</th><th>Pago</th><th>Despacho</th><th>Comprobante</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td><strong className="code">{order.publicCode}</strong><br /><span className="muted small">{new Date(order.createdAt).toLocaleString('es-PE')}</span></td>
                <td>{order.customerName || 'Sin nombre'}<br /><span className="code">UID {order.playerUid}</span><br /><span className="muted small">+{order.customerPhone}</span></td>
                <td>{order.productName}<br /><strong>S/ {order.amount}</strong></td>
                <td><span className={`badge ${order.paymentStatus}`}>{order.paymentStatus}</span><br /><span className="muted small">{order.paymentMethod}</span></td>
                <td><span className={`badge ${order.fulfillmentStatus}`}>{order.fulfillmentStatus}</span></td>
                <td>
                  {order.latestReceipt ? (
                    <><a className="btn btn-secondary btn-sm" href={`/api/admin/orders/${order.id}/receipt`} target="_blank" rel="noreferrer">Abrir</a><br /><span className="muted small">Op. {order.latestReceipt.operationNumber || 'sin número'}</span></>
                  ) : <span className="muted">Sin archivo</span>}
                </td>
                <td>
                  <div className="actions" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {(order.paymentStatus === 'REVIEW_REQUIRED' || order.paymentStatus === 'PENDING') && <>
                        <button className="btn btn-success btn-sm" disabled={loadingId === order.id} onClick={() => void action(order.id, 'approve')}>Aprobar</button>
                        <button className="btn btn-danger btn-sm" disabled={loadingId === order.id} onClick={() => void action(order.id, 'reject')}>Rechazar</button>
                      </>}
                      {order.paymentStatus === 'PAID' && order.fulfillmentStatus !== 'COMPLETED' && (
                        <button className="btn btn-primary btn-sm" disabled={loadingId === order.id} onClick={() => void action(order.id, 'complete')}>Marcar despachado</button>
                      )}
                    </div>
                    <button 
                      className="btn btn-danger outline btn-sm" 
                      style={{ opacity: 0.8 }}
                      disabled={loadingId === order.id} 
                      onClick={() => void deleteOrder(order.id)}>
                      Eliminar ensayo
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!orders.length && <tr><td colSpan={7} className="muted">No hay pedidos todavía.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
