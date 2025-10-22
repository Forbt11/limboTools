require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Commands
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

// Roles
const MAIN_SERVER_ID = process.env.MAIN_SERVER_ID;
const ALL_ALLOWED_ROLE_IDS = process.env.ALLOWED_ROLE_IDS.split(','); 
const LOCKED_GLOBALBAN_ROLES = process.env.GLOBALBAN_ROLE_IDS.split(','); // from .env

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  // Locked command check (any command with locked: true)
  // For locked commands (only certain roles from main server)
if (command.locked) {
  const mainGuild = await client.guilds.fetch(MAIN_SERVER_ID);
  const memberInMain = await mainGuild.members.fetch(interaction.user.id).catch(() => null);
  const hasRole = memberInMain?.roles.cache.some(r => ALL_ALLOWED_ROLE_IDS.includes(r.id));
  if (!hasRole)
    return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
}

// Extra check for globalban (restricted roles only)
if (command.data.name === 'globalban') {
  const mainGuild = await client.guilds.fetch(MAIN_SERVER_ID);
  const memberInMain = await mainGuild.members.fetch(interaction.user.id).catch(() => null);
  const canUseGlobalBan = memberInMain?.roles.cache.some(r => LOCKED_GLOBALBAN_ROLES.includes(r.id));
  if (!canUseGlobalBan)
    return interaction.reply({ content: 'Only Senior Mods+ can use GlobalBan.', ephemeral: true });
}


  try {
    await command.execute(interaction, client);
  } catch (err) {
    console.error(err);
    await interaction.reply({ content: 'There was an error executing that command.', ephemeral: true });
  }
});

console.log("Starting bot...");
client.login(process.env.TOKEN)
  .then(() => console.log("Bot logged in successfully!"))
  .catch(err => {
    console.error("Failed to log in:", err);
    process.exit(1);
  });
