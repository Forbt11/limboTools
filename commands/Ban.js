const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
  locked: true, // Only allowed roles from .env can use this command
   global: true,
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user from this server.')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('The user to ban')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the ban')
        .setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    // Only allow members with Administrator permission
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: 'You need Administrator permissions to use this command.', ephemeral: true });
    }

    // Fetch the member in this server
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) return interaction.reply({ content: 'User not found in this server.', ephemeral: true });
    if (!member.bannable) return interaction.reply({ content: 'I cannot ban this user (role hierarchy or permissions).', ephemeral: true });

    await member.ban({ reason });

    // Embed version
    const embed = new EmbedBuilder()
      .setTitle('User Banned')
      .setColor('Red')
      .setDescription(`**${target.tag}** has been banned from this server.`)
      .addFields({ name: 'Reason', value: reason })
      .setFooter({ text: `By: ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: false });
  }
};
