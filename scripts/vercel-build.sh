#!/bin/bash
set -ex

# Forzar directorio raíz leyendo la ruta absoluta del propio script
cd "$(dirname "$0")/.."
pwd
ls -la

# 1. Instalar dependencias globales
npm install

# 2. Forzar prisma estable
npx prisma@6 generate --schema packages/database/prisma/schema.prisma

# 3. Empaquetar módulos compartidos
npm run build:packages

# 4. Solucionar el Bug de Hoisting Turbopack con Tailwind v4
# Copiamos físicamente las librerías a la raiz web para evadir la ceguera de Next.js
cd apps/web
mkdir -p node_modules
cp -r ../../node_modules/postcss node_modules/postcss || true
cp -r ../../node_modules/@tailwindcss node_modules/@tailwindcss || true
cp -r ../../node_modules/tailwindcss node_modules/tailwindcss || true

# 5. Construir producción
npx next build
