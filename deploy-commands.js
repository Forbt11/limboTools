require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes, Client, GatewayIntentBits } = require('discord.js');

const CLIENT_ID = process.env.CLIENT_ID;
const TOKEN = process.env.TOKEN;
const MAIN_SERVER_ID = process.env.MAIN_SERVER_ID;

// Grab all command files
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

const globalCommands = [];
const guildCommands = [];

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if ('data' in command && 'execute' in command) {
    // Only these 3 commands are global
    if (['globalban', 'unban', 'banlist'].includes(command.data.name)) {
      globalCommands.push(command.data.toJSON());
    } else {
      guildCommands.push(command.data.toJSON());
    }
    console.log(`✅ Loaded command: ${command.data.name}`);
  } else {
    console.warn(`[⚠️] Command ${file} is missing "data" or "execute"`);
  }
}

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log(`🌍 Deploying global commands...`);
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: globalCommands }
    );
    console.log(`⚡ Global commands deployed.`);

    console.log(`🌍 Deploying guild commands to main server...`);
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, MAIN_SERVER_ID),
      { body: guildCommands }
    );
    console.log(`⚡ Guild commands deployed to main server.`);

    // If you want guild commands in every server the bot is in:
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });
    client.once('ready', async () => {
      client.guilds.cache.forEach(async guild => {
        if (guild.id === MAIN_SERVER_ID) return; // Already deployed
        await rest.put(
          Routes.applicationGuildCommands(CLIENT_ID, guild.id),
          { body: guildCommands }
        );
        console.log(`✅ Guild commands deployed to ${guild.name} (${guild.id})`);
      });

      client.destroy(); // Close client after deployment
      console.log('✅ Deployment finished.');
    });

    await client.login(TOKEN);
  } catch (error) {
    console.error('❌ Failed to deploy commands:');
    console.error(error);
  }
})();
