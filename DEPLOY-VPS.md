# Despliegue de Qubi en el VPS

Despliegue automático con **GitHub Actions**: cada `push` a `main` entra por SSH al
VPS, hace `git pull`, reconstruye y levanta los contenedores.

## Arquitectura en producción

`docker-compose.prod.yml` levanta:

- **postgres** — base de datos (volumen persistente).
- **minio** — almacenamiento de archivos/imágenes.
- **migrate** — aplica las migraciones de Prisma en cada despliegue y termina.
- **app** — Next.js (standalone) escuchando en `127.0.0.1:3600`.
- **collab** — servidor de colaboración Yjs/Hocuspocus en `127.0.0.1:1234`.

`app`, `collab` y `minio` escuchan **solo en localhost**; el **reverse proxy del host**
(nginx) los expone con HTTPS.

## 1. Configuración única en el VPS

```bash
# Docker (si no está): https://docs.docker.com/engine/install/
# Clonar el repo en la ruta que usa el workflow:
sudo mkdir -p /opt/qubi && sudo chown "$USER" /opt/qubi
git clone https://github.com/Manuuell/Qubi.git /opt/qubi
cd /opt/qubi

# Crear el .env de producción (NO se commitea):
cp .env.production.example .env
nano .env      # pon dominio real, contraseñas y AUTH_SECRET (openssl rand -base64 32)

# Primer arranque manual (luego lo hace GitHub Actions):
docker compose -f docker-compose.prod.yml up -d --build
```

## 2. DNS

Crea un registro **A** apuntando `qubi.tudominio.com` → IP del VPS.
(Si usas DuckDNS, usa tu subdominio, p. ej. `qubi.duckdns.org`, y ajusta el `.env`.)

## 3. Reverse proxy del host (nginx) + HTTPS

Crea un vhost (mismo patrón que tus otros proyectos). Enruta la app, el WebSocket
de colaboración (quitando `/collab`) y los archivos de MinIO (quitando `/files`):

```nginx
server {
    server_name qubi.tudominio.com;

    location / {
        proxy_pass http://127.0.0.1:3600;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Colaboración en tiempo real (WebSocket). La barra final quita el prefijo.
    location /collab/ {
        proxy_pass http://127.0.0.1:1234/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }

    # Archivos públicos (MinIO).
    location /files/ {
        proxy_pass http://127.0.0.1:9000/;
        proxy_set_header Host $host;
    }
}
```

Luego activa HTTPS con Certbot:

```bash
sudo certbot --nginx -d qubi.tudominio.com
```

Estas URLs deben coincidir con el `.env`:
`NEXT_PUBLIC_COLLAB_URL=wss://qubi.tudominio.com/collab` y
`S3_PUBLIC_URL=https://qubi.tudominio.com/files`.

## 4. Despliegue automático (GitHub Actions)

`.github/workflows/deploy.yml` se ejecuta en cada push a `main`. Usa estos **secrets**
del repo (ya configurados): `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` (clave privada SSH
cuyo público está en `~/.ssh/authorized_keys` del VPS).

El usuario del VPS debe poder ejecutar `docker` (estar en el grupo `docker`).

## Comandos útiles (en el VPS)

```bash
cd /opt/qubi
docker compose -f docker-compose.prod.yml logs -f app      # logs de la app
docker compose -f docker-compose.prod.yml logs -f collab   # logs de colaboración
docker compose -f docker-compose.prod.yml ps               # estado
docker compose -f docker-compose.prod.yml restart app
```

## Notas

- Las migraciones se aplican solas (servicio `migrate`) en cada despliegue.
- `NEXT_PUBLIC_COLLAB_URL` se incrusta en el build; si cambias el dominio, hay que
  reconstruir (`up -d --build`).
- Google OAuth: rellena `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` en el `.env` y añade
  como URI de redirección `https://qubi.tudominio.com/api/auth/callback/google`.
