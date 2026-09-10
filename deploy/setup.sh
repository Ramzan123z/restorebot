#!/bin/bash
# ============================================================
#  Installation auto du bot sur Oracle Cloud (Ubuntu 22.04+)
#  Lance :  sudo bash setup.sh  (avec ton token Discord)
# ============================================================
set -e

# ---------- VARIABLES À PERSONNALISER ----------
DISCORD_TOKEN="TAILLE_TON_TOKEN_DISCORD"       # Obligatoire
CLIENT_ID="TAILLE_TON_CLIENT_ID"               # Ex : 1547303324263391382
CLIENT_SECRET="TAILLE_TON_CLIENT_SECRET"       # Le client secret Discord
DOMAIN="tauduck.duckdns.org"                   # Ton sous-domaine DuckDNS
SESSION_SECRET=$(openssl rand -hex 32)         # Auto-généré
# ----------------------------------------------

echo "=== [1/7] Mise à jour du système ==="
export DEBIAN_FRONTEND=noninteractive
apt-get update -y && apt-get upgrade -y

echo "=== [2/7] Installation de Node.js 20, git, caddy ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs git

# Caddy (reverse proxy HTTPS automatique)
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt-get update -y
apt-get install -y caddy

echo "=== [3/7] Récupération du code ==="
mkdir -p /opt/restorebot
cd /opt/restorebot

# Si le dossier est vide, clone depuis ton repo GitHub
if [ ! -f /opt/restorebot/package.json ]; then
  echo "Entre l'URL de ton repo GitHub (ex: https://github.com/user/restorebot.git) :"
  read -r REPO_URL
  git clone "$REPO_URL" .
fi

echo "=== [4/7] Installation des dépendances ==="
npm install --omit=dev --production

echo "=== [5/7] Configuration (.env) ==="
cat > /opt/restorebot/.env <<EOF
BOT_TOKEN=$DISCORD_TOKEN
CLIENT_ID=$CLIENT_ID
CLIENT_SECRET=$CLIENT_SECRET
WEB_PORT=3000
WEB_URL=https://$DOMAIN
SESSION_SECRET=$SESSION_SECRET
EOF

echo "=== [6/7] Service système (auto-démarrage + redémarrage) ==="
cat > /etc/systemd/system/restorebot.service <<UNIT
[Unit]
Description=RestoreBot - Verification Discord
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/restorebot
ExecStart=/usr/bin/node start.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable restorebot
systemctl start restorebot

echo "=== [7/7] Reverse proxy HTTPS (Caddy) ==="
cat > /etc/caddy/Caddyfile <<CADDY
$DOMAIN {
    reverse_proxy 127.0.0.1:3000
}
CADDY
systemctl restart caddy

# Autoriser 80 et 443 dans le firewall (Oracle bloque par défaut)
apt-get install -y iptables-persistent
iptables -I INPUT 6 -p tcp --dport 80 -j ACCEPT
iptables -I INPUT 6 -p tcp --dport 443 -j ACCEPT
netfilter-persistent save

echo ""
echo "==========================================================="
echo "  ✅ INSTALLATION TERMINÉE"
echo "==========================================================="
echo "  Bot   : systemctl status restorebot"
echo "  Logs  : journalctl -u restorebot -f"
echo "  Site  : https://$DOMAIN"
echo ""
echo "  Ajoute dans Discord Dev Portal (OAuth2 > Redirects) :"
echo "  - https://$DOMAIN/auth/callback"
echo "  - https://$DOMAIN/verify/callback"
echo ""
echo "  ⚠️  Fais pointer ton DuckDNS vers IP publique de la VM"
echo "==========================================================="