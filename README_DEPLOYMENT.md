# نشر ASH HOLDING على VPS خاص

مشروع Self-Hosted بالكامل: **PostgreSQL + Node.js/Express + Prisma + React**، بدون أي اعتماد على Supabase أو Firebase أو أي BaaS خارجي. النشر عبر Docker Compose خلف Nginx كـ Reverse Proxy.

---

## 1. متطلبات الخادم (Ubuntu 22.04+ موصى بها)

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw

# Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# افتح جلسة SSH جديدة أو نفذ:  newgrp docker

# Firewall
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## 2. جلب المشروع

```bash
git clone <your-repo-url> ash-holding
cd ash-holding
cp .env.example .env
nano .env    # عدّل كل المتغيرات، خصوصاً كلمات السر و JWT_SECRET و JWT_REFRESH_SECRET
```

توليد أسرار قوية:
```bash
openssl rand -base64 64   # للـ JWT_SECRET
openssl rand -base64 64   # للـ JWT_REFRESH_SECRET
openssl rand -base64 32   # للـ COOKIE_SECRET
```

## 3. الإطلاق

```bash
docker compose up -d --build
docker compose logs -f backend | head -50
```

عند أول تشغيل، الحاوية الخلفية تنفذ `prisma migrate deploy` تلقائياً. يمكنك زرع البيانات التجريبية:

```bash
docker compose exec backend npm run prisma:seed
```

الآن التطبيق متاح على:
- الموقع الرئيسي: `http://your-server-ip/`
- API: `http://your-server-ip/api/health`
- لوحة الإدارة: `http://your-server-ip/login`

بيانات الدخول الافتراضية (غيّرها فوراً في الإنتاج):

| الدور | البريد | كلمة السر |
|-------|---------|-----------|
| Super Admin | `admin@ashholding.sa` | `Admin@12345` |
| Support | `support@ashholding.sa` | `Support@12345` |
| Accountant | `accountant@ashholding.sa` | `Account@12345` |
| Client | `client@demo.sa` | `Client@12345` |

## 4. النطاق و HTTPS (Let's Encrypt)

```bash
sudo apt install -y certbot
sudo docker compose stop nginx
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com
sudo mkdir -p certs
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem certs/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem certs/
```

في `docker-compose.yml` فك تعليق منفذ 443 وسطر mount للـ certs، وفي `nginx.conf` فك تعليق كتلة `server { listen 443 ssl … }` وضع `server_name your-domain.com;`، ثم:

```bash
docker compose up -d nginx
```

تجديد تلقائي كل شهر عبر cron:
```bash
sudo crontab -e
# أضف السطر التالي:
0 3 1 * * certbot renew --quiet && cp /etc/letsencrypt/live/your-domain.com/*.pem /path/to/ash-holding/certs/ && docker compose -f /path/to/ash-holding/docker-compose.yml restart nginx
```

## 5. النسخ الاحتياطي

قاعدة البيانات:
```bash
# نسخ يدوي
docker compose exec -T postgres pg_dump -U ash ash_holding > backup_$(date +%F).sql

# نسخ يومي عبر cron
0 2 * * * cd /path/to/ash-holding && docker compose exec -T postgres pg_dump -U ash ash_holding | gzip > backups/db_$(date +\%F).sql.gz
```

الملفات المرفوعة:
```bash
docker run --rm -v ashholding_uploads:/data -v $(pwd)/backups:/backup alpine tar czf /backup/uploads_$(date +%F).tar.gz -C /data .
```

## 6. الترقيات

```bash
git pull
docker compose build
docker compose up -d
# ستنفذ migrate deploy تلقائياً عند بدء الـ backend
```

## 7. المراقبة السريعة

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f nginx
docker compose exec postgres psql -U ash ash_holding -c '\dt'
```

## 8. متغيرات البيئة الحرجة

| المتغير | الوصف |
|---------|--------|
| `DATABASE_URL` | مبني تلقائياً من `POSTGRES_*` |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | استخدم قيماً عشوائية قوية (64+ char) |
| `CORS_ORIGIN` | ضع نطاقك الفعلي في الإنتاج |
| `UPLOAD_MAX_MB` | يجب أن يتطابق مع `client_max_body_size` في `nginx.conf` |
| `SEED_*` | افتراضيات التطوير فقط، غيّرها قبل الزرع في الإنتاج |

---

**كل البيانات والملفات محفوظة على خادمك.** لا اعتماد على أي مزود خارجي، ويمكنك نقل المشروع لأي VPS آخر عبر نسخ `docker-compose.yml` و `.env` وملفات مجلد `backups/`.
