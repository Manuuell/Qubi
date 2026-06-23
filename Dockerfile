# syntax=docker/dockerfile:1
# ============================================================
# Qubi — imagen de producción.
#   deps    -> instala dependencias
#   tooling -> deps + código + cliente Prisma (para migraciones y colaboración)
#   builder -> compila Next.js (salida standalone)
#   runner  -> runtime mínimo de la app Next.js
# ============================================================

# 1) Dependencias
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 2) Tooling: código + cliente Prisma generado (sin compilar Next).
#    Lo usan los servicios "migrate" (prisma migrate deploy) y "collab" (tsx).
FROM node:22-slim AS tooling
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate

# 3) Build de Next.js
FROM tooling AS builder
ENV NEXT_TELEMETRY_DISABLED=1
# Las variables NEXT_PUBLIC_* se incrustan en build time: hay que pasarlas como ARG.
ARG NEXT_PUBLIC_COLLAB_URL="ws://localhost:1234"
ENV NEXT_PUBLIC_COLLAB_URL=$NEXT_PUBLIC_COLLAB_URL
# Valores ficticios: el build no toca la BD (rutas dinámicas), pero algunas
# librerías esperan que las variables existan.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV AUTH_SECRET="build-only-secret"
RUN npm run build

# 4) Runtime mínimo de la app (salida standalone)
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
