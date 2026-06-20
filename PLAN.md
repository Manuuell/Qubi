# Qubi — Plan de trabajo

Plataforma web tipo Notion para gestión de proyectos y notas, **gratuita**, con cuentas
propias e inicio de sesión con Google. Autoalojada en un VPS propio.

> Filosofía: "no inventamos nada, seguimos la rueda". Usamos patrones y librerías
> estándar y probadas en lugar de soluciones a medida.

---

## 1. Decisiones tomadas

| Tema          | Decisión                                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Stack         | **Next.js full-stack** (App Router) + TypeScript                                                                          |
| Base de datos | **PostgreSQL** con **Prisma** (ORM)                                                                                       |
| Alcance v1    | **Completo**: clon de Notion con bases de datos, vistas (tabla/kanban/calendario), permisos y colaboración en tiempo real |
| Despliegue    | VPS propio — **se define más adelante**                                                                                   |

---

## 2. Stack tecnológico detallado

| Capa              | Tecnología                                       | Por qué                                                 |
| ----------------- | ------------------------------------------------ | ------------------------------------------------------- |
| Framework         | Next.js 15 (App Router, Server Actions)          | Front + back en un solo proyecto                        |
| Lenguaje          | TypeScript (estricto)                            | Tipado end-to-end                                       |
| UI                | Tailwind CSS + shadcn/ui (Radix)                 | Componentes accesibles y estándar                       |
| Editor de bloques | **BlockNote** (sobre TipTap/ProseMirror)         | Editor estilo Notion listo, con soporte de colaboración |
| Drag & drop       | dnd-kit                                          | Reordenar bloques, filas, kanban                        |
| Datos/cliente     | TanStack Query                                   | Caché y sincronización de datos                         |
| API interna       | Server Actions + Route Handlers                  | Sin capa extra; tipado                                  |
| ORM / DB          | Prisma + PostgreSQL                              | Estándar, migraciones, type-safe                        |
| Auth              | **Auth.js (NextAuth v5)**                        | Google OAuth + email/contraseña                         |
| Tiempo real       | **Yjs (CRDT) + Hocuspocus**                      | Edición colaborativa, presencia/cursores                |
| Caché / presencia | Redis                                            | Sesiones, presencia, rate-limit                         |
| Archivos          | S3-compatible (**MinIO** en VPS o Cloudflare R2) | Imágenes, covers, adjuntos                              |
| Búsqueda          | Postgres full-text (v1) → Meilisearch (después)  | Empezar simple                                          |
| Validación        | Zod                                              | Esquemas compartidos cliente/servidor                   |
| Tests             | Vitest + Testing Library + Playwright (e2e)      | Unidad + integración + e2e                              |
| Calidad           | ESLint + Prettier + Husky + lint-staged          | Estilo y pre-commit                                     |
| CI/CD             | GitHub Actions                                   | Lint, test, build, deploy                               |

---

## 3. Arquitectura general

```
┌────────────────────────────────────────────────────────┐
│                     Navegador (cliente)                  │
│   React (Next.js) · BlockNote · Yjs client · TanStack    │
└───────────────┬───────────────────────┬─────────────────┘
                │ HTTP / Server Actions  │ WebSocket (Yjs)
                ▼                        ▼
┌───────────────────────────┐  ┌──────────────────────────┐
│   Next.js (App Router)     │  │  Hocuspocus (colab WS)    │
│   Server Actions / API     │  │  presencia + persistencia │
│   Auth.js                  │  └─────────────┬─────────────┘
└───────────┬───────────────┘                │
            │ Prisma                          │
            ▼                                 ▼
┌───────────────────────────┐  ┌──────────────────────────┐
│       PostgreSQL           │  │          Redis            │
└───────────────────────────┘  └──────────────────────────┘
            │
            ▼
┌───────────────────────────┐
│  Almacenamiento de objetos │  (MinIO / R2 — imágenes y adjuntos)
└───────────────────────────┘
```

---

## 4. Modelo de datos (borrador)

Entidades principales (se refinará en Prisma):

- **User** — id, email, name, image, hashedPassword?, emailVerified, createdAt
- **Account / Session / VerificationToken** — tablas de Auth.js (OAuth)
- **Workspace** — id, name, slug, icon, ownerId, createdAt
- **WorkspaceMember** — workspaceId, userId, role (`owner|admin|member|guest`)
- **Page** — id, workspaceId, parentId (auto-relación → anidación), title, icon,
  cover, type (`page|database`), isDatabaseRow, databaseId?, archivedAt, createdById,
  createdAt, updatedAt
- **Block** — id, pageId, parentBlockId?, type, content (JSONB), position, createdAt,
  updatedAt _(o documento Yjs por página; ver Fase 5)_
- **DatabaseProperty** — id, databaseId, name, type (`text|number|select|multiSelect|
date|checkbox|person|url|relation|...`), config (JSONB), position
- **PropertyValue** — pageId, propertyId, value (JSONB)
- **DatabaseView** — id, databaseId, type (`table|board|calendar|list|gallery`),
  name, filters (JSONB), sorts (JSONB), groupBy, config
- **Share / Permission** — pageId, subject (user|link), level (`read|comment|edit|full`)
- **Comment** — id, pageId, blockId?, userId, body, resolvedAt, createdAt
- **Favorite** — userId, pageId

> Nota: una "fila" de una base de datos es en realidad una **Page** (`isDatabaseRow=true`)
> que pertenece a un `databaseId`. Así una fila puede abrirse como página completa,
> igual que en Notion.

---

## 5. Roadmap por fases

Construimos hacia el producto completo, pero por fases entregables. Cada fase deja algo
usable y testeado.

### Fase 0 — Fundaciones

- Inicializar Next.js + TypeScript + Tailwind + shadcn/ui
- Prisma + PostgreSQL (en Docker para desarrollo local)
- ESLint, Prettier, Husky, estructura de carpetas
- Variables de entorno (`.env.example`), README
- Git + repositorio + CI básico (lint + build)

### Fase 1 — Autenticación y cuentas

- Auth.js (NextAuth v5)
- **Inicio de sesión con Google** (OAuth)
- Registro/login con email + contraseña
- Verificación de email, recuperación de contraseña
- Perfil de usuario, cierre de sesión, protección de rutas

### Fase 2 — Workspaces y estructura

- Crear / cambiar de workspace
- Invitar miembros y roles básicos
- Sidebar de navegación
- Páginas anidadas (CRUD): crear, renombrar, mover, anidar, borrar
- Íconos y portadas (cover) de página
- Papelera (archivar / restaurar)

### Fase 3 — Editor de bloques (núcleo)

- Integrar BlockNote (sobre TipTap)
- Tipos de bloque: texto, encabezados (H1–H3), listas, to-do, toggle, cita,
  callout, código, divisor, imagen, embed, tabla simple
- Menú de barra `/` (slash commands)
- Arrastrar y soltar para reordenar bloques (dnd-kit)
- Subida de imágenes/archivos (S3/MinIO)
- Atajos de teclado y formato en línea (negrita, cursiva, enlaces, color)

### Fase 4 — Bases de datos tipo Notion

- Definir propiedades (texto, número, select, multiselect, fecha, checkbox, persona, url, relación)
- Filas como páginas con valores de propiedad
- **Vistas**: tabla, tablero kanban, calendario, lista, galería
- Filtros, ordenación y agrupación
- Bases de datos en línea (inline) dentro de páginas

### Fase 5 — Colaboración en tiempo real

- Servidor Hocuspocus + Yjs
- Edición concurrente de la misma página
- Presencia y cursores de otros usuarios
- Comentarios en bloques y menciones (@usuario)
- Persistencia del documento Yjs y resolución de conflictos (CRDT)

### Fase 6 — Permisos y compartición

- Niveles de permiso (lectura / comentario / edición / total)
- Compartir página con usuarios concretos
- Enlaces públicos de solo lectura
- Invitaciones y gestión de accesos

### Fase 7 — Pulido y extras

- Búsqueda global (Postgres full-text → Meilisearch)
- Favoritos, recientes, plantillas
- Exportar (Markdown / PDF)
- Modo oscuro, paleta de comandos (Cmd+K)
- Notificaciones

### Fase 8 — Infraestructura y despliegue _(a definir contigo)_

- Dockerización (app + Postgres + Redis + MinIO + Hocuspocus)
- Reverse proxy con HTTPS (Caddy o Nginx)
- Backups automáticos de la base de datos
- Pipeline de despliegue (GitHub Actions → VPS)
- Observabilidad (logs, métricas, errores)

---

## 6. Estructura de carpetas inicial (propuesta)

```
qubi/
├─ src/
│  ├─ app/                # Rutas (App Router): (auth), (app), api/
│  ├─ components/         # UI reutilizable (shadcn + propios)
│  ├─ features/           # Lógica por dominio: editor, database, workspace, auth
│  ├─ lib/                # db (prisma), auth, storage, utils
│  ├─ server/             # Server actions, servicios, validaciones (zod)
│  └─ styles/
├─ prisma/                # schema.prisma, migraciones, seed
├─ collab/                # Servidor Hocuspocus (tiempo real)
├─ public/
├─ docker-compose.yml     # Postgres + Redis + MinIO (desarrollo)
├─ .env.example
└─ PLAN.md
```

---

## 7. Primeros pasos concretos (Fase 0)

1. Scaffolding de Next.js + TypeScript + Tailwind + ESLint.
2. Instalar y configurar shadcn/ui.
3. `docker-compose.yml` con PostgreSQL (+ Redis y MinIO) para desarrollo local.
4. Configurar Prisma, conectar a Postgres y primer `schema.prisma` (User + Auth.js).
5. Inicializar Git, `.gitignore`, `.env.example`, README.
6. Primer commit y CI básico (lint + build).

---

## 8. Riesgos y notas

- **La colaboración en tiempo real (Fase 5) es la parte más compleja.** Conviene
  diseñar el almacenamiento de bloques desde Fase 3 pensando en Yjs para no rehacerlo.
- **El editor de bloques es el corazón del producto.** BlockNote ahorra meses frente
  a construirlo desde cero con ProseMirror puro.
- Mantener **un esquema de permisos coherente** desde el principio (incluso si v1 es
  simple) evita migraciones dolorosas.
- El despliegue en el VPS se concreta en Fase 8 según recursos del servidor.
