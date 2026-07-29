'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminHeader } from './AdminHeader';

type Product = {
  id: string;
  name: string;
  description: string | null;
  diamonds: number;
  bonusDiamonds: number;
  active: boolean;
  salePrice: string | null;
};

export function ProductManager() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    const response = await fetch('/api/admin/products', { cache: 'no-store' });
    if (response.status === 401) {
      router.push('/admin/login');
      return;
    }
    if (!response.ok) {
      setError('No se pudieron cargar los productos.');
      return;
    }
    setProducts(await response.json());
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setError(''); setMessage('');
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.get('name'),
        description: form.get('description') || undefined,
        diamonds: Number(form.get('diamonds')),
        bonusDiamonds: Number(form.get('bonusDiamonds') || 0),
        salePrice: form.get('salePrice'),
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(Array.isArray(data.message) ? data.message.join(' ') : data.message);
      return;
    }
    formElement.reset();
    setMessage('Producto creado.');
    await load();
  }

  async function edit(product: Product) {
    const name = window.prompt('Nombre:', product.name);
    if (!name) return;
    const price = window.prompt('Precio en soles:', product.salePrice ?? '');
    if (!price) return;
    const response = await fetch(`/api/admin/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, salePrice: price }),
    });
    if (!response.ok) {
      const data = await response.json();
      setError(Array.isArray(data.message) ? data.message.join(' ') : data.message);
      return;
    }
    setMessage('Producto actualizado.');
    await load();
  }

  async function toggle(product: Product) {
    const response = await fetch(`/api/admin/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !product.active }),
    });
    if (!response.ok) {
      setError('No se pudo cambiar el estado.');
      return;
    }
    await load();
  }

  return (
    <>
      <AdminHeader title="Catálogo de productos" />
      <div className="form-shell">
        <form className="card form-grid" onSubmit={create}>
          <h2 className="section-title">Nuevo paquete</h2>
          <div className="field"><label>Nombre</label><input className="input" name="name" required maxLength={100} /></div>
          <div className="field"><label>Descripción</label><textarea className="textarea" name="description" maxLength={500} /></div>
          <div className="field"><label>Diamantes</label><input className="input" name="diamonds" type="number" min="1" required /></div>
          <div className="field"><label>Bono</label><input className="input" name="bonusDiamonds" type="number" min="0" defaultValue="0" /></div>
          <div className="field"><label>Precio S/</label><input className="input" name="salePrice" inputMode="decimal" pattern="^\d+(\.\d{1,2})?$" required /></div>
          <button className="btn btn-primary">Crear producto</button>
          {message && <div className="alert alert-success">{message}</div>}
          {error && <div className="alert alert-error">{error}</div>}
        </form>
        <div className="card">
          <h2 className="section-title">Paquetes</h2>
          <div className="form-grid">
            {products.map((product) => (
              <div className="instructions" key={product.id}>
                <strong>{product.name}</strong>
                <span>{product.diamonds} 💎 · S/ {product.salePrice ?? 'sin precio'}</span>
                <span className={`badge ${product.active ? 'APPROVED' : 'REJECTED'}`}>{product.active ? 'ACTIVO' : 'INACTIVO'}</span>
                <div className="actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => void edit(product)}>Editar nombre/precio</button>
                  <button className="btn btn-danger btn-sm" onClick={() => void toggle(product)}>{product.active ? 'Desactivar' : 'Activar'}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
