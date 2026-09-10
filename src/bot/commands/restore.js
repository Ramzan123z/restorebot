const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const config = require('../../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('restore')
    .setDescription('Restaurer les membres sauvegardés')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const guild = interaction.guild;
    const members = db.prepare('SELECT * FROM members WHERE guild_id = ?').all(guild.id);

    if (members.length === 0) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setDescription('❌ Aucun membre sauvegardé. Utilisez `/backup` d\'abord.').setColor(0xed4245)],
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });
    let restored = 0, failed = 0;

    for (const member of members) {
      try {
        const discordMember = await guild.members.fetch(member.id).catch(() => null);
        if (discordMember) { restored++; continue; }

        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(member.id);
        if (!user || !user.access_token) { failed++; continue; }

        const response = await fetch(`https://discord.com/api/v10/guilds/${guild.id}/members/${member.id}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bot ${config.bot.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: user.access_token }),
        });

        if (response.ok) {
          restored++;
          if (member.roles) {
            try {
              const roles = JSON.parse(member.roles);
              const newMember = await guild.members.fetch(member.id);
              for (const roleId of roles) {
                const role = guild.roles.cache.get(roleId);
                if (role && role.editable) await newMember.roles.add(role).catch(() => {});
              }
            } catch (e) {}
          }
        } else { failed++; }
      } catch (error) { failed++; }
    }

    await interaction.editReply({
      embeds: [new EmbedBuilder().setTitle('✅ Restauration terminée')
        .setDescription(`**${restored}** restaurés, **${failed}** échoués.`)
        .setColor(0x57f287).setTimestamp()]
    });
  },
};
