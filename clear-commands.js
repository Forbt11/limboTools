const { REST, Routes } = require('discord.js');
require('dotenv').config();

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('Clearing global commands...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: [] }
    );

    console.log('Clearing guild commands...');
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.MAIN_SERVER_ID
      ),
      { body: [] }
    );

    console.log('✅ Commands cleared');
  } catch (err) {
    console.error(err);
  }
})();
