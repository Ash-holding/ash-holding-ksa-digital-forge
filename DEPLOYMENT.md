# ASH HOLDING — VPS Deployment Guide (Ubuntu + Docker)

Self-hosted stack: **PostgreSQL + Redis + Node/Express (Prisma) API + TanStack Start frontend + Nginx**. No external BaaS.

## 1. Prerequisites (Ubuntu 22.04 / 24.04)

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg git ufw
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
sudo ufw allow OpenSSH && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw enable
```

Log out/in so the docker group applies.

## 2. Clone & configure

```bash
git clone <your-repo-url> ash-holding && cd ash-holding
cp backend/.env.example backend/.env
# Edit backend/.env — set strong DATABASE_URL password, JWT_SECRET, COOKIE_SECRET
# Set POSTGRES_PASSWORD in the shell or a root .env file
echo "POSTGRES_PASSWORD=$(openssl rand -hex 24)" > .env
```

Make sure the password in `backend/.env` `DATABASE_URL` matches `POSTGRES_PASSWORD` in `.env`.

## 3. Build & start

```bash
docker compose build
docker compose up -d
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run prisma:seed
```

Services:

| Service   | Port (internal) | Purpose                     |
| --------- | --------------- | --------------------------- |
| nginx     | 80 / 443        | Public reverse proxy        |
| frontend  | 3000            | TanStack Start SSR          |
| backend   | 4000            | Express + Prisma API        |
| postgres  | 5432            | Application database        |
| redis     | 6379            | Cache / sessions / queues   |

Only `nginx` binds host ports — the rest are on the private `ash_net` Docker network.

## 4. HTTPS with Let's Encrypt

```bash
sudo apt install -y certbot
sudo certbot certonly --standalone -d ashholding.sa -d www.ashholding.sa
sudo mkdir -p ./nginx/certs
sudo cp /etc/letsencrypt/live/ashholding.sa/fullchain.pem ./nginx/certs/
sudo cp /etc/letsencrypt/live/ashholding.sa/privkey.pem ./nginx/certs/
```

Uncomment the `443` / `ssl_certificate` lines in `nginx.conf`, then:

```bash
docker compose restart nginx
```

## 5. Common operations

```bash
docker compose logs -f backend        # tail API logs
docker compose exec backend sh        # shell into backend
docker compose exec postgres psql -U ash ash_holding
docker compose exec backend npx prisma studio  # dev only
docker compose exec postgres pg_dump -U ash ash_holding > backup.sql
```

## 6. Roles seeded

- `ADMIN` — full control
- `CLIENT` — portal access to own data
- `SUPPORT` — tickets + read-only clients
- `ACCOUNTANT` — invoices + payments

Default admin credentials from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`. **Rotate on first login.**

## 7. API surface

- `POST /api/auth/login` — email + password → JWT (cookie + JSON)
- `POST /api/auth/logout`
- `GET  /api/auth/me`
- `GET  /api/client/{overview,projects,invoices,contracts,tickets}` — CLIENT role
- `GET  /api/admin/{stats,clients,projects,invoices,contracts,tickets,services,payments,files}` — ADMIN/SUPPORT/ACCOUNTANT

## 8. Data model

Full Prisma schema in `backend/prisma/schema.prisma`. Models: `User`, `Client`, `Service`, `ClientService`, `Project`, `Invoice`, `InvoiceItem`, `Contract`, `SupportTicket`, `TicketMessage`, `Payment`, `File`, `Notification`.

Migrations run automatically on backend start (`prisma migrate deploy`).
