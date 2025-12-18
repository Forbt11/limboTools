require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const MAIN_SERVER_ID = process.env.MAIN_SERVER_ID;

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command.data && command.execute) {
    commands.push(command.data.toJSON());
    console.log(`✅ Loaded command: ${command.data.name}`);
  }
}

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log('🚀 Deploying guild commands...');
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, MAIN_SERVER_ID),
      { body: commands }
    );
    console.log('✅ Commands deployed instantly.');
  } catch (err) {
    console.error('❌ Deploy failed:', err);
  }
})();
