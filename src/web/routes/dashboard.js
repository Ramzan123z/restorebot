const express = require('express');
const fetch = require('node-fetch');
const config = require('../../../config');

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/');
  next();
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
    if (!user) return res.redirect('/');

    const guildsRes = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: { Authorization: `Bearer ${user.access_token}` },
    });
    const guilds = await guildsRes.json();
    const managedGuilds = guilds.filter(g => (parseInt(g.permissions) & 0x20) === 0x20);

    const serverConfigs = {};
    for (const g of managedGuilds) {
      serverConfigs[g.id] = db.prepare('SELECT * FROM servers WHERE guild_id = ?').get(g.id);
    }

    res.render('dashboard', { user: req.session.user, guilds: managedGuilds, serverConfigs, config });
  } catch (error) {
    console.error('[DASHBOARD] Erreur:', error);
    res.redirect('/');
  }
});

router.get('/server/:guildId', requireAuth, async (req, res) => {
  const guildId = req.params.guildId;
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
    const guildsRes = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: { Authorization: `Bearer ${user.access_token}` },
    });
    const guilds = await guildsRes.json();
    const guild = guilds.find(g => g.id === guildId);
    if (!guild) return res.redirect('/dashboard');

    const server = db.prepare('SELECT * FROM servers WHERE guild_id = ?').get(guildId);
    const members = db.prepare('SELECT * FROM members WHERE guild_id = ?').all(guildId);
    const blacklist = db.prepare('SELECT * FROM blacklist WHERE guild_id = ?').all(guildId);
    const logs = db.prepare('SELECT * FROM verify_logs WHERE guild_id = ? ORDER BY created_at DESC LIMIT 50').all(guildId);

    res.render('server', { user: req.session.user, guild, server, members, blacklist, logs, config });
  } catch (error) {
    console.error('[DASHBOARD] Erreur:', error);
    res.redirect('/dashboard');
  }
});

module.exports = router;
