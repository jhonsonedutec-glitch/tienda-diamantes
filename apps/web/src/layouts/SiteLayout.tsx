import { Link, Outlet } from 'react-router-dom';

export default function SiteLayout() {
  return (
    <>
      <header className="site-header">
        <nav className="container nav">
          <Link to="/" className="brand">
            <span className="brand-mark">FF</span>
            <span>Diamond Store</span>
          </Link>
          <div className="nav-links">
            <Link to="/">Comprar</Link>
            <Link to="/admin/login">Administración</Link>
          </div>
        </nav>
      </header>
      
      <Outlet />
      
      <footer className="footer">
        <div className="container">
          Servicio independiente. Usa únicamente distribuidores autorizados y verifica tu UID antes de pagar.
        </div>
      </footer>
    </>
  );
}
