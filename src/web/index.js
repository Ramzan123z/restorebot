const express = require('express');
const session = require('express-session');
const path = require('path');
const config = require('../../config');
const initDB = require('../../database');

(async () => {
  global.db = await initDB();

  const app = express();

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  app.use(express.static(path.join(__dirname, '../../public')));
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

  app.use('/', require('./routes/auth'));
  app.use('/dashboard', require('./routes/dashboard'));
  app.use('/verify', require('./routes/verify'));
  app.use('/api', require('./routes/api'));

  app.get('/', (req, res) => {
    res.render('login', { user: req.session.user });
  });

  app.listen(config.web.port, () => {
    console.log(`[WEB] Serveur démarré sur ${config.web.url}`);
  });
})();
