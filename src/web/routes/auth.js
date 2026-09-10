const express = require('express');
const fetch = require('node-fetch');
const config = require('../../../config');

const router = express.Router();

router.get('/auth/login', (req, res) => {
  const url = `https://discord.com/api/oauth2/authorize?client_id=${config.bot.clientId}&redirect_uri=${encodeURIComponent(config.web.url + '/auth/callback')}&response_type=code&scope=${config.scopes.login.join('+')}`;
  res.redirect(url);
});

router.get('/auth/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.redirect('/');

  try {
    const tokenRes = await fetch('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.bot.clientId,
        client_secret: config.bot.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.web.url + '/auth/callback',
      }),
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error) return res.redirect('/');

    const userRes = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userRes.json();

    db.prepare(`INSERT INTO users (id, username, discriminator, avatar, access_token, refresh_token, token_expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      userData.id, userData.username, userData.discriminator || '0', userData.avatar || '',
      tokenData.access_token, tokenData.refresh_token,
      Math.floor(Date.now() / 1000) + tokenData.expires_in
    );

    req.session.user = { id: userData.id, username: userData.username, discriminator: userData.discriminator || '0', avatar: userData.avatar };
    res.redirect('/dashboard');
  } catch (error) {
    console.error('[AUTH] Erreur:', error);
    res.redirect('/');
  }
});

router.get('/auth/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

module.exports = router;
