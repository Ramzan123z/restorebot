const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('backup')
    .setDescription('Sauvegarder tous les membres du serveur')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const guild = interaction.guild;
    db.prepare('INSERT OR IGNORE INTO servers (guild_id, owner_id) VALUES (?, ?)').run(guild.id, interaction.user.id);

    await interaction.deferReply({ ephemeral: true });
    let count = 0;
    const now = Math.floor(Date.now() / 1000);

    try {
      const members = await guild.members.fetch({ withUser: true });
      for (const member of members) {
        if (member.user.bot) continue;
        db.prepare(`
          INSERT OR REPLACE INTO members (id, guild_id, username, discriminator, avatar, roles, joined_at, backed_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          member.user.id, guild.id, member.user.username, member.user.discriminator || '0',
          member.user.displayAvatarURL({ dynamic: true }),
          JSON.stringify(member.roles.cache.map(r => r.id).filter(id => id !== guild.id)),
          member.joinedAt ? Math.floor(member.joinedAt.getTime() / 1000) : null, now
        );
        count++;
      }

      await interaction.editReply({
        embeds: [new EmbedBuilder().setTitle('✅ Backup terminée').setDescription(`**${count}** membres sauvegardés.`).setColor(0x57f287).setTimestamp()]
      });
    } catch (error) {
      console.error('[BACKUP] Erreur:', error);
      await interaction.editReply({
        embeds: [new EmbedBuilder().setTitle('❌ Erreur').setDescription('Erreur lors de la sauvegarde.').setColor(0xed4245)]
      });
    }
  },
};
