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

    # La subida de imágenes pasa por la app: permite cuerpos grandes.
    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3600;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Colaboración en tiempo real (WebSocket Hocuspocus). NO se reescribe la ruta:
    # el provider v4 conecta a la URL tal cual y manda el nombre del doc por protocolo.
    location /collab {
        proxy_pass http://127.0.0.1:1234;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }

    # Archivos públicos (MinIO). La barra final quita el prefijo /files.
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

## 5. Cuentas de invitado y datos de demostración (en producción)

Para que cualquiera pueda entrar a ver la app sin pedir acceso, hay dos cuentas
de invitado con datos reales de ejemplo. Se crean ejecutando el seed **una vez**
en el VPS (y se puede repetir cuando se quiera refrescar la demo):

```bash
cd /opt/qubi && docker compose -f docker-compose.prod.yml run --rm seed
```

| Cuenta     | Correo                        | Rol             |
| ---------- | ----------------------------- | --------------- |
| Manager    | `invitado.admin@qubi.local`   | `OWNER` (admin) |
| Trabajador | `invitado.miembro@qubi.local` | `MEMBER`        |

Contraseña de ambas: `QubiDemo2026!` (se muestra en la pantalla de login).

El trabajador pertenece al equipo del manager, así que desde la cuenta de
manager se ve su producción, sus horas y sus avances; y desde la del trabajador
se ve el feedback del manager. El seed deja contenido en todas las pantallas:
3 proyectos, 19 tareas en los tres estados, avances con evidencia, 4 semanas de
horas, sesiones de cronómetro (incluida una descartada por corta), chat 1 a 1 y
por proyecto, notificaciones, bases de datos de archivos, páginas, favoritos y
papelera.

> El servicio `seed` está detrás de un perfil de Compose, así que **no** se
> ejecuta en los despliegues automáticos. Solo toca el espacio `qubi-demo` y las
> cuentas de invitado: los datos reales de otros espacios no se tocan.
>
> Depende de que `migrate` haya terminado: si lo lanzas con un despliegue a
> medias, espera a que las migraciones estén aplicadas en vez de sembrar contra
> el esquema viejo (eso dejaba la demo a medio crear).

## Comandos útiles (en el VPS)

```bash
cd /opt/qubi
docker compose -f docker-compose.prod.yml logs -f app      # logs de la app
docker compose -f docker-compose.prod.yml logs -f collab   # logs de colaboración
docker compose -f docker-compose.prod.yml ps               # estado
docker compose -f docker-compose.prod.yml restart app
docker compose -f docker-compose.prod.yml run --rm seed    # refrescar la demo
```

## Notas

- Las migraciones se aplican solas (servicio `migrate`) en cada despliegue.
- `NEXT_PUBLIC_COLLAB_URL` se incrusta en el build; si cambias el dominio, hay que
  reconstruir (`up -d --build`).
- Google OAuth: rellena `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` en el `.env` y añade
  como URI de redirección `https://qubi.tudominio.com/api/auth/callback/google`.
