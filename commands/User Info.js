const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const bansFile = path.join(__dirname, '../bans.json');

// Load global bans
let recordedBans = {};
if (fs.existsSync(bansFile)) {
  recordedBans = JSON.parse(fs.readFileSync(bansFile, 'utf8'));
}

module.exports = {
  locked: true,
   global: true,
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Displays information about a user')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('The user to get info on')
        .setRequired(true)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('target');
    const guild = interaction.guild;

    let member;
    let status = 'Not in Server';
    let roles = 'N/A';
    let displayName = target.username;
    let avatarURL = target.displayAvatarURL({ dynamic: true, size: 1024 });

    try {
      member = await guild.members.fetch(target.id);
      status = 'In Server';
      displayName = member.nickname || target.username; // server nickname if exists
      avatarURL = member.displayAvatarURL({ dynamic: true, size: 1024 }); // server avatar if available
      roles = member.roles.cache
        .filter(r => r.id !== guild.id)
        .map(r => `<@&${r.id}>`)
        .join(', ') || 'No roles';
    } catch {
      if (recordedBans[target.id]) {
        status = 'Globally Banned';
      } else {
        status = 'Not in Server';
      }
    }

    const embed = new EmbedBuilder()
      .setTitle(`${displayName} - (@${target.tag})`)
      .setThumbnail(avatarURL)
      .addFields(
        { name: 'ID', value: target.id, inline: true },
        { name: 'Status', value: status, inline: true },
        { name: 'Roles', value: roles }
      )
      .setColor('Blue')
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: false });
  }
};
