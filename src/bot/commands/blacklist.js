const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('blacklist')
    .setDescription('Blacklister un utilisateur')
    .addUserOption(opt => opt.setName('user').setDescription('Utilisateur à blacklister').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Raison'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'Aucune raison';

    db.prepare('INSERT INTO blacklist (guild_id, user_id, reason) VALUES (?, ?, ?)').run(interaction.guild.id, user.id, reason);

    await interaction.reply({
      embeds: [new EmbedBuilder().setTitle('⛔ Blacklisté').setDescription(`**${user.tag}** blacklisté.\n**Raison :** ${reason}`).setColor(0xed4245).setTimestamp()],
      ephemeral: true,
    });
  },
};
