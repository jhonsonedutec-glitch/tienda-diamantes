# Free Fire Sales MVP

MVP para venta y gestión de recargas de diamantes con:

- Catálogo público de paquetes.
- Pedidos con UID del jugador.
- Pago inicial por Yape o transferencia BCP.
- Carga privada de comprobantes.
- Revisión administrativa de pagos.
- Despacho manual y registro de referencia.
- Notificaciones por WhatsApp Cloud API mediante cola BullMQ.
- Arquitectura preparada para Culqi, Mercado Pago, Binance Pay y proveedores de recarga autorizados.

## Arquitectura

- `apps/web`: Next.js App Router.
- `apps/api`: NestJS + Fastify.
- `apps/worker`: BullMQ Worker para WhatsApp y futuros procesos.
- `packages/database`: Prisma + PostgreSQL/Supabase.
- `packages/shared`: contratos y constantes compartidas.

El diseño es un **monolito modular con procesos asíncronos**, adecuado para un MVP y escalable sin introducir microservicios innecesarios.

## Requisitos

- Node.js 20.9 o superior.
- npm 10 o superior.
- PostgreSQL 16 o Supabase PostgreSQL.
- Redis 7.

## Instalación local

1. Levanta PostgreSQL y Redis:

```bash
docker compose up -d
```

2. Instala dependencias:

```bash
npm install
```

3. Configura variables del backend y worker:

```bash
cp .env.example .env
```

4. Configura el frontend:

```bash
cp apps/web/.env.local.example apps/web/.env.local
```

5. Genera Prisma, crea las tablas y carga datos iniciales:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

6. Inicia todos los procesos:

```bash
npm run dev
```

- Tienda: `http://localhost:3000`
- Panel: `http://localhost:3000/admin/login`
- API: `http://localhost:4000/api/v1`
- Swagger: `http://localhost:4000/docs`

## Uso con Supabase

1. Crea un proyecto en Supabase.
2. Coloca la cadena PostgreSQL en `DATABASE_URL`.
3. Ejecuta `infra/supabase-storage.sql` en el SQL Editor.
4. Configura:

```env
STORAGE_DRIVER=supabase
SUPABASE_URL=https://TU_PROYECTO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_RECEIPTS_BUCKET=payment-receipts
```

La clave `service_role` debe permanecer únicamente en el backend. Nunca la copies a `apps/web/.env.local`.

## Configuración de WhatsApp

La aplicación crea notificaciones en PostgreSQL y coloca trabajos en Redis. El worker las envía mediante WhatsApp Cloud API.

Configura en `.env`:

```env
WHATSAPP_ENABLED=true
WHATSAPP_GRAPH_VERSION=vXX.X
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_LANGUAGE_CODE=es_PE
```

En producción se recomienda usar plantillas aprobadas. Coloca sus nombres en las variables `WHATSAPP_TEMPLATE_*`. Para pruebas controladas puede habilitarse texto libre con `WHATSAPP_ALLOW_TEXT_MESSAGES=true` cuando la conversación esté dentro de la ventana permitida por Meta.

## Flujo operativo inicial

1. El cliente selecciona un paquete e ingresa UID y teléfono.
2. El backend congela el precio y genera un código y token privado de seguimiento.
3. El cliente paga por Yape o BCP y sube el comprobante.
4. El administrador abre el panel y aprueba o rechaza.
5. Si se aprueba, el pedido queda listo para despacho manual.
6. El administrador procesa la recarga con un distribuidor autorizado y registra la referencia.
7. El worker notifica al cliente por WhatsApp.

## Seguridad incorporada

- Precio calculado exclusivamente en backend.
- Token privado por pedido almacenado como hash SHA-256.
- Comprobantes privados, no URLs públicas permanentes.
- JWT administrativo en cookie HTTP-only del BFF de Next.js.
- Límite de tamaño y tipos MIME para comprobantes.
  Esta estructura asegura una fácil adopción para desarrolladores freelance y despliegues estables de bajo costo en plataformas híbridas (Render + Vercel / Railway).

- Auditoría de aprobaciones, rechazos y despachos.
- Estados de pago y despacho separados.
- Dinero almacenado como `Decimal`, no `float`.
- Trabajos idempotentes de notificación con `jobId` estable.

## Limitaciones deliberadas del MVP

- Yape y BCP se verifican manualmente; una captura no confirma por sí sola un depósito.
- El despacho de diamantes es manual hasta contratar un proveedor autorizado con API.
- No se incluye automatización por scraping ni por control de navegador.
- La aplicación no almacena contraseñas de cuentas de juego.

Consulta `docs/ADDING_PAYMENT_PROVIDER.md` para añadir una pasarela y `docs/PRODUCTION_CHECKLIST.md` antes de publicar.
