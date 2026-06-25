# Qubi

**Agenda de equipo** para organizar el trabajo por proyectos: crea un equipo, asigna
tareas a sus miembros, sigue su estado en un tablero y registra las horas dedicadas a
cada proyecto. **Gratuita**, con cuentas propias e inicio de sesión con Google,
autoalojada en un VPS.

Está construida sobre una base tipo Notion (páginas con editor de bloques y
colaboración en tiempo real), pero la gestión de tareas y horas es la experiencia
principal.

El plan de trabajo completo y el roadmap por fases está en [PLAN.md](./PLAN.md).

## Funcionalidades

- **Equipos** — cada espacio de trabajo es un equipo con sus miembros y roles
  (`OWNER` / `ADMIN` / `MEMBER` / `GUEST`); invitación por email.
- **Proyectos** — agrupan las tareas y las horas; cada uno con su color.
- **Tareas** — asignar responsable, prioridad y fecha límite; estado en tres fases
  (**Por hacer / En curso / Hecha**). Tres vistas por proyecto: **tablero** (kanban),
  **lista** (edición en línea) y **calendario** (por fecha límite). Detalle de tarea
  con descripción y comentarios.
- **Mi agenda** — vista transversal de tus tareas pendientes, agrupadas en
  _Vencidas / Hoy / Esta semana / Más adelante / Sin fecha_.
- **Registro de horas** — hoja semanal por proyecto y día, con totales por día,
  por proyecto y de la semana.
- **Páginas y notas** — editor de bloques tipo Notion con colaboración en tiempo real
  (Yjs), bases de datos, favoritos, papelera y enlaces públicos de solo lectura.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **PostgreSQL** + **Prisma 7** (con driver adapter `@prisma/adapter-pg`)
- **Tailwind CSS v4** + **shadcn/ui**
- **Auth.js (NextAuth v5)** — Google OAuth y email/contraseña
- **Redis** (presencia/caché) y **MinIO** (almacenamiento de archivos S3) en local
- **Yjs + Hocuspocus** para la edición colaborativa de páginas
- Calidad: ESLint + Prettier + Husky + lint-staged

## Requisitos

- Node.js 22+ (probado con Node 26)
- Docker (para la base de datos, Redis y MinIO en local)

## Puesta en marcha (desarrollo)

```bash
# 1. Instalar dependencias
npm install

# 2. Crear el archivo .env (mínimo: DATABASE_URL y AUTH_SECRET; ver más abajo)

# 3. Levantar la infraestructura local (Postgres, Redis, MinIO)
docker compose up -d

# 4. Aplicar las migraciones de la base de datos
npm run db:migrate

# 5. Arrancar la app (en una terminal)
npm run dev

# 6. (Opcional) Servidor de colaboración para el editor de páginas (OTRA terminal)
npm run collab
```

Abre [http://localhost:3000](http://localhost:3000).

### Variables de entorno (desarrollo)

Mínimo para arrancar (coincide con `docker-compose.yml`):

```bash
DATABASE_URL="postgresql://qubi:qubi_dev_password@localhost:5433/qubi?schema=public"
AUTH_SECRET="genera-uno-con: openssl rand -base64 32"
```

Opcionales: `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` (login con Google), las `S3_*`
(MinIO, para subir imágenes) y `NEXT_PUBLIC_COLLAB_URL` (editor colaborativo). El
listado completo está en [.env.production.example](./.env.production.example).

> El editor de bloques usa colaboración en tiempo real (Yjs), así que para editar
> páginas necesita el servidor `npm run collab` (Hocuspocus, ws://localhost:1234)
> corriendo en paralelo. La gestión de tareas y horas no lo necesita.

> Postgres se expone en el puerto **5433** del host (para no chocar con otros Postgres
> locales). La consola de MinIO está en [http://localhost:9001](http://localhost:9001)
> (usuario/clave: `qubi` / `qubi_dev_password`).

## Scripts

| Script                | Descripción                           |
| --------------------- | ------------------------------------- |
| `npm run dev`         | Servidor de desarrollo                |
| `npm run build`       | Build de producción                   |
| `npm run start`       | Servir el build                       |
| `npm run collab`      | Servidor de colaboración (Hocuspocus) |
| `npm run lint`        | ESLint                                |
| `npm run format`      | Formatear con Prettier                |
| `npm run typecheck`   | Comprobar tipos (tsc)                 |
| `npm run db:migrate`  | Crear/aplicar migraciones             |
| `npm run db:generate` | Generar el cliente de Prisma          |
| `npm run db:studio`   | Abrir Prisma Studio                   |

## Estructura

```
src/
├─ app/          # Rutas (App Router): w/[workspaceId]/{projects,tasks,agenda,hours,...}
├─ components/   # UI (shadcn + propios)
├─ features/     # Lógica por dominio: project, task, time, workspace, page, editor, ...
├─ lib/          # db (prisma), auth, storage, utils
├─ server/       # Server actions y servicios (por dominio)
└─ generated/    # Cliente Prisma (generado, no se commitea)
prisma/          # schema.prisma y migraciones
collab/          # Servidor Hocuspocus (tiempo real)
docker-compose.yml
```
