const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const bansFile = path.join(__dirname, '../bans.json');

// Load global bans
let recordedBans = {};
if (fs.existsSync(bansFile)) {
  try {
    recordedBans = JSON.parse(fs.readFileSync(bansFile, 'utf8'));
  } catch (err) {
    console.error('Failed to parse bans.json:', err);
    recordedBans = {};
  }
}

module.exports = {
  locked: true,
  global: true,
  data: new SlashCommandBuilder()
    .setName('banlist')
    .setDescription('Show the list of globally banned users'),

  async execute(interaction) {
    try {
      const MAIN_SERVER_ID = process.env.MAIN_SERVER_ID;
      const ALLOWED_ROLE_IDS = process.env.ALLOWED_ROLE_IDS.split(',');

      // Fetch the main server
      const mainGuild = await interaction.client.guilds.fetch(MAIN_SERVER_ID);
      const member = await mainGuild.members.fetch(interaction.user.id).catch(() => null);
      const hasRole = member?.roles.cache.some(r => ALLOWED_ROLE_IDS.includes(r.id));

      if (!hasRole) {
        return interaction.reply({
          content: 'You do not have permission to use this command.',
          ephemeral: true
        });
      }

      // Build the embed
      const embed = new EmbedBuilder()
        .setTitle('🌐 Global Ban List')
        .setColor('Red');

      if (Object.keys(recordedBans).length === 0) {
        embed.setDescription('The ban list is currently empty.');
      } else {
        embed.setDescription('Here are all users currently globally banned:');
        // Sort users by latest ban date (optional)
        const sortedBans = Object.entries(recordedBans).sort(([, bansA], [, bansB]) => {
          const lastA = new Date(bansA[bansA.length - 1].time);
          const lastB = new Date(bansB[bansB.length - 1].time);
          return lastB - lastA;
        });

        for (const [userId, bans] of sortedBans) {
          const lastBan = bans[bans.length - 1];
          embed.addFields({
            name: lastBan.username || `User ID: ${userId}`,
            value: `**Reason:** ${lastBan.reason}\n**Server Count:** ${bans.length}\n**Last Ban:** <t:${Math.floor(new Date(lastBan.time).getTime() / 1000)}:R>`,
          });
        }
      }

      // Discord embed limits: 25 fields max, truncate if needed
      if (embed.data.fields.length > 25) {
        embed.data.fields = embed.data.fields.slice(0, 25);
        embed.addFields({ name: '...', value: 'Additional bans not shown due to Discord embed limits.' });
      }

      await interaction.reply({ embeds: [embed] });

    } catch (err) {
      console.error('Error in /banlist command:', err);
      if (!interaction.replied) {
        await interaction.reply({
          content: 'An error occurred while fetching the ban list.',
          ephemeral: true
        });
      }
    }
  }
};
