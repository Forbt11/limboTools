const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const bansFile = path.join(__dirname, '../bans.json');

let recordedBans = {};
if (fs.existsSync(bansFile)) {
  recordedBans = JSON.parse(fs.readFileSync(bansFile, 'utf8'));
}

function saveBans() {
  fs.writeFileSync(bansFile, JSON.stringify(recordedBans, null, 2));
}

module.exports = {
locked: true,
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user globally.')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('The user to unban')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for unban')
        .setRequired(false)),

  async execute(interaction, client) {
    const target = interaction.options.getUser('target'); // <-- get the user here
    const reason = interaction.options.getString('reason') || 'No reason provided';

    // Remove global bans from bans.json
    delete recordedBans[target.id];
    saveBans();

    // Create embed
    const embed = new EmbedBuilder()
      .setTitle(`User Unbanned`)
      .setColor('Green')
      .setDescription(`${target.tag} has been unbanned.`) // <-- use target here
      .addFields(
        { name: 'Reason', value: reason },
        { name: 'Unbanned by', value: interaction.user.tag }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: false });
  }
};
