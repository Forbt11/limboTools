module.exports = (client) => {
  const MY_ID = process.env.MY_ID; // Your Discord ID from .env

  // Example interaction map
  const interactions = {
      "hello": "Hi there! 👋",
      "bye": "Goodbye! 😢",
      "how are you": "I'm just a bot, but feeling great! 😎",
      "ping": "Pong!"
  };

  client.on('messageCreate', (message) => {
      // Only respond to your messages
      if (message.author.id !== MY_ID) return;

      // Ignore messages from bots
      if (message.author.bot) return;

      // Normalize message content
      const content = message.content.toLowerCase();

      // Check if any interaction matches
      for (const key in interactions) {
          if (content.includes(key)) {
              message.reply(interactions[key]);
              break; // Only reply once per message
          }
      }
  });
};
