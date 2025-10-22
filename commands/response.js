module.exports = (client) => {
  const MY_ID = process.env.MY_ID; // Your Discord ID from .env

  // Example interaction map
  const interactions = {
    "fetch me their souls.": "Fetch me their souls."
  };

  client.on('messageCreate', (message) => {
    // Ignore messages from bots
    if (message.author.bot) return;

    // Only respond if the bot is mentioned
    if (!message.mentions.has(client.user)) return;

    // Only respond to your messages (optional, remove if you want anyone to trigger)
    if (message.author.id !== MY_ID) return;

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
