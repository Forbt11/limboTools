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
    const client = interaction.client;
    const target = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const guilds = client.guilds.cache; // Only iterate cached guilds
    let successfulBans = 0;
    const summary = [];

    for (const [guildId, guild] of guilds) {
      try {
        const me = await guild.members.fetch(client.user.id);
        if (!me.permissions.has('BanMembers', true)) { // include admin
          summary.push(`❌ ${guild.name} (no permission)`);
          continue;
        }

        if (guild.ownerId === target.id) {
          summary.push(`❌ ${guild.name} (owner)`);
          continue;
        }

        const targetMember = await guild.members.fetch(target.id).catch(() => null);
        if (targetMember && !targetMember.bannable) {
          summary.push(`❌ ${guild.name} (cannot ban target)`);
          continue;
        }

        // Ban by ID (works even if target is not in guild)
        await guild.members.ban(target.id, { reason }).catch(err => {
          summary.push(`❌ ${guild.name} (${err.message})`);
        });

        // Record successful ban
        recordedBans[target.id] = recordedBans[target.id] || [];
        recordedBans[target.id].push({
          guild: guildId,
          time: new Date().toISOString(),
          reason,
          by: interaction.user.id,
          username: target.tag
        });

        saveBans();

        summary.push(`✅ ${guild.name}`);
        successfulBans++;
      } catch (err) {
        summary.push(`❌ ${guild.name} (${err.message})`);
      }
    }

    // Create safe summary string (truncate to 1024 chars max)
    let summaryText = summary.join('\n');
    if (summaryText.length > 1020) summaryText = summaryText.slice(0, 1017) + '...';

    const embed = new EmbedBuilder()
      .setTitle(`Global Ban Attempted`)
      .setDescription(`**${target.tag}**\nID: ${target.id}\n**Reason:** ${reason}`)
      .setColor('Red')
      .addFields(
        { name: 'Banned In', value: `**${successfulBans} server(s)**` },
        { name: 'Details', value: summaryText }
      )
      .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 1024 }))
      .setFooter({ text: `By: ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
