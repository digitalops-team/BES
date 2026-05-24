# BES — Buzón Electrónico SUNAT

Sistema de monitoreo centralizado del Buzón Electrónico de SUNAT para múltiples empresas. Descarga automáticamente notificaciones y documentos PDF, los almacena en base de datos y los presenta en un panel web con alertas en tiempo real.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Backend | NestJS 11 + TypeScript |
| Base de datos | PostgreSQL 15 + Prisma ORM |
| Colas | Redis 7 + BullMQ |
| Scraping | Puppeteer |
| Frontend | Next.js 16 + React 19 + Tailwind CSS v4 |
| Estado | Zustand |
| Tiempo real | Socket.IO (WebSockets) |

---

## Requisitos previos

- Node.js >= 20
- Docker & Docker Compose (para PostgreSQL y Redis)
- Git

---

## Configuración del entorno

### 1. Levantar la base de datos y Redis

```bash
docker-compose up -d
```

### 2. Configurar variables de entorno del backend

```bash
cd backend
cp .env.example .env
# Editar .env con tus valores reales (ver sección de variables)
```

### 3. Inicializar la base de datos

```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

### 4. Crear usuario administrador inicial

```bash
cd backend
npx ts-node seed-admin.ts
```

---

## Variables de entorno requeridas (`backend/.env`)

| Variable | Descripción | Ejemplo |
|---|---|---|
| `DATABASE_URL` | Cadena de conexión PostgreSQL | `postgresql://user:pass@localhost:5433/bes_db` |
| `ENCRYPTION_KEY` | Clave AES-256 — **exactamente 32 caracteres** | *(generada con `node -e "..."`)* |
| `JWT_SECRET` | Secreto para firmar tokens JWT | *(string aleatorio largo)* |
| `FRONTEND_URL` | Origen del frontend (para CORS) | `http://localhost:3001` |
| `BACKEND_URL` | URL pública del backend | `http://localhost:3000` |
| `REDIS_HOST` | Host de Redis | `localhost` |
| `REDIS_PORT` | Puerto de Redis | `6379` |

Para generar claves seguras:
```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"  # 32 chars → ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"  # 64 chars → JWT_SECRET
```

---

## Levantar en desarrollo

```bash
# Terminal 1 — Backend (puerto 3000)
cd backend
npm install
npm run start:dev

# Terminal 2 — Frontend (puerto 3001)
cd frontend
npm install
npm run dev
```

---

## Roles de usuario

| Rol | Acceso |
|---|---|
| `SUPER_ADMIN` | Todo el sistema, todas las empresas |
| `ADMIN` | Administración, todas las empresas |
| `USUARIO_LOCAL` | Solo las empresas asignadas a su cuenta |

---

## Sincronización automática

El sistema ejecuta un cron job **todos los días a las 6:00 AM** que:
1. Encola un trabajo de scraping por cada empresa activa (BullMQ).
2. Cada trabajo lanza un browser Puppeteer, autenticándose en SUNAT.
3. Descarga las notificaciones y PDFs nuevos.
4. Almacena todo en la base de datos.
5. Envía alertas por email ante notificaciones urgentes (órdenes de pago, esquelas).

También se puede disparar manualmente desde el panel web por empresa o de forma masiva.

---

## Estructura del proyecto

```
BES/
├── backend/          # NestJS API
│   ├── src/
│   │   ├── auth/         # Autenticación JWT
│   │   ├── scraper/      # Puppeteer + BullMQ + Cron
│   │   ├── empresas/     # CRUD de empresas
│   │   ├── notificaciones/
│   │   ├── usuarios/
│   │   ├── asignaciones/
│   │   ├── estadisticas/
│   │   ├── events/       # WebSockets (Socket.IO)
│   │   ├── mail/         # Nodemailer
│   │   ├── encryption/   # AES-256 para claves SOL
│   │   └── uploads/      # Servicio de PDFs (protegido por JWT)
│   └── prisma/           # Schema y migraciones
├── frontend/         # Next.js App Router
│   └── src/
│       ├── app/          # Páginas y Route Handlers
│       ├── components/
│       ├── store/        # Zustand
│       ├── lib/          # Cliente Axios
│       └── types/
└── docker-compose.yml    # PostgreSQL + Redis
```
