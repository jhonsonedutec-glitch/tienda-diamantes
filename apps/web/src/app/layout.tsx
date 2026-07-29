import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Recargas Free Fire',
  description: 'Gestión segura de pedidos y recargas de diamantes.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <header className="site-header">
          <nav className="container nav">
            <Link href="/" className="brand">
              <span className="brand-mark">FF</span>
              <span>Diamond Store</span>
            </Link>
            <div className="nav-links">
              <Link href="/">Comprar</Link>
              <Link href="/admin/login">Administración</Link>
            </div>
          </nav>
        </header>
        {children}
        <footer className="footer">
          <div className="container">
            Servicio independiente. Usa únicamente distribuidores autorizados y verifica tu UID antes de pagar.
          </div>
        </footer>
      </body>
    </html>
  );
}
