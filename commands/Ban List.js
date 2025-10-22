const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  locked: true,
  global: true,
  data: new SlashCommandBuilder()
    .setName('banlist')
    .setDescription('Show the list of globally banned users'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false }); // prevents timeout

    const MAIN_SERVER_ID = process.env.MAIN_SERVER_ID;
    const ALLOWED_ROLE_IDS = process.env.ALLOWED_ROLE_IDS.split(',');
    const BYPASS_USER_IDS = [process.env.MY_ID];

    if (!BYPASS_USER_IDS.includes(interaction.user.id)) {
      const mainGuild = await interaction.client.guilds.fetch(MAIN_SERVER_ID);
      const member = await mainGuild.members.fetch(interaction.user.id).catch(() => null);
      const hasRole = member?.roles.cache.some(r => ALLOWED_ROLE_IDS.includes(r.id));

      if (!hasRole) {
        return interaction.editReply({
          content: 'You do not have permission to use this command.'
        });
      }
    }

    const bansFile = path.join(__dirname, '../bans.json');
    let recordedBans = {};
    if (fs.existsSync(bansFile)) {
      recordedBans = JSON.parse(fs.readFileSync(bansFile, 'utf8'));
    }

    const embed = new EmbedBuilder()
      .setTitle('Global Ban List')
      .setColor('Red')
      .setDescription('Here are all users currently globally banned.');

    if (Object.keys(recordedBans).length === 0) {
      embed.addFields({ name: 'No Bans Found', value: 'The ban list is currently empty.' });
    } else {
      for (const [userId, bans] of Object.entries(recordedBans)) {
        const lastBan = bans[bans.length - 1];
        embed.addFields({
          name: lastBan.username || `User ID: ${userId}`,
          value: `**Reason:** ${lastBan.reason}\n**Type:** Global`
        });
      }
    }

    await interaction.editReply({ embeds: [embed] });
  }
};
