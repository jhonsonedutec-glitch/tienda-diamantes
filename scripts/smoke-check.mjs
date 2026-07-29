import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const required = [
  'package.json',
  'apps/web/package.json',
  'apps/api/package.json',
  'apps/worker/package.json',
  'packages/database/prisma/schema.prisma',
  'apps/api/src/modules/orders/orders.service.ts',
  'apps/web/src/components/admin/AdminDashboard.tsx',
];

for (const file of required) await access(join(root, file));
for (const file of required.filter((item) => item.endsWith('package.json'))) {
  JSON.parse(await readFile(join(root, file), 'utf8'));
}

const schema = await readFile(join(root, 'packages/database/prisma/schema.prisma'), 'utf8');
for (const model of ['Product', 'Order', 'PaymentIntent', 'PaymentReceipt', 'Notification', 'AuditLog']) {
  if (!schema.includes(`model ${model} {`)) throw new Error(`Falta el modelo ${model}`);
}

console.log('Smoke check correcto: estructura, JSON y modelos principales presentes.');
