const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const MAIN_SERVER_ID = process.env.MAIN_SERVER_ID;

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

const globalCommands = [];
const guildCommands = [];

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command.data && command.execute) {
    if (['globalban', 'unban', 'banlist'].includes(command.data.name)) {
      globalCommands.push(command.data.toJSON());
    } else {
      guildCommands.push(command.data.toJSON());
    }
    console.log(`✅ Loaded command: ${command.data.name}`);
  } else {
    console.warn(`[⚠️] Command ${file} missing "data" or "execute"`);
  }
}

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    // Delete old global commands not in allowed list
    const existingGlobal = await rest.get(Routes.applicationCommands(CLIENT_ID));
    for (const cmd of existingGlobal) {
      if (!['globalban', 'unban', 'banlist'].includes(cmd.name)) {
        await rest.delete(Routes.applicationCommand(CLIENT_ID, cmd.id));
        console.log(`🗑️ Deleted old global command: ${cmd.name}`);
      }
    }

    // Deploy global commands
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: globalCommands });
    console.log('⚡ Global commands deployed (may take ~1 hour to propagate).');

    // Deploy guild commands to all servers instantly
    console.log('🌐 Fetching all guilds for guild command deployment...');
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });
    
    client.once('ready', async () => {
      const fetchedGuilds = await client.guilds.fetch();
      for (const [guildId, guild] of fetchedGuilds) {
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, guildId), { body: guildCommands });
        console.log(`✅ Guild commands deployed to: ${guild.name} (${guildId})`);
      }
      client.destroy();
      console.log('✅ All guild commands deployed instantly.');
    });

    await client.login(TOKEN);

  } catch (err) {
    console.error('❌ Failed to deploy commands:', err);
  }
})();
