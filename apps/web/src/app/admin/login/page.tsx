import { AdminLoginForm } from '@/components/admin/AdminLoginForm';

export default function AdminLoginPage() {
  return (
    <main className="login-wrap">
      <div className="card login-card">
        <div className="badge">Área protegida</div>
        <h1 className="section-title">Administración</h1>
        <p className="muted">Revisa pagos y registra los despachos realizados.</p>
        <AdminLoginForm />
      </div>
    </main>
  );
}
