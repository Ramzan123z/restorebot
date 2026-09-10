const fs = require('fs');
const path = require('path');
require('dotenv').config();

const NGROK_FILE = path.join(__dirname, '.ngrok-url');

function getPublicUrl() {
  if (fs.existsSync(NGROK_FILE)) {
    const url = fs.readFileSync(NGROK_FILE, 'utf8').trim();
    if (url) return url;
  }
  return process.env.WEB_URL || 'http://localhost:3000';
}

module.exports = {
  bot: {
    token: process.env.BOT_TOKEN,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
  },
  web: {
    port: process.env.WEB_PORT || 3000,
    url: getPublicUrl(),
    sessionSecret: process.env.SESSION_SECRET || 'fallback-secret-change-me',
  },
  scopes: {
    login: ['identify', 'guilds'],
    verify: ['identify', 'guilds.join'],
  },
};