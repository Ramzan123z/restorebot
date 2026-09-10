require('dotenv').config();

const initDB = require('./database');

(async () => {
  try {
    global.db = await initDB();
    console.log('[START] Base de données prête');
  } catch (e) {
    console.error('[START] Erreur base de données:', e.message);
    process.exit(1);
  }

  const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
  const fs = require('fs');
  const path = require('path');
  const config = require('./config');

  // === BOT DISCORD ===
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
  const commandsPath = path.join(__dirname, 'src', 'bot', 'commands');
  for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
    const command = require(path.join(commandsPath, file));
    client.commands.set(command.data.name, command);
  }

  const eventsPath = path.join(__dirname, 'src', 'bot', 'events');
  for (const file of fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'))) {
    const event = require(path.join(eventsPath, file));
    client[event.once ? 'once' : 'on'](event.name, (...args) => event.execute(...args));
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
      if (interaction.replied || interaction.deferred) await interaction.followUp(reply);
      else await interaction.reply(reply);
    }
  });

  client.once('ready', () => {
    console.log(`[BOT] Connecté en tant que ${client.user.tag}`);
    client.user.setActivity('Vérification des membres', { type: 3 });

    const { REST, Routes } = require('discord.js');
    const rest = new REST({ version: '10' }).setToken(config.bot.token);
    const data = [...client.commands.values()].map(c => c.data.toJSON());
    rest.put(Routes.applicationCommands(config.bot.clientId), { body: data })
      .then(() => console.log('[BOT] Slash commands enregistrés'))
      .catch(console.error);
  });

  client.login(config.bot.token).catch(e => {
    console.error('[BOT] Erreur de connexion:', e.message);
    process.exit(1);
  });

  // === SERVEUR WEB ===
  const express = require('express');
  const session = require('express-session');

  const app = express();
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'src', 'web', 'views'));
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(session({
    secret: config.web.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 },
  }));
  app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
  });
  app.use('/', require('./src/web/routes/auth'));
  app.use('/dashboard', require('./src/web/routes/dashboard'));
  app.use('/verify', require('./src/web/routes/verify'));
  app.use('/api', require('./src/web/routes/api'));
  app.get('/', (req, res) => res.render('login', { user: req.session.user }));

  app.listen(config.web.port, () => {
    console.log(`[WEB] Serveur démarré sur le port ${config.web.port}`);
    console.log(`[WEB] URL publique : ${config.web.url}`);
  });

  process.on('SIGINT', () => { client.destroy(); process.exit(0); });
  process.on('SIGTERM', () => { client.destroy(); process.exit(0); });
})();