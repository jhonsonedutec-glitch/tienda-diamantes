import { OrderForm } from '@/components/OrderForm';
import { getProducts } from '@/lib/public-api';

export default async function HomePage() {
  const products = await getProducts();

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
          <div className="alert alert-error">
            No se pudo cargar el catálogo. Verifica que la API esté iniciada.
          </div>
        )}
      </section>

      <section className="section container" id="comprar">
        <OrderForm products={products} />
      </section>
    </main>
  );
}
