require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

const CLIENT_ID = process.env.CLIENT_ID;
const TOKEN = process.env.TOKEN;
const MAIN_SERVER_ID = process.env.MAIN_SERVER_ID;

// Grab all command files
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

const commands = [];

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if ('data' in command && 'execute' in command) {
    commands.push(command.data.toJSON());
    console.log(`✅ Loaded command: ${command.data.name}`);
  } else {
    console.warn(`[⚠️] Command ${file} is missing "data" or "execute"`);
  }
}

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log(`🌍 Started deploying ${commands.length} commands...`);

    // 1️⃣ Deploy to main server for instant updates (fast testing)
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, MAIN_SERVER_ID),
      { body: commands }
    );
    console.log(`⚡ Commands deployed instantly to MAIN_SERVER (${MAIN_SERVER_ID})`);

    // 2️⃣ Deploy to all other servers the bot is in
    // You need a logged-in client to get client.guilds.cache
    const { Client, GatewayIntentBits } = require('discord.js');
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });

    client.once('ready', async () => {
      client.guilds.cache.forEach(async guild => {
        if (guild.id === MAIN_SERVER_ID) return; // Already deployed
        await rest.put(
          Routes.applicationGuildCommands(CLIENT_ID, guild.id),
          { body: commands }
        );
        console.log(`✅ Commands deployed to ${guild.name} (${guild.id})`);
      });

      console.log('✅ All commands deployed.');
      client.destroy(); // Close client after deployment
    });

    await client.login(TOKEN);

  } catch (error) {
    console.error('❌ Failed to deploy commands:');
    console.error(error);
  }
})();
