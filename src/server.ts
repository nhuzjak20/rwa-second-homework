import path from 'path';
import express, { type Request, type Response, type NextFunction } from 'express';
import { db } from './db';
import { flags, setFlag } from './config';

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

// Body parsing (forms will be used by later steps)
app.use(express.urlencoded({ extended: false }));

// Make the vulnerability flags available to every view (for the header switches).
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.locals.flags = flags;
  next();
});

// Toggle a vulnerability on/off, then return to where the user came from.
app.post('/toggle', (req: Request, res: Response) => {
  try {
    setFlag(req.body.name);
  } catch {
    // Unknown toggle name: ignore and just redirect back.
  }
  res.redirect(req.get('referer') || '/');
});

// Landing page
app.get('/', (_req: Request, res: Response) => {
  const userCount = (db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n;
  const productCount = (db.prepare('SELECT COUNT(*) AS n FROM products').get() as { n: number }).n;
  res.render('index', { title: 'RWA Security Demo', userCount, productCount });
});

// Only start listening when run directly (`node dist/server.js`), not when the
// app is imported (e.g. by tests), so importing has no side effects.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

export default app;
