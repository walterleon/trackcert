#!/bin/bash
# Script de build para despliegue en rastreoya.com (cPanel)
# Ejecutar localmente antes de subir archivos al servidor

set -e

echo "=== RastreoYa - Build de Producción ==="

# 1. Build del servidor (TypeScript -> JavaScript)
echo ""
echo "--- Build Backend ---"
cd server
npm install
npm run build
echo "✓ Backend compilado en server/dist/"

# 2. Build del frontend
echo ""
echo "--- Build Frontend ---"
cd ../client
npm install
npm run build
echo "✓ Frontend compilado en client/dist/"

echo ""
echo "=== Build completado ==="
echo ""
echo "Próximos pasos:"
echo "1. Subir carpeta server/ completa (excepto node_modules) al servidor"
echo "2. En el servidor: cd server && npm install --production"
echo "3. Copiar server/.env.production como server/.env y configurar valores"
echo "4. Ejecutar: cd server && npx prisma generate && npx prisma migrate deploy"
echo "5. Subir contenido de client/dist/ a public_html/rastreoya.com/"
echo "6. Configurar cPanel Node.js App apuntando a server/dist/index.js"
