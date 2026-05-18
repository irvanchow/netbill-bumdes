#!/bin/bash
# Setup script for BumDes NetBill on Ubuntu 24.04 VPS (1 vCPU, 1GB RAM, 20GB)
# Run as root: sudo bash setup-vps.sh

set -e

echo "=== BumDes NetBill VPS Setup (Ubuntu 24.04) ==="
echo ""

# 1. Create swap (penting untuk build dengan RAM 1GB)
echo "[1/9] Creating 2GB swap file..."
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "Swap created."
else
  echo "Swap already exists, skipping."
fi

# 2. Update system
echo "[2/9] Updating system..."
apt update && apt upgrade -y

# 3. Install Node.js 20
echo "[3/9] Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pm2

# 4. Install PostgreSQL 16
echo "[4/9] Installing PostgreSQL..."
apt install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql

# 5. Setup database
echo "[5/9] Setting up database..."
sudo -u postgres psql -c "CREATE USER bumdes WITH PASSWORD 'GANTI_PASSWORD_INI';"
sudo -u postgres psql -c "CREATE DATABASE bumdes OWNER bumdes;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE bumdes TO bumdes;"

# 6. Install Nginx
echo "[6/9] Installing Nginx..."
apt install -y nginx
systemctl enable nginx

# 7. Install Certbot (SSL)
echo "[7/9] Installing Certbot..."
apt install -y certbot python3-certbot-nginx

# 8. Create app directory
echo "[8/9] Creating app directory..."
mkdir -p /var/www/bumdes-netbill
mkdir -p /var/log/pm2
mkdir -p /var/www/bumdes-netbill/public/uploads/bukti-transfer

# 9. Setup firewall
echo "[9/9] Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo ""
echo "=== Setup selesai! ==="
echo ""
echo "Langkah selanjutnya:"
echo ""
echo "1. Clone repo:"
echo "   cd /var/www/bumdes-netbill"
echo "   git clone https://github.com/USERNAME/REPO.git ."
echo ""
echo "2. Buat file .env.local:"
echo "   nano /var/www/bumdes-netbill/.env.local"
echo ""
echo "   Isi dengan:"
echo "   DATABASE_URL=postgresql://bumdes:GANTI_PASSWORD_INI@localhost:5432/bumdes"
echo "   NEXTAUTH_URL=https://netbill.bumdesjelijihpunggang.com"
echo "   NEXTAUTH_SECRET=$(openssl rand -base64 32)"
echo "   CRON_SECRET=$(openssl rand -base64 16)"
echo ""
echo "3. Install dependencies & build:"
echo "   npm install"
echo "   npm run db:push"
echo "   npm run db:seed"
echo "   npm run build"
echo ""
echo "4. Setup Nginx:"
echo "   cp deploy/nginx.conf /etc/nginx/sites-available/netbill"
echo "   ln -s /etc/nginx/sites-available/netbill /etc/nginx/sites-enabled/"
echo "   rm -f /etc/nginx/sites-enabled/default"
echo "   nginx -t && systemctl reload nginx"
echo ""
echo "5. Setup SSL (pastikan DNS A record sudah pointing ke IP ini):"
echo "   certbot --nginx -d netbill.bumdesjelijihpunggang.com"
echo ""
echo "6. Start app:"
echo "   pm2 start ecosystem.config.js"
echo "   pm2 save"
echo "   pm2 startup"
echo ""
echo "7. Setup backup database (opsional tapi recommended):"
echo "   crontab -e"
echo "   Tambahkan: 0 2 * * * pg_dump -U bumdes bumdes > /var/backups/bumdes-\$(date +\%Y\%m\%d).sql"
echo ""
echo "Done! Akses: https://netbill.bumdesjelijihpunggang.com"
