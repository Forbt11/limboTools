const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

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
  }
}

const rest = new REST({ version: '10' }).setToken(TOKEN);

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  try {
    console.log('Deploying global commands...');
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: globalCommands });
    console.log('Global commands deployed (may take up to 1 hour to propagate).');

    console.log('Deploying guild commands to all guilds...');
    const allGuilds = await client.guilds.fetch();
    for (const [guildId] of allGuilds) {
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, guildId), { body: guildCommands });
      console.log(`✅ Deployed guild commands to guild ID: ${guildId}`);
    }

    console.log('✅ All commands deployed.');
    client.destroy();
  } catch (err) {
    console.error(err);
  }
});

client.login(TOKEN);
