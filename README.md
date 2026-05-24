# BES — Monitoreo y Scraping de Buzón Electrónico SUNAT

Este proyecto es un sistema centralizado diseñado para monitorear el **Buzón Electrónico de SUNAT** para múltiples empresas de forma automática. Descarga las notificaciones y los documentos PDF asociados, almacena la información en una base de datos local y la expone en un panel web en tiempo real con notificaciones por correo y WebSockets.

---

## 🏗️ Arquitectura del Sistema

El sistema se divide en cuatro componentes principales orquestados para correr en un servidor local (ej. Workstation Xeon):

1. **Frontend (Next.js)**: Interfaz de usuario interactiva y dashboard.
2. **Backend (NestJS)**: API REST, autenticación JWT, lógica de negocio y websockets.
3. **Queue & Workers (Redis + BullMQ)**: Cola de tareas asíncronas para gestionar de forma segura los trabajos de scraping secuencial.
4. **Base de Datos (PostgreSQL)**: Persistencia de usuarios, empresas y notificaciones.
5. **Scraper (Puppeteer)**: Agente robotizado que interactúa con la plataforma de SUNAT de forma automática.

---

## 📁 Estructura del Repositorio

```text
BES/
├── backend/              # API y Workers en NestJS
│   ├── src/              # Código fuente (auth, scraper, mail, events, etc.)
│   ├── prisma/           # Esquemas y migraciones de base de datos
│   ├── Dockerfile        # Dockerfile optimizado con Chromium para scraping
│   └── .env.example      # Plantilla de variables de entorno del backend
├── frontend/             # Interfaz de usuario en Next.js
│   ├── src/              # Código fuente de las vistas y hooks
│   ├── Dockerfile        # Dockerfile para la build y ejecución en producción
│   └── package.json      # Dependencias del frontend
├── docker-compose.yml    # Orquestación de producción (Postgres, Redis, Backend, Frontend)
└── README.md             # Esta guía de uso y despliegue
```

---

## 🚀 Despliegue en Producción (Docker Compose)

Este es el método recomendado para correr el sistema de forma estable en tu **Servidor Xeon Local**:

### Paso 1: Configurar Variables de Entorno
1. Entra a la carpeta `backend/` y crea una copia del archivo `.env`:
   ```bash
   cd backend
   cp .env.example .env
   ```
2. Genera claves seguras para `JWT_SECRET` y `ENCRYPTION_KEY` ejecutando:
   ```bash
   node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"  # ENCRYPTION_KEY (32 chars)
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"  # JWT_SECRET (64 chars)
   ```
3. Edita el archivo `backend/.env` y coloca estas claves generadas. 
4. Asegúrate de configurar la variable `PUPPETEER_HEADLESS="true"` en tu entorno de producción.

### Paso 2: Configurar la IP del Servidor en docker-compose
Abre el archivo `docker-compose.yml` en la raíz del proyecto y reemplaza `localhost` en `NEXT_PUBLIC_API_URL` por la IP local fija de tu servidor en la oficina:
```yaml
  frontend:
    # ...
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        - NEXT_PUBLIC_API_URL=http://192.168.1.50:4000  # <--- Cambia por la IP de tu servidor
```

### Paso 3: Construir e Iniciar Contenedores
En la raíz del proyecto, ejecuta:
```bash
docker compose up -d --build
```
*Este comando descargará las imágenes necesarias, instalará las dependencias en contenedores limpios y compilará tanto NestJS como Next.js para producción.*

### Paso 4: Ejecutar Migraciones y Cargar Semilla (Seed)
Aplica la estructura de base de datos en PostgreSQL y crea el usuario administrador por primera vez:
```bash
# 1. Ejecutar las migraciones
docker compose exec backend npx prisma migrate deploy

# 2. Cargar usuario administrador inicial (super admin)
docker compose exec backend npx ts-node seed-admin.ts
```
*Nota: Por defecto, se creará el usuario `admin@bes.com` con la contraseña `admin_password_2026`. Se recomienda cambiarla inmediatamente al iniciar sesión.*

### Paso 5: Probar y Usar
* Acceso a la interfaz web: `http://<IP_DE_TU_SERVIDOR>:3000`
* Acceso a la API del backend: `http://<IP_DE_TU_SERVIDOR>:4000`

---

## 💻 Desarrollo Local (Sin Docker para Next/Nest)

Si deseas modificar código o realizar pruebas interactivas donde puedas ver el navegador Puppeteer abriéndose gráficamente:

### 1. Iniciar Base de Datos y Redis
Usa docker compose únicamente para levantar PostgreSQL y Redis en segundo plano:
```bash
# Desde la raíz del proyecto
docker compose up -d postgres redis
```

### 2. Configurar el Backend localmente
En `backend/.env` pon la configuración apuntando a localhost:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/bes_db?schema=public"
REDIS_HOST="localhost"
REDIS_PORT="6379"
PUPPETEER_HEADLESS="false"  # <--- Esto te permite ver la ventana del navegador
```

Ejecuta las migraciones de desarrollo y levanta el servidor:
```bash
cd backend
npm install
npx prisma migrate dev
npm run start:dev
```

### 3. Configurar y Levantar el Frontend
Abre otra terminal:
```bash
cd frontend
npm install
npm run dev
```
La aplicación web estará disponible en `http://localhost:3001`.

---

## 🛠️ Solución de Problemas Frecuentes

### 1. Error de Puppeteer en Docker (`QPA: could not connect to display`)
* **Causa**: Puppeteer está intentando ejecutarse con la interfaz gráfica visible (`headless: false`) dentro del contenedor.
* **Solución**: Asegúrate de que la variable `PUPPETEER_HEADLESS` esté configurada como `"true"` en las variables del contenedor o en el archivo `docker-compose.yml` del backend.

### 2. Jobs de Scraping marcados como "Stalled" o expirados
* **Causa**: SUNAT tarda mucho en responder y la cola asume que el proceso murió.
* **Solución**: En el archivo [scraper.processor.ts](file:///c:/dhac/Proyectos/BES/backend/src/scraper/scraper.processor.ts), la propiedad `lockDuration` está fijada en `300000` (5 minutos) para evitar este problema. Asegúrate de no reducir este valor.

### 3. IP Bloqueada por SUNAT
* **Causa**: Demasiadas peticiones repetitivas desde la misma dirección IP en poco tiempo.
* **Solución**: Se ha implementado un control de colas secuencial (`concurrency: 1`) con esperas aleatorias entre búsquedas para emular el comportamiento de un usuario humano y evitar el bloqueo.
