import { OrderForm } from '@/components/OrderForm';
import { getProducts } from '@/lib/public-api';
import { useState, useEffect } from 'react';

export default function HomePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProducts().then(data => {
      setProducts(data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="container" style={{padding: '80px 0', textAlign: 'center'}}>Buscando ofertas...</div>;

  return (
    <main>
      <section className="hero container">
        <div className="badge">Yape · BCP · Confirmación por WhatsApp</div>
        <h1>
          Recarga tus <span className="gradient-text">diamantes</span> de forma clara y segura
        </h1>
        <p>
          Selecciona el paquete, registra tu UID, realiza el pago y consulta el estado de tu pedido con un token privado.
        </p>
      </section>

      <section className="section container">
        <h2 className="section-title">Paquetes disponibles</h2>
        <p className="section-subtitle">El precio mostrado se congela cuando creas el pedido.</p>
        {products.length ? (
          <div className="grid">
            {products.map((product) => (
              <article className="card product-card" key={product.id}>
                <div className="diamond">💎</div>
                <h3>{product.name}</h3>
                <p>{product.description ?? 'Recarga de diamantes.'}</p>
                <div className="price">S/ {product.price}</div>
                <div className="muted small">
                  {product.diamonds} diamantes
                  {product.bonusDiamonds ? ` + ${product.bonusDiamonds} de bono` : ''}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="alert">
            El catálogo se encuentra temporalmente vacío. Si eres administrador, inicia sesión para añadir paquetes.
          </div>
        )}
      </section>

      <section className="section container" id="comprar">
        <OrderForm products={products} />
      </section>
    </main>
  );
}
