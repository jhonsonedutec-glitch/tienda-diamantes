#!/bin/bash
set -e

echo "Vercel Build Script: Vite SPA Edition"

cd "$(dirname "$0")/.."
echo "Working directory set to: $(pwd)"

echo "Instalando dependencias desde el raíz..."
npm install

echo "Generando Prisma Client..."
npm run db:generate

echo "Construyendo dependencias del monorepo..."
npm run build:packages

echo "Iniciando compilación ultrarrápida (Vite)..."
npm run build -w @ff/web

echo "¡Compilación SPA exitosa!"
