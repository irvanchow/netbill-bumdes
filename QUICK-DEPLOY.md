# Quick Deployment Guide - BumDes Billing

Panduan ini mencerminkan kondisi VPS produksi saat ini.

## Info Server (Produksi)

| Item | Nilai |
|---|---|
| IP VPS | `103.133.56.58` |
| User SSH | `root` (key-based auth) |
| Domain | `netbill.bumdesagirimandala.com` |
| Path aplikasi | `/var/www/bumdes-netbill` |
| Env file aktif | `/var/www/bumdes-netbill/.env.local` |
| Nginx config | `/etc/nginx/sites-available/netbill` |
| PM2 app name | `bumdes-netbill` |
| Node.js | v20.x |
| PostgreSQL | 16 (db `bumdes`, user `bumdes`) |
| Git remote | `https://github.com/irvanchow/netbill-bumdes.git` (branch `main`) |

---

## Update Aplikasi (Deployment Rutin)

Alur deploy harian memakai `git pull` langsung di VPS.

### 1. Commit & push dari lokal

```bash
cd C:\PROJECTS\claudecode-project\bumdes-jelijihpunggang
git add <file-yang-diubah>
git commit -m "deskripsi perubahan"
git push origin main
```

### 2. Pull, build, restart di VPS

```bash
ssh root@103.133.56.58 "cd /var/www/bumdes-netbill && git pull origin main && npm run build && pm2 restart bumdes-netbill"
```

### 3. Verifikasi

```bash
ssh root@103.133.56.58 "pm2 status && curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/login"
```

Status `online` dan HTTP `200` berarti deploy sukses. Cek di browser:
`https://netbill.bumdesagirimandala.com`

> **Catatan:** VPS bisa memiliki perubahan uncommitted (mis. file env, aset upload).
> `git pull` akan fast-forward selama file yang diubah tidak bentrok dengan
> file lokal di server. Jika pull ditolak karena konflik, `git stash` dulu
> perubahan lokal di server, pull, lalu `git stash pop` bila perlu.

---

## Setup Awal VPS (Sekali Saja)

Bagian ini hanya untuk provisioning server baru dari nol.

### 1. Login & dependencies

```bash
ssh root@103.133.56.58

# Install stack (Node 20, PostgreSQL 16, Nginx, PM2, Certbot)
/root/setup-vps.sh
/root/setup-database.sh
```

### 2. Clone aplikasi

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/irvanchow/netbill-bumdes.git bumdes-netbill
cd bumdes-netbill
npm install
```

### 3. Setup environment

```bash
cd /var/www/bumdes-netbill
nano .env.local
```

Isi (ganti `PASSWORD_DATABASE` dengan password DB yang dibuat saat setup):

```env
DATABASE_URL=postgresql://bumdes:PASSWORD_DATABASE@localhost:5432/bumdes
NEXTAUTH_URL=https://netbill.bumdesagirimandala.com
NEXTAUTH_SECRET=GENERATE_RANDOM_32_CHARS
CRON_SECRET=GENERATE_RANDOM_32_CHARS
NODE_ENV=production
```

Generate secret:

```bash
openssl rand -base64 32
```

### 4. Migrate database & buat admin

```bash
cd /var/www/bumdes-netbill

# Push schema ke database
npx drizzle-kit push

# Buat user admin
node -e "
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
(async () => {
  const hash = await bcrypt.hash('admin123', 10);
  await pool.query('INSERT INTO users (name, email, password_hash, role) VALUES (\$1, \$2, \$3, \$4)', ['Admin', 'admin@bumdes.id', hash, 'admin']);
  console.log('✅ Admin user created: admin@bumdes.id / admin123');
  await pool.end();
})();
"
```

### 5. Build & jalankan dengan PM2

`ecosystem.config.js` sudah ada di repo (app name `bumdes-netbill`, port 3000).

```bash
cd /var/www/bumdes-netbill
npm run build
pm2 start ecosystem.config.js
pm2 save
pm2 startup
# Jalankan command yang diberikan oleh pm2 startup

pm2 status
pm2 logs bumdes-netbill --lines 20
```

### 6. Setup Nginx

```bash
cat > /etc/nginx/sites-available/netbill << 'EOF'
server {
    listen 80;
    server_name netbill.bumdesagirimandala.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

ln -s /etc/nginx/sites-available/netbill /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

### 7. Setup SSL

```bash
certbot --nginx -d netbill.bumdesagirimandala.com --non-interactive --agree-tos --email your-email@example.com --redirect
```

---

## Cron Jobs Terjadwal

| Job | Jadwal |
|---|---|
| Generate tagihan | Tanggal 1, jam 00:05 |
| Update status pelanggan | Setiap hari, jam 01:00 |
| Backup database | Setiap hari, jam 02:00 |

---

## Troubleshooting

### Aplikasi tidak bisa diakses

```bash
ssh root@103.133.56.58
pm2 logs bumdes-netbill --lines 50
systemctl status nginx
tail -f /var/log/nginx/error.log
```

### Database error

```bash
sudo -u postgres psql -c "\l"
sudo -u postgres psql -d bumdes -c "SELECT * FROM users;"
```

### Port sudah digunakan

```bash
lsof -i :3000
kill -9 <PID>
pm2 restart bumdes-netbill
```

### Build gagal / cache rusak

```bash
cd /var/www/bumdes-netbill
rm -rf .next
npm run build
pm2 restart bumdes-netbill
```
