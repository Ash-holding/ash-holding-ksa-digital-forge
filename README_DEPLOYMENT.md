# ASH HOLDING — Self-Hosted Deployment Guide

Full stack: **React (TanStack Start) + Node/Express + Prisma + PostgreSQL + Nginx**, all self-hosted via Docker Compose. No Supabase, Firebase, or third-party BaaS.

---

## 1. Server prerequisites (Ubuntu 22.04+)

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg ufw

# Docker + Compose plugin
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Firewall
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

Log out / back in for the docker group to apply.

## 2. Clone and configure

```bash
git clone <your-repo-url> ash-holding
cd ash-holding
cp backend/.env.example backend/.env
```

Edit `backend/.env` and set:

- `DATABASE_URL` — point at the `postgres` service (default works with compose)
- `JWT_SECRET` — 64+ random chars (`openssl rand -hex 32`)
- `COOKIE_SECRET` — 32+ random chars
- `CORS_ORIGIN` — your public domain (e.g. `https://ashholding.sa`)
- `SEED_ADMIN_PASSWORD` — set a strong initial admin password
- `UPLOAD_DIR` — leave at `/data/uploads` unless you mount elsewhere
- `MAX_UPLOAD_MB` — max upload size in MB (default 25)

Also set `POSTGRES_PASSWORD` in a top-level `.env` (used by `docker-compose.yml`).

## 3. Bring the stack up

```bash
docker compose build
docker compose up -d
```

Services started:

| Service   | Purpose                                  | Internal port |
| --------- | ---------------------------------------- | ------------- |
| postgres  | PostgreSQL 16 database                   | 5432          |
| redis     | Redis (sessions/queues, optional)        | 6379          |
| backend   | Node/Express API + Prisma                | 4000          |
| frontend  | React app (TanStack Start SSR)           | 3000          |
| nginx     | Reverse proxy + TLS termination          | 80 / 443      |

## 4. Database migrations & seed

The backend container automatically runs `prisma migrate deploy` on start.
To seed the initial admin + demo client + service catalog:

```bash
docker compose exec backend npx prisma db seed
```

Default admin credentials come from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in `backend/.env`. **Change them immediately after first login.**

## 5. Nginx & TLS

`nginx.conf` is a starting point. For HTTPS, generate a certificate with Certbot:

```bash
sudo apt install -y certbot
sudo certbot certonly --standalone -d ashholding.sa -d www.ashholding.sa
# copy fullchain.pem + privkey.pem into ./nginx/certs/
docker compose restart nginx
```

Renewal:

```bash
sudo certbot renew --pre-hook "docker compose stop nginx" \
                   --post-hook "docker compose start nginx"
```

## 6. File uploads

Uploaded files are stored on disk inside the `uploads` Docker volume, mounted at `/data/uploads` in the backend container and served through Express at `/uploads/*` (proxied by Nginx). The path is configurable via `UPLOAD_DIR` in `backend/.env`.

Back up the volume regularly:

```bash
docker run --rm -v ash-holding_uploads:/data -v $PWD:/backup alpine \
  tar czf /backup/uploads-$(date +%F).tar.gz -C /data .
```

## 7. Database backups

```bash
docker compose exec -T postgres pg_dump -U ash ash_holding \
  | gzip > backups/db-$(date +%F).sql.gz
```

Add to cron for daily off-site copies.

## 8. Updating

```bash
git pull
docker compose build
docker compose up -d
```

The backend container re-applies pending Prisma migrations on start.

## 9. API surface

All API routes are under `/api/` and require a JWT bearer token (or `ash_token` cookie) unless noted.

| Path                              | Roles                          |
| --------------------------------- | ------------------------------ |
| `POST /api/auth/register`         | public                         |
| `POST /api/auth/login`            | public                         |
| `POST /api/auth/logout`           | authenticated                  |
| `GET  /api/auth/me`               | authenticated                  |
| `GET  /api/clients`               | ADMIN, SUPPORT, ACCOUNTANT     |
| `GET  /api/clients/me`            | authenticated                  |
| `GET  /api/clients/me/overview`   | authenticated (CLIENT)         |
| `GET/POST/PATCH/DELETE /api/projects[/:id]`  | scoped by role      |
| `GET/POST/PATCH/DELETE /api/invoices[/:id]`  | scoped by role      |
| `GET/POST/PATCH/DELETE /api/contracts[/:id]` | scoped by role      |
| `GET/POST/PATCH /api/support/tickets[/:id]`  | scoped by role      |
| `POST /api/support/tickets/:id/messages`     | ticket participants |
| `GET/POST/DELETE /api/files[/upload]`        | scoped by role      |

## 10. Security checklist

- [ ] Change `JWT_SECRET`, `COOKIE_SECRET`, `POSTGRES_PASSWORD`, and `SEED_ADMIN_PASSWORD` from defaults
- [ ] Restrict `CORS_ORIGIN` to your real domains
- [ ] Enable HTTPS in Nginx
- [ ] Restrict database port 5432 to the docker network only (default in compose)
- [ ] Enable automated backups (DB + uploads volume)
- [ ] Configure log rotation and monitoring (e.g. Grafana / Uptime Kuma)
