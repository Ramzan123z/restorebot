const express = require('express');
const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Non autorisé' });
  next();
}

router.get('/servers', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM servers WHERE owner_id = ?').all(req.session.user.id));
});

router.get('/servers/:guildId/members', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM members WHERE guild_id = ?').all(req.params.guildId));
});

router.get('/servers/:guildId/logs', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM verify_logs WHERE guild_id = ? ORDER BY created_at DESC LIMIT 100').all(req.params.guildId));
});

router.delete('/servers/:guildId/blacklist/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM blacklist WHERE id = ? AND guild_id = ?').run(req.params.id, req.params.guildId);
  res.json({ success: true });
});

module.exports = router;
