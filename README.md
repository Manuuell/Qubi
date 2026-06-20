# Qubi

Plataforma web tipo Notion para gestión de proyectos y notas — **gratuita**, con cuentas
propias e inicio de sesión con Google, autoalojada en un VPS.

El plan de trabajo completo y el roadmap por fases está en [PLAN.md](./PLAN.md).

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **PostgreSQL** + **Prisma 7** (con driver adapter `@prisma/adapter-pg`)
- **Tailwind CSS v4** + **shadcn/ui**
- **Redis** (presencia/caché) y **MinIO** (almacenamiento de archivos S3) en local
- Calidad: ESLint + Prettier + Husky + lint-staged

## Requisitos

- Node.js 22+ (probado con Node 26)
- Docker (para la base de datos, Redis y MinIO en local)

## Puesta en marcha (desarrollo)

```bash
# 1. Instalar dependencias
npm install

# 2. Crear el archivo de entorno
cp .env.example .env

# 3. Levantar la infraestructura local (Postgres, Redis, MinIO)
docker compose up -d

# 4. Aplicar las migraciones de la base de datos
npm run db:migrate

# 5. Arrancar la app
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

> Postgres se expone en el puerto **5433** del host (para no chocar con otros Postgres
> locales). La consola de MinIO está en [http://localhost:9001](http://localhost:9001)
> (usuario/clave: `qubi` / `qubi_dev_password`).

## Scripts

| Script                | Descripción                  |
| --------------------- | ---------------------------- |
| `npm run dev`         | Servidor de desarrollo       |
| `npm run build`       | Build de producción          |
| `npm run start`       | Servir el build              |
| `npm run lint`        | ESLint                       |
| `npm run format`      | Formatear con Prettier       |
| `npm run typecheck`   | Comprobar tipos (tsc)        |
| `npm run db:migrate`  | Crear/aplicar migraciones    |
| `npm run db:generate` | Generar el cliente de Prisma |
| `npm run db:studio`   | Abrir Prisma Studio          |

## Estructura

```
src/
├─ app/          # Rutas (App Router)
├─ components/   # UI (shadcn + propios)
├─ features/     # Lógica por dominio (editor, workspace, auth, ...)
├─ lib/          # db (prisma), utils
├─ server/       # Server actions y servicios
└─ generated/    # Cliente Prisma (generado, no se commitea)
prisma/          # schema.prisma y migraciones
docker-compose.yml
```
