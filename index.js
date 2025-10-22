require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');

// Create the Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Load commands
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    console.log(`Loaded command: ${command.data.name}`);
  }
}

// Role & permission setup
const MAIN_SERVER_ID = process.env.MAIN_SERVER_ID;
const ALL_ALLOWED_ROLE_IDS = process.env.ALLOWED_ROLE_IDS.split(','); 
const LOCKED_GLOBALBAN_ROLES = process.env.GLOBALBAN_ROLE_IDS.split(',');

// Handle slash commands
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  // Permission check for locked commands
  if (command.locked) {
    if (command.global) {
      // Global commands: check roles in MAIN_SERVER_ID
      const mainGuild = await client.guilds.fetch(MAIN_SERVER_ID);
      const memberInMain = await mainGuild.members.fetch(interaction.user.id).catch(() => null);
      const hasRole = memberInMain?.roles.cache.some(r => ALL_ALLOWED_ROLE_IDS.includes(r.id));
      if (!hasRole)
        return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    } else {
      // Guild-only commands: check roles in the current guild
      const memberInGuild = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
      const hasRole = memberInGuild?.roles.cache.some(r => ALL_ALLOWED_ROLE_IDS.includes(r.id));
      if (!hasRole)
        return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }
  }

  // GlobalBan permission check
  if (command.data.name === 'globalban') {
    const mainGuild = await client.guilds.fetch(MAIN_SERVER_ID);
    const memberInMain = await mainGuild.members.fetch(interaction.user.id).catch(() => null);
    const canUseGlobalBan = memberInMain?.roles.cache.some(r => LOCKED_GLOBALBAN_ROLES.includes(r.id));
    if (!canUseGlobalBan)
      return interaction.reply({ content: 'Only Senior Mods+ can use GlobalBan.', ephemeral: true });
  }

  // Execute command
  try {
    await command.execute(interaction, client);
  } catch (err) {
    console.error(err);
    if (!interaction.replied) {
      await interaction.reply({ content: 'There was an error executing that command.', ephemeral: true });
    }
  }
});


// Start the bot
console.log("Starting bot...");
client.login(process.env.TOKEN)
  .then(() => console.log("Bot logged in successfully!"))
  .catch(err => {
    console.error("Failed to log in:", err);
    process.exit(1);
  });
