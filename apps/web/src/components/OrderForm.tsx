'use client';

import type { CreateOrderResponse, PublicProduct } from '@ff/shared';
import { Link } from 'react-router-dom';
import { FormEvent, useMemo, useState } from 'react';
import { parseApiError, publicApiUrl } from '@/lib/public-api';

export function OrderForm({ products }: { products: PublicProduct[] }) {
  const [productId, setProductId] = useState(products[0]?.id ?? '');
  const [playerUid, setPlayerUid] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'YAPE' | 'BCP'>('YAPE');
  const [consent, setConsent] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<CreateOrderResponse | null>(null);

  const selected = useMemo(
    () => products.find((item) => item.id === productId),
    [productId, products],
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${publicApiUrl}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          playerUid,
          phone,
          customerName: customerName || undefined,
          paymentMethod,
          whatsappConsent: consent,
        }),
      });
      if (!response.ok) throw new Error(await parseApiError(response));
      const data = (await response.json()) as CreateOrderResponse;
      localStorage.setItem(`ff-order-token:${data.publicCode}`, data.trackingToken);
      setCreated(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (created) {
    const info = created.paymentInstructions;
    return (
      <div className="form-shell">
        <div className="card">
          <div className="badge">Pedido creado</div>
          <h2 className="section-title">Código {created.publicCode}</h2>
          <p className="muted">
            Guarda este código. El token privado ya se almacenó en este navegador.
          </p>
          <details className="instructions">
            <summary>Mostrar token de recuperación</summary>
            <span className="code" style={{ overflowWrap: 'anywhere' }}>{created.trackingToken}</span>
            <span className="muted small">Trátalo como una contraseña: permite consultar este pedido desde otro dispositivo.</span>
          </details>
          <div className="instructions">
            <strong>Paga exactamente S/ {info.amount}</strong>
            <span>Método: {info.method}</span>
            <span>Titular: {info.holder || 'Configurar en el servidor'}</span>
            {info.phone && <span>Yape: {info.phone}</span>}
            {info.account && <span>Cuenta BCP: {info.account}</span>}
            {info.cci && <span>CCI: {info.cci}</span>}
            {info.qrUrl && <img className="qr" src={info.qrUrl} alt="Código QR de Yape" />}
          </div>
          <p className="muted small">
            El pedido vence el {new Date(created.expiresAt).toLocaleString('es-PE')}.
          </p>
          <Link className="btn btn-primary" to={`/pedido/${created.publicCode}`}>
            Subir comprobante y seguir pedido
          </Link>
        </div>
        <div className="card">
          <h3>Importante</h3>
          <p className="muted">
            Una captura no confirma automáticamente el depósito. El equipo revisará el ingreso antes de despachar los diamantes.
          </p>
          <p className="muted">
            Verifica cuidadosamente el UID. No compartas contraseñas ni códigos de acceso de tu cuenta.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="form-shell">
      <div>
        <h2 className="section-title">Crear pedido</h2>
        <p className="section-subtitle">
          Completa los datos exactamente como aparecen en el juego.
        </p>
        <div className="card">
          <h3>Resumen</h3>
          <p className="muted">{selected?.name ?? 'Selecciona un paquete'}</p>
          <div className="price">S/ {selected?.price ?? '0.00'}</div>
          <p className="muted small">No se solicitará contraseña de Free Fire.</p>
        </div>
      </div>

      <form className="card form-grid" onSubmit={submit}>
        <div className="field">
          <label htmlFor="product">Paquete</label>
          <select id="product" className="select" value={productId} onChange={(e) => setProductId(e.target.value)} required>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} — S/ {product.price}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="uid">UID del jugador</label>
          <input id="uid" className="input" inputMode="numeric" pattern="[0-9]{6,20}" value={playerUid} onChange={(e) => setPlayerUid(e.target.value.replace(/\D/g, ''))} required />
        </div>
        <div className="field">
          <label htmlFor="name">Nombre del cliente (opcional)</label>
          <input id="name" className="input" value={customerName} onChange={(e) => setCustomerName(e.target.value)} maxLength={100} />
        </div>
        <div className="field">
          <label htmlFor="phone">WhatsApp</label>
          <input id="phone" className="input" inputMode="tel" placeholder="999999999" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="payment">Método de pago</label>
          <select id="payment" className="select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as 'YAPE' | 'BCP')}>
            <option value="YAPE">Yape</option>
            <option value="BCP">Transferencia BCP</option>
          </select>
        </div>
        <label className="checkbox-row">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>Acepto recibir actualizaciones transaccionales de este pedido por WhatsApp.</span>
        </label>
        {error && <div className="alert alert-error">{error}</div>}
        <button className="btn btn-primary" type="submit" disabled={loading || !products.length}>
          {loading ? 'Creando pedido…' : 'Crear pedido'}
        </button>
      </form>
    </div>
  );
}
