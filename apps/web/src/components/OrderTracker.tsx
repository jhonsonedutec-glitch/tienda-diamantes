

import type { PublicOrderView } from '@ff/shared';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { parseApiError, publicApiUrl } from '@/lib/public-api';

type OrderWithInstructions = PublicOrderView & {
  paymentInstructions?: Record<string, string> | null;
};

export function OrderTracker({ publicCode }: { publicCode: string }) {
  const [token, setToken] = useState('');
  const [recoveryToken, setRecoveryToken] = useState('');
  const [order, setOrder] = useState<OrderWithInstructions | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async (orderToken: string) => {
    if (!orderToken) {
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(`${publicApiUrl}/orders/${publicCode}`, {
        headers: { 'x-order-token': orderToken },
        cache: 'no-store',
      });
      if (!response.ok) throw new Error(await parseApiError(response));
      setOrder((await response.json()) as OrderWithInstructions);
      setError('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [publicCode]);

  useEffect(() => {
    const stored = localStorage.getItem(`ff-order-token:${publicCode}`) ?? '';
    setToken(stored);
    void load(stored);
    const interval = window.setInterval(() => void load(stored), 15_000);
    return () => window.clearInterval(interval);
  }, [load, publicCode]);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setUploading(true);
    setError('');
    setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${publicApiUrl}/orders/${publicCode}/receipt`, {
        method: 'POST',
        headers: { 'x-order-token': token },
        body: form,
      });
      if (!response.ok) throw new Error(await parseApiError(response));
      const data = (await response.json()) as { message: string };
      setMessage(data.message);
      formElement.reset();
      await load(token);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <div className="card">Cargando pedido…</div>;

  if (!token) {
    return (
      <div className="card form-grid">
        <h1>Token no encontrado</h1>
        <p className="muted">
          El código público no es suficiente. Pega el token de recuperación que se mostró al crear el pedido.
        </p>
        <div className="field">
          <label htmlFor="recoveryToken">Token privado</label>
          <input id="recoveryToken" className="input code" value={recoveryToken} onChange={(event) => setRecoveryToken(event.target.value.trim())} />
        </div>
        <button
          className="btn btn-primary"
          disabled={!recoveryToken}
          onClick={() => {
            localStorage.setItem(`ff-order-token:${publicCode}`, recoveryToken);
            setToken(recoveryToken);
            setLoading(true);
            void load(recoveryToken);
          }}
        >
          Recuperar pedido
        </button>
      </div>
    );
  }

  if (!order) {
    return <div className="alert alert-error">{error || 'No se pudo cargar el pedido.'}</div>;
  }

  const canUpload = !['PAID', 'REFUNDED'].includes(order.paymentStatus) && order.fulfillmentStatus !== 'COMPLETED';

  return (
    <div className="form-grid">
      <div className="card">
        <div className="admin-toolbar">
          <div>
            <div className="badge">Seguimiento privado</div>
            <h1 className="section-title">Pedido {order.publicCode}</h1>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => void load(token)}>Actualizar</button>
        </div>
        <div className="status-grid">
          <div className="stat"><span className="muted small">Pago</span><strong><span className={`badge ${order.paymentStatus}`}>{order.paymentStatus}</span></strong></div>
          <div className="stat"><span className="muted small">Despacho</span><strong><span className={`badge ${order.fulfillmentStatus}`}>{order.fulfillmentStatus}</span></strong></div>
          <div className="stat"><span className="muted small">Paquete</span><strong>{order.diamonds} 💎</strong></div>
          <div className="stat"><span className="muted small">Monto</span><strong>S/ {order.amount}</strong></div>
        </div>
        <p><strong>UID:</strong> <span className="code">{order.playerUid}</span></p>
        <p><strong>Producto:</strong> {order.productName}</p>
        {order.latestReceipt && (
          <div className="instructions">
            <strong>Último comprobante: {order.latestReceipt.reviewStatus}</strong>
            {order.latestReceipt.rejectionReason && <span>Observación: {order.latestReceipt.rejectionReason}</span>}
          </div>
        )}
      </div>

      {canUpload && (
        <form className="card form-grid" onSubmit={upload}>
          <h2 className="section-title">Subir comprobante</h2>
          <div className="field">
            <label htmlFor="operationNumber">Número de operación (opcional)</label>
            <input id="operationNumber" name="operationNumber" className="input" maxLength={100} />
          </div>
          <div className="field">
            <label htmlFor="paymentDate">Fecha y hora del pago (opcional)</label>
            <input id="paymentDate" name="paymentDate" type="datetime-local" className="input" />
          </div>
          <div className="field">
            <label htmlFor="file">Imagen JPG/PNG o PDF, máximo 5 MB</label>
            <input id="file" name="file" type="file" className="input" accept="image/jpeg,image/png,application/pdf" required />
          </div>
          {message && <div className="alert alert-success">{message}</div>}
          {error && <div className="alert alert-error">{error}</div>}
          <button className="btn btn-primary" disabled={uploading}>
            {uploading ? 'Subiendo…' : 'Enviar comprobante'}
          </button>
        </form>
      )}

      {order.fulfillmentStatus === 'COMPLETED' && (
        <div className="alert alert-success">La recarga fue registrada como completada.</div>
      )}
    </div>
  );
}
