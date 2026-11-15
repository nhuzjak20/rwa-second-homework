'use strict';

const path = require('path');
const express = require('express');
const { db } = require('./db');
const { flags, setFlag } = require('./config');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

app.use(express.urlencoded({ extended: false }));
app.use((req, res, next) => {
  res.locals.flags = flags;
  next();
});

app.post('/toggle', (req, res) => {
  try {
    setFlag(req.body.name);
  } catch {
    res.status(500)
  }
  res.redirect(req.get('referer') || '/');
});


app.get('/', (req, res) => {
  const userCount = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  const productCount = db.prepare('SELECT COUNT(*) AS n FROM products').get().n;
  res.render('index', { title: 'RWA Security Demo', userCount, productCount });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
