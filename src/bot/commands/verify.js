const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Envoyer le message de vérification'),

  async execute(interaction) {
    const server = db.prepare('SELECT * FROM servers WHERE guild_id = ?').get(interaction.guild.id);
    if (!server) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setDescription('❌ Ce serveur n\'est pas configuré. Utilisez `/setup` d\'abord.').setColor(0xed4245)],
        ephemeral: true,
      });
    }

    const verifyUrl = `${config.web.url}/verify/${interaction.guild.id}`;
    const channel = interaction.guild.channels.cache.get(server.verify_channel_id);
    if (!channel) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setDescription('❌ Le salon de vérification n\'existe plus.').setColor(0xed4245)],
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(`Vérification - ${interaction.guild.name}`)
      .setDescription(`**Bienvenue sur ${interaction.guild.name} !**\n\nPour accéder à tout le serveur, vous devez vous vérifier.\nCliquez sur le bouton ci-dessous.`)
      .setColor(0x5865f2)
      .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
      .setFooter({ text: 'Vérification obligatoire' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('Vérifier').setURL(verifyUrl).setStyle(ButtonStyle.Link).setEmoji('✅')
    );

    try {
      await channel.send({ embeds: [embed], components: [row] });
      await interaction.reply({
        embeds: [new EmbedBuilder().setDescription(`✅ Message envoyé dans ${channel}`).setColor(0x57f287)],
        ephemeral: true,
      });
    } catch (error) {
      await interaction.reply({
        embeds: [new EmbedBuilder().setDescription(`❌ Impossible d'envoyer le message dans ${channel}`).setColor(0xed4245)],
        ephemeral: true,
      });
    }
  },
};
