const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configurer la vérification du serveur')
    .addChannelOption(opt =>
      opt.setName('channel').setDescription('Salon de vérification').setRequired(true))
    .addRoleOption(opt =>
      opt.setName('role').setDescription('Rôle à donner après vérification').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const guild = interaction.guild;
    const channel = interaction.options.getChannel('channel');
    const role = interaction.options.getRole('role');
    const verifyUrl = `${config.web.url}/verify/${guild.id}`;

    const existing = db.prepare('SELECT * FROM servers WHERE guild_id = ?').get(guild.id);
    if (existing) {
      db.prepare('UPDATE servers SET verified_role_id = ?, verify_channel_id = ?, owner_id = ? WHERE guild_id = ?')
        .run(role.id, channel.id, interaction.user.id, guild.id);
    } else {
      db.prepare('INSERT INTO servers (guild_id, owner_id, verified_role_id, verify_channel_id) VALUES (?, ?, ?, ?)')
        .run(guild.id, interaction.user.id, role.id, channel.id);
    }

    const embed = new EmbedBuilder()
      .setTitle(`Vérification - ${guild.name}`)
      .setDescription(
        `**Bienvenue sur ${guild.name} !**\n\n` +
        `Pour accéder à tout le serveur, vous devez vous vérifier.\n` +
        `Cliquez sur le bouton ci-dessous pour commencer.`
      )
      .setColor(0x5865f2)
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .setFooter({ text: 'Vérification obligatoire' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Vérifier')
        .setURL(verifyUrl)
        .setStyle(ButtonStyle.Link)
        .setEmoji('✅')
    );

    try {
      const msg = await channel.send({ embeds: [embed], components: [row] });
      db.prepare('UPDATE servers SET verify_message_id = ? WHERE guild_id = ?').run(msg.id, guild.id);

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('✅ Configuration terminée')
            .setDescription(
              `**Salon :** ${channel}\n**Rôle :** ${role}\n**Lien :** ${verifyUrl}\n\nLe message de vérification a été envoyé.`
            )
            .setColor(0x57f287)
        ],
        ephemeral: true
      });
    } catch (error) {
      console.error('[SETUP] Erreur:', error);
      await interaction.reply({
        embeds: [new EmbedBuilder().setTitle('❌ Erreur').setDescription(`Impossible d'envoyer le message dans ${channel}.`).setColor(0xed4245)],
        ephemeral: true
      });
    }
  },
};
