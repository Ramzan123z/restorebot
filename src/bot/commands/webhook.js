const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('webhook')
    .setDescription('Configurer le webhook de logs')
    .addSubcommand(sub =>
      sub.setName('set').setDescription('Définir l\'URL du webhook')
        .addStringOption(opt => opt.setName('url').setDescription('URL du webhook Discord').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('remove').setDescription('Supprimer le webhook'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    db.prepare('INSERT OR IGNORE INTO servers (guild_id, owner_id) VALUES (?, ?)').run(interaction.guild.id, interaction.user.id);

    if (sub === 'set') {
      const url = interaction.options.getString('url');
      if (!url.includes('discord.com/api/webhooks')) {
        return interaction.reply({ embeds: [new EmbedBuilder().setDescription('❌ URL invalide.').setColor(0xed4245)], ephemeral: true });
      }
      db.prepare('UPDATE servers SET webhook_url = ? WHERE guild_id = ?').run(url, interaction.guild.id);
      await interaction.reply({ embeds: [new EmbedBuilder().setDescription('✅ Webhook configuré.').setColor(0x57f287)], ephemeral: true });
    } else {
      db.prepare('UPDATE servers SET webhook_url = NULL WHERE guild_id = ?').run(interaction.guild.id);
      await interaction.reply({ embeds: [new EmbedBuilder().setDescription('✅ Webhook supprimé.').setColor(0x57f287)], ephemeral: true });
    }
  },
};
