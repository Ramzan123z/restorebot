const fs = require('fs');
const path = require('path');
require('dotenv').config();

const NGROK_FILE = path.join(__dirname, '.ngrok-url');

async function start() {
  const authtoken = process.env.NGROK_AUTHTOKEN;
  if (!authtoken) {
    console.error('======================================================');
    console.error('  Il manque NGROK_AUTHTOKEN dans le fichier .env');
    console.error('');
    console.error('  1. Crée un compte GRATUIT sur https://dashboard.ngrok.com');
    console.error('  2. Va dans "Your Authtoken"');
    console.error('  3. Copie le token et mets-le dans .env :');
    console.error('     NGROK_AUTHTOKEN=ton_token');
    console.error('======================================================');
    process.exit(1);
  }

  const { connect } = require('ngrok');
  console.log('[NGROK] Démarrage du tunnel...');
  const url = await connect({ authtoken, addr: process.env.WEB_PORT || 3000 });
  console.log(`[NGROK] ✅ Tunnel actif : ${url}`);
  fs.writeFileSync(NGROK_FILE, url);

  console.log('\nAjoute ces redirect URIs dans Discord Developer Portal (OAuth2 > Redirects) :');
  console.log(`  ${url}/auth/callback`);
  console.log(`  ${url}/verify/callback`);
  console.log('\n(Si le portail est déjà configuré avec une autre URL, remplace-la par celle-ci)');
  console.log('\n⚠️  Ne ferme plus cette fenêtre : elle garde le tunnel ouvert.');
}

start().catch(e => {
  console.error('[NGROK] Erreur:', e.message);
  if (e.message.includes('authtoken') || e.message.includes('401')) {
    console.error('Index: ton authtoken est invalide. Vérifie NGROK_AUTHTOKEN dans .env');
  }
  process.exit(1);
});