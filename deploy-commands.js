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
        commands.push(command);
        console.log(`✅ Loaded command: ${command.data.name}`);
    } else {
        console.warn(`[⚠️] Command ${file} is missing "data" or "execute"`);
    }
}

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        // 1️⃣ Deploy only global commands
        const globalCommands = commands
            .filter(cmd => cmd.global) // Only commands marked global: true
            .map(cmd => cmd.data.toJSON());

        if (globalCommands.length > 0) {
            await rest.put(Routes.applicationCommands(CLIENT_ID), { body: globalCommands });
            console.log(`🌍 Global commands deployed: ${globalCommands.map(c => c.name).join(', ')}`);
        }

        // 2️⃣ Deploy the rest to MAIN_SERVER only
        const guildCommands = commands
            .filter(cmd => !cmd.global)
            .map(cmd => cmd.data.toJSON());

        if (guildCommands.length > 0) {
            await rest.put(Routes.applicationGuildCommands(CLIENT_ID, MAIN_SERVER_ID), { body: guildCommands });
            console.log(`⚡ Guild-only commands deployed to MAIN_SERVER (${MAIN_SERVER_ID}): ${guildCommands.map(c => c.name).join(', ')}`);
        }

        console.log('✅ All commands deployment finished!');
    } catch (error) {
        console.error('❌ Failed to deploy commands:');
        console.error(error);
    }
})();
