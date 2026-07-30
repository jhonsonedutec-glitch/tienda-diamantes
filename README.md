# Free Fire Sales MVP

MVP escalable y ultrarrápido para la venta y gestión de recargas de diamantes, optimizado para plataformas híbridas de producción (Vercel + Render).

## Funcionalidades Principales

- **Catálogo de productos Público:** Paquetes actualizables dinámicamente con desglose de bonos en diamantes.
- **Formulario Inteligente:** Solicitud de depósitos exactos, UID del jugador, y subida del comprobante a nube.
- **Panel Administrativo (Dashboard):** Aprobación de recibos, registro de despacho manual y revisión de Métricas en vivo (Reportes Diarios, Mensuales y Totales).
- **Notificaciones WhatsApp (BullMQ):** Alertas transaccionales en tiempo real impulsadas por tareas en segundo plano.

---

## 🏛 Arquitectura Moderna (SPA + Monorepo)

Este proyecto fue migrado desde una infraestructura inestable para asegurar compilaciones menores a 1 segundo y máxima inmunidad a caídas:

- `apps/web`: **React + Vite SPA**. Enrutamiento puro del lado del cliente y Tailwind CSS v4. Cero servidor de front-end.
- `apps/api`: **NestJS + Fastify**. API súper agresiva con autenticación JWT directa basada en CORS.
- `apps/worker`: **NestJS Worker**. Gestor de colas Redis/BullMQ para WhatsApp.
- `packages/database`: **Prisma + PostgreSQL**. Integración unificada.
- `packages/shared`: Contratos, entidades, utilidades TypeScript puras.

---

## 🚀 Despliegue en Producción (Cloud)

La separación y el motor único permiten su estadía perfecta y ultra barata en la nube:

### 1. El Backend (API & Worker en Render, Railway, etc.)

- Alojado como Web Service estándar sobre Node.
- Requiere acceso total a `DATABASE_URL` (Ej. PostgreSQL en nube).
- Para el administrador inicial, ejecutar desde la consola remota (Shell o Build Command): `npm run db:seed`.
- Requiere la variable **`WEB_ORIGIN`** declarada con el enlace de producción público para evadir bloqueos de seguridad cruzados (CORS).

### 2. El Frontend (Vercel)

- Vercel detectará el proyecto. Entrará en `apps/web` y usará comandos puros de Linux para buscar al `prisma` global.
- Debes sobreescribir el **Build Command** desde el Panel de Interfaz de Vercel usando la fórmula invencible:
  `cd ../../ && npm install && npx prisma db push --schema packages/database/prisma/schema.prisma && npm run build:packages && cd apps/web && vite build`
- Sobreescribe el **Output Directory** a simplemente `dist`.
- Asegurar tener configurada ahí la variable `VITE_PUBLIC_API_URL` apuntando a la nube de tu API.

---

## 💻 Desarrollo Local Rápido

1. Levanta los motores ligeros locales (Postgres, Redis):

```bash
docker compose up -d
```

2. Instala por completo las raíces del árbol:

```bash
npm install
```

3. (Opcional) Copia el archivo falso de entorno si eres colaborador:

```bash
cp .env.example .env
```

4. Prepara el molde de la base de datos:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

5. Enciende todo al mismo tiempo:

```bash
npm run dev
```

### Rutas de Práctica:

- Tienda pública: `http://localhost:3000`
- API Backend (Swagger Documental): `http://localhost:4000/docs`
- Panel Interno de Admin: `http://localhost:3000/admin/login` (Admin Test: `admin@ff.example` / `admin123`).

---

## 🛡️ Niveles de Seguridad Reescritos

Cero vulnerabilidades predecibles. El JWT administrativo recae enteramente en LocalStorage respaldado por interceptores blindados desde Vite Central (`admin-session.ts`). Los comprobantes viven encubiertos en la nube (Supabase/S3). Los datos asumen `Decimal` nativo logrando 100% de precisión transaccional y el Dispatch separa pagos vs envío evadiendo robo de datos.
