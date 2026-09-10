const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Voir la configuration du serveur')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const server = db.prepare('SELECT * FROM servers WHERE guild_id = ?').get(interaction.guild.id);
    const memberCount = db.prepare('SELECT COUNT(*) as count FROM members WHERE guild_id = ?').get(interaction.guild.id);
    const blacklistCount = db.prepare('SELECT COUNT(*) as count FROM blacklist WHERE guild_id = ?').get(interaction.guild.id);

    if (!server) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setTitle('⚙️ Paramètres').setDescription('Serveur non configuré. Utilisez `/setup`.').setColor(0xfee75c)],
        ephemeral: true,
      });
    }

    const role = interaction.guild.roles.cache.get(server.verified_role_id);
    const channel = interaction.guild.channels.cache.get(server.verify_channel_id);

    const embed = new EmbedBuilder()
      .setTitle(`⚙️ Paramètres - ${interaction.guild.name}`)
      .setColor(0x5865f2)
      .addFields(
        { name: 'Rôle vérifié', value: role ? `<@&${role.id}>` : 'Non défini', inline: true },
        { name: 'Salon vérification', value: channel ? `<#${channel.id}>` : 'Non défini', inline: true },
        { name: 'Webhook', value: server.webhook_url ? '✅ Configuré' : '❌ Non configuré', inline: true },
        { name: 'Membres sauvegardés', value: `${memberCount.count}`, inline: true },
        { name: 'Blacklistés', value: `${blacklistCount.count}`, inline: true },
        { name: 'Lien vérification', value: `[Cliquez ici](${config.web.url}/verify/${interaction.guild.id})` },
      ).setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
