'use client';

import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiInternalUrl, ADMIN_TOKEN_KEY } from '@/lib/admin-session';

export function AdminLoginForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${apiInternalUrl}/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        const message = Array.isArray(data.message)
          ? data.message.join(' ')
          : data.message;
        throw new Error(message || 'No se pudo iniciar sesión.');
      }
      localStorage.setItem(ADMIN_TOKEN_KEY, data.accessToken);
      navigate('/admin');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="form-grid" onSubmit={submit}>
      <div className="field">
        <label htmlFor="email">Correo</label>
        <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="password">Contraseña</label>
        <input id="password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <button className="btn btn-primary" disabled={loading}>
        {loading ? 'Ingresando…' : 'Ingresar'}
      </button>
    </form>
  );
}
