const { Events } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
  name: Events.GuildMemberAdd,
  once: false,
  async execute(member) {
    const server = db.prepare('SELECT * FROM servers WHERE guild_id = ?').get(member.guild.id);
    if (!server || !server.webhook_url) return;

    try {
      await fetch(server.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: 'Nouveau membre',
            description: `${member.user.tag} a rejoint le serveur.`,
            color: 0x57f287,
            thumbnail: { url: member.user.displayAvatarURL({ dynamic: true }) },
            timestamp: new Date().toISOString(),
          }],
        }),
      });
    } catch (e) {
      console.error('[WEBHOOK] Erreur:', e.message);
    }
  },
};
