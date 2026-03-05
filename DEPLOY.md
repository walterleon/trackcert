# Despliegue en rastreoya.com (cPanel)

## Arquitectura en producción

```
rastreoya.com        → Frontend React (public_html)
api.rastreoya.com    → Backend Node.js (cPanel Node.js App)
PostgreSQL           → Neon.tech (recomendado) o cPanel PostgreSQL
```

---

## Paso 0: Verificar el servidor (SSH)

Conectarse por SSH y ejecutar:

```bash
# ¿Qué versión de Node.js hay disponible?
node --version

# ¿Hay PostgreSQL instalado?
psql --version
# o bien:
which psql

# ¿Hay PM2 disponible?
pm2 --version
```

---

## Paso 1: Configurar base de datos PostgreSQL

### Opción A: Neon.tech (gratis, recomendado para cPanel compartido)

1. Crear cuenta en https://neon.tech
2. Crear un proyecto llamado `rastreoya`
3. Copiar el **Connection String** que se ve así:
   ```
   postgresql://user:password@ep-xxx.neon.tech/rastreoya?sslmode=require
   ```

### Opción B: PostgreSQL en el servidor

Si cPanel muestra PostgreSQL en la sección de bases de datos:
1. Crear base de datos `rastreoya`
2. Crear usuario con todos los permisos
3. Anotar host, user, password

---

## Paso 2: Configurar subdominio API (cPanel)

1. En cPanel → **Subdominios** → Crear `api.rastreoya.com`
   - El Document Root puede ser cualquier carpeta temporal (lo maneja Node.js App)

2. En cPanel → **Setup Node.js App**:
   - Application root: `/home/USER/rastreoya-api` (o la ruta donde se suba el backend)
   - Application URL: `api.rastreoya.com`
   - Application startup file: `dist/index.js`
   - Node.js version: 18.x o 20.x

---

## Paso 3: Subir el backend

### En local, hacer el build:
```bash
cd /home/user/trackcert
chmod +x deploy-cpanel.sh
./deploy-cpanel.sh
```

### Subir al servidor (SSH/FTP):
```bash
# Via SCP (SSH):
scp -r server/ USER@rastreoya.com:~/rastreoya-api/

# Excluir node_modules y archivos dev:
rsync -avz --exclude='node_modules' --exclude='.env' \
  server/ USER@rastreoya.com:~/rastreoya-api/
```

### En el servidor (SSH):
```bash
cd ~/rastreoya-api

# Instalar dependencias de producción
npm install --production

# Configurar variables de entorno
cp .env.production .env
nano .env  # Editar con los valores reales

# Generar cliente Prisma y migrar DB
npx prisma generate
npx prisma migrate deploy

# Verificar que arranca
node dist/index.js
# Debe mostrar: RastreoYa API running on port XXXX
# Ctrl+C para detener (cPanel Node.js App lo maneja como servicio)
```

---

## Paso 4: Subir el frontend

### En local, el build ya está en `client/dist/`

### Subir a public_html:
```bash
# Via SCP:
scp -r client/dist/* USER@rastreoya.com:~/public_html/

# Via rsync:
rsync -avz client/dist/ USER@rastreoya.com:~/public_html/
```

### Configurar `.htaccess` para React Router (SPA):
El archivo ya debería estar incluido. Si no, crear en `public_html/.htaccess`:
```apache
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.html [QSA,L]
```

---

## Paso 5: Variables de entorno del backend (.env en servidor)

```env
DATABASE_URL="postgresql://USER:PASS@HOST/rastreoya?sslmode=require"
PORT=3001  # cPanel asignará su propio puerto via variable $PORT
JWT_SECRET="generar con: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
ALLOWED_ORIGINS="https://rastreoya.com,https://www.rastreoya.com"
APP_URL="https://rastreoya.com"
NODE_ENV=production
```

---

## Verificación final

1. Abrir https://rastreoya.com — debe cargar el frontend React
2. Abrir https://api.rastreoya.com/api/health — debe responder `{"status":"ok"}`
3. Intentar registrarse/loguearse

## Troubleshooting común

| Problema | Solución |
|----------|----------|
| Frontend muestra pantalla en blanco | Revisar `.htaccess` para SPA routing |
| API retorna 502 | Verificar que el proceso Node.js está corriendo en cPanel |
| Error de DB | Verificar `DATABASE_URL` y que la IP del servidor tiene acceso en Neon |
| CORS error en consola | Verificar `ALLOWED_ORIGINS` en el `.env` del servidor |
