const express = require('express');
const fetch = require('node-fetch');
const config = require('../../../config');

const router = express.Router();

// Callback FIXE - le guild id passe dans le paramètre `state` (doit être AVANT /:guildId)
router.get('/callback', async (req, res) => {
  const code = req.query.code;
  const guildId = req.query.state;
  const server = guildId ? db.prepare('SELECT * FROM servers WHERE guild_id = ?').get(guildId) : null;

  if (!code || !guildId) return res.render('verify', { error: 'Code invalide', guildId, config, server, success: false, username: null });
  if (!server) return res.render('verify', { error: 'Serveur non configuré', guildId, config, server: null, success: false, username: null });

  try {
    const tokenRes = await fetch('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.bot.clientId,
        client_secret: config.bot.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.web.url + '/verify/callback',
      }),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error) return res.render('verify', { error: 'Erreur d\'autorisation: ' + tokenData.error, guildId, config, server, success: false, username: null });

    const userRes = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userRes.json();

    db.prepare(`INSERT INTO users (id, username, discriminator, avatar, access_token, refresh_token, token_expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userData.id, userData.username, userData.discriminator || '0', userData.avatar || '',
      tokenData.access_token, tokenData.refresh_token, Math.floor(Date.now() / 1000) + tokenData.expires_in);

    const addRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userData.id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bot ${config.bot.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: tokenData.access_token }),
    });

    if (!addRes.ok && addRes.status !== 404) {
      const err = await addRes.json();
      const msg = err.message === 'Missing Permissions' ? 'Le bot n\'a pas la permission d\'ajouter des membres. Vérifiez ses permissions.' : (err.message || 'Erreur');
      return res.render('verify', { error: msg, guildId, config, server, success: false, username: null });
    }

    if (server.verified_role_id) {
      try {
        await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userData.id}/roles/${server.verified_role_id}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bot ${config.bot.token}` },
        });
      } catch (e) {}
    }

    db.prepare('INSERT INTO verify_logs (guild_id, user_id, username, ip, status) VALUES (?, ?, ?, ?, ?)').run(
      guildId, userData.id, userData.username, req.ip, 'success');

    if (server.webhook_url) {
      try {
        await fetch(server.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ embeds: [{
            title: '✅ Membre vérifié',
            description: `**${userData.username}#${userData.discriminator}** s'est vérifié.`,
            color: 0x57f287,
            fields: [{ name: 'ID', value: userData.id, inline: true }, { name: 'IP', value: req.ip, inline: true }],
            timestamp: new Date().toISOString(),
          }] }),
        });
      } catch (e) {}
    }

    res.render('verify', { error: null, success: true, guildId, config, server, username: userData.username });
  } catch (error) {
    console.error('[VERIFY] Erreur:', error);
    res.render('verify', { error: 'Erreur lors de la vérification.', guildId, config, server, success: false, username: null });
  }
});

router.get('/:guildId', (req, res) => {
  const guildId = req.params.guildId;
  const server = db.prepare('SELECT * FROM servers WHERE guild_id = ?').get(guildId);
  if (!server) return res.status(404).render('verify', { error: 'Serveur non configuré', guildId, config, server: null, success: false, username: null });
  res.render('verify', { error: null, guildId, config, server, success: false, username: null });
});

module.exports = router;