import { useParams } from 'react-router-dom';
import { OrderTracker } from '@/components/OrderTracker';

export default function OrderPage() {
  const { id } = useParams<{ id: string }>();

  if (!id) return <p className="container section">ID de pedido no encontrado.</p>;

  return (
    <main>
      <section className="section container">
        <OrderTracker publicCode={id} />
      </section>
    </main>
  );
}
