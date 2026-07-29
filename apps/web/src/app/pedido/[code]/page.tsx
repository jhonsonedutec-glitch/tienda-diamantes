import { OrderTracker } from '@/components/OrderTracker';

export default async function OrderPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return (
    <main className="section container">
      <OrderTracker publicCode={code} />
    </main>
  );
}
