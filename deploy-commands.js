require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes, Client, GatewayIntentBits } = require('discord.js');

const CLIENT_ID = process.env.CLIENT_ID;
const TOKEN = process.env.TOKEN;
const MAIN_SERVER_ID = process.env.MAIN_SERVER_ID;

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

const globalCommands = [];
const guildCommands = [];

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if ('data' in command && 'execute' in command) {
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
    // 1️⃣ Deploy global commands
    if (globalCommands.length > 0) {
      console.log('🌍 Deploying global commands...');
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: globalCommands });
      console.log('⚡ Global commands deployed (propagation may take up to 1 hour).');
    }

    // 2️⃣ Deploy guild commands to all guilds instantly
    console.log('🌐 Deploying guild commands to all servers...');
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });

    client.once('ready', async () => {
      const allGuilds = await client.guilds.fetch();

      for (const [guildId] of allGuilds) {
        // Skip if no guild commands to deploy
        if (guildCommands.length === 0) break;

        await rest.put(
          Routes.applicationGuildCommands(CLIENT_ID, guildId),
          { body: guildCommands }
        );

        console.log(`✅ Guild commands deployed to guild ID: ${guildId}`);
      }

      client.destroy();
      console.log('✅ All guild commands deployed successfully.');
    });

    await client.login(TOKEN);

  } catch (error) {
    console.error('❌ Failed to deploy commands:');
    console.error(error);
  }
})();
