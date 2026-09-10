const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../../config');
const initDB = require('../../database');

(async () => {
  global.db = await initDB();

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel, Partials.Message],
  });

  client.commands = new Collection();

  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

  for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    client.commands.set(command.data.name, command);
  }

  const eventsPath = path.join(__dirname, 'events');
  const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

  for (const file of eventFiles) {
    const event = require(path.join(eventsPath, file));
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
  }

  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction, client);
    } catch (error) {
      console.error(`Error in ${interaction.commandName}:`, error);
      const reply = { content: 'Une erreur est survenue.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    }
  });

  client.once('ready', () => {
    console.log(`[BOT] Connecté en tant que ${client.user.tag}`);
    client.user.setActivity('Vérification des membres', { type: 3 });

    const commandsData = [];
    for (const [, command] of client.commands) {
      commandsData.push(command.data.toJSON());
    }

    const rest = require('@discordjs/rest');
    const { Routes } = require('discord.js');
    const APIRest = new rest.REST({ version: '10' }).setToken(config.bot.token);

    APIRest.put(Routes.applicationCommands(config.bot.clientId), { body: commandsData })
      .then(() => console.log('[BOT] Slash commands enregistrés'))
      .catch(console.error);
  });

  client.login(config.bot.token);
})();
