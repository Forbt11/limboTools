const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const bansFile = path.join(__dirname, '../bans.json');
let recordedBans = {};
if (fs.existsSync(bansFile)) {
  try {
    recordedBans = JSON.parse(fs.readFileSync(bansFile, 'utf8'));
  } catch (err) {
    console.error('Failed to parse bans.json:', err);
    recordedBans = {};
  }
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

    // ✅ Defer the reply to avoid "Unknown interaction" errors
    await interaction.deferReply({ ephemeral: true });

    // ✅ Check if executor has permission
    const allowedRoles = process.env.GLOBALBAN_ROLE_IDS.split(',');
    const mainGuild = await client.guilds.fetch(process.env.MAIN_SERVER_ID);
    const executor = await mainGuild.members.fetch(interaction.user.id).catch(() => null);

    if (!executor?.roles.cache.some(r => allowedRoles.includes(r.id))) {
      console.log(`[GlobalBan] ${interaction.user.tag} tried to use GlobalBan without permission`);
      return interaction.editReply({
        content: 'Only Senior Mods+ can use GlobalBan.'
      });
    }

    console.log(`[GlobalBan] ${interaction.user.tag} is attempting to globally ban ${target.tag} (${target.id})`);

    const guilds = client.guilds.cache;
    let successfulBans = 0;
    const summary = [];

    for (const guild of guilds.values()) {
      const guildId = guild.id;
      try {
        const me = await guild.members.fetch(client.user.id);

        if (!me.permissions.has('BanMembers', true)) {
          summary.push(`❌ ${guild.name} (no permission)`);
          console.log(`[GlobalBan] Cannot ban in ${guild.name}: no permission`);
          continue;
        }

        if (guild.ownerId === target.id) {
          summary.push(`❌ ${guild.name} (owner)`);
          console.log(`[GlobalBan] Cannot ban ${target.tag} in ${guild.name}: user is owner`);
          continue;
        }

        const targetMember = await guild.members.fetch(target.id).catch(() => null);
        if (targetMember && !targetMember.bannable) {
          summary.push(`❌ ${guild.name} (cannot ban target)`);
          console.log(`[GlobalBan] Cannot ban ${target.tag} in ${guild.name}: not bannable`);
          continue;
        }

        if (targetMember && me.roles.highest.position <= targetMember.roles.highest.position) {
          summary.push(`❌ ${guild.name} (role too low)`);
          console.log(`[GlobalBan] Cannot ban ${target.tag} in ${guild.name}: bot role too low`);
          continue;
        }

        await guild.members.ban(target.id, { reason }).catch(err => {
          summary.push(`❌ ${guild.name} (${err.message})`);
          console.error(`[GlobalBan] Failed to ban ${target.tag} in ${guild.name}:`, err.message);
        });

        // Record the ban
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
        console.log(`[GlobalBan] Banned ${target.tag} in ${guild.name} (${guildId})`);
        successfulBans++;
      } catch (err) {
        summary.push(`❌ ${guild.name} (${err.message})`);
        console.error(`[GlobalBan] Failed to ban ${target.tag} in ${guild.name}:`, err);
      }
    }

    // Log final summary
    console.log(`[GlobalBan] Attempted global ban of ${target.tag} (${target.id})`);
    console.log(`[GlobalBan] Successful bans: ${successfulBans}/${guilds.size}`);
    console.log(`[GlobalBan] Guild details:\n${summary.join('\n')}`);

    // Build the embed for Discord
    let summaryText = summary.join('\n');
    if (summaryText.length > 1020) summaryText = summaryText.slice(0, 1017) + '...';

    const embed = new EmbedBuilder()
      .setTitle('🌐 Global Ban Attempted')
      .setDescription(`**${target.tag}**\nID: ${target.id}\n**Reason:** ${reason}`)
      .setColor('Red')
      .addFields(
        { name: 'Banned In', value: `**${successfulBans} server(s)**` },
        { name: 'Details', value: summaryText }
      )
      .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 1024 }))
      .setFooter({ text: `By: ${interaction.user.tag}` })
      .setTimestamp();

    // ✅ Send the final embed
    await interaction.editReply({ embeds: [embed] });
  }
};
