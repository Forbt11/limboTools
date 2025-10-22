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
  global: true,
  data: new SlashCommandBuilder()
    .setName('globalban')
    .setDescription('Ban a user across all servers the bot is in.')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('The user to ban')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the ban')
        .setRequired(false)),

  async execute(interaction) {
    const client = interaction.client; // Use this instead of passing client manually
    const target = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const guilds = client.guilds.cache.map(g => g);
    let successfulBans = 0;
    const summary = [];

    for (const g of guilds) {
      try {
        const me = g.members.cache.get(client.user.id) || await g.members.fetch(client.user.id).catch(() => null);
        if (!me) continue;
        if (!me.permissions.has('BanMembers')) continue;
        if (g.ownerId === target.id) continue;

        await g.members.ban(target.id, { reason }).catch(() => null);
        successfulBans++;

        recordedBans[target.id] = recordedBans[target.id] || [];
        recordedBans[target.id].push({
          guild: g.id,
          time: new Date().toISOString(),
          reason,
          by: interaction.user.id,
          username: target.tag
        });

        summary.push(`**${g.name}** — Reason: ${reason}`);
      } catch {
        summary.push(`**${g.name}**`);
      }
    }

    saveBans();

    const embed = new EmbedBuilder()
      .setTitle(`Global Ban Attempted`)
      .setDescription(`**${target.tag}**\nID ${target.id}`)
      .setColor('Red')
      .addFields(
        { name: 'Banned In', value: `**${successfulBans} server(s)**` },
        { name: 'Details', value: summary.join('\n') }
      )
      .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 1024 }))
      .setFooter({ text: `By: ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
