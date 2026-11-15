import path from 'path';
import express, { type Request, type Response, type NextFunction } from 'express';
import { db } from './db';
import { flags, setFlag } from './config';
import { searchProducts, sqlLogin, type SearchResult, type LoginResult } from './sqli';
import {
  COOKIE_NAME,
  parseCookies,
  resolveSession,
  login as csrfLogin,
  destroySession,
  getCsrfToken,
  validateCsrf,
  changeEmail,
  logAction,
  actionLog,
  type SessionUser,
} from './csrf';

const app = express();
const PORT = process.env.PORT || 3000;


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));


app.use(express.urlencoded({ extended: false }));

app.use((_req: Request, res: Response, next: NextFunction) => {
  res.locals.flags = flags;
  next();
});

function sessionToken(req: Request): string | undefined {
  return parseCookies(req.headers.cookie)[COOKIE_NAME];
}
function renderIndex(
  req: Request,
  res: Response,
  extra: {
    q?: string;
    searchResult?: SearchResult | null;
    loginUsername?: string;
    loginResult?: LoginResult | null;
    csrfError?: string | null;
    csrfResult?: string | null;
  } = {}
): void {
  const userCount = (db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n;
  const productCount = (db.prepare('SELECT COUNT(*) AS n FROM products').get() as { n: number }).n;
  const token = sessionToken(req);
  const session: SessionUser | null = resolveSession(db, token);
  const csrfToken = session && token ? getCsrfToken(token) : '';
  res.render('index', {
    title: 'RWA — Demo sigurnosnih ranjivosti',
    userCount,
    productCount,
    q: extra.q ?? '',
    searchResult: extra.searchResult ?? null,
    loginUsername: extra.loginUsername ?? '',
    loginResult: extra.loginResult ?? null,
    session,
    csrfToken,
    csrfError: extra.csrfError ?? null,
    csrfResult: extra.csrfResult ?? null,
    actionLog,
  });
}

app.get('/', (req: Request, res: Response) => {
  renderIndex(req, res);
});

app.post('/', (req: Request, res: Response) => {
  const action = typeof req.body.action === 'string' ? req.body.action : '';
  const str = (v: unknown): string => (typeof v === 'string' ? v : '');

  switch (action) {
    case 'toggle': {
      try {
        setFlag(req.body.name);
      } catch {
        
      }
      return res.redirect('/');
    }
    
    case 'search': {
      const q = str(req.body.q);
      return renderIndex(req, res, { q, searchResult: searchProducts(db, q, flags.sqliVulnerable) });
    }
    case 'sql-login': {
      const username = str(req.body.username);
      const password = str(req.body.password);
      return renderIndex(req, res, {
        loginUsername: username,
        loginResult: sqlLogin(db, username, password, flags.sqliVulnerable),
      });
    }
    
    case 'csrf-login': {
      const username = str(req.body.username);
      const password = str(req.body.password);
      const token = csrfLogin(db, username, password);
      if (token) {
        res.cookie(COOKIE_NAME, token, {
          httpOnly: true,
          sameSite: flags.csrfVulnerable ? 'lax' : 'strict',
        });
        logAction(`Prijava žrtve: "${username}".`);
        return res.redirect('/');
      }
      return renderIndex(req, res, { csrfError: 'Prijava neuspješna — pogrešni podaci.' });
    }
    case 'csrf-logout': {
      destroySession(sessionToken(req));
      res.clearCookie(COOKIE_NAME);
      logAction('Odjava.');
      return res.redirect('/');
    }
    case 'change-email': {
      const token = sessionToken(req);
      const session = resolveSession(db, token);
      if (!session || !token) {
        return renderIndex(req, res, { csrfError: 'Niste prijavljeni.' });
      }
      
      if (!flags.csrfVulnerable && !validateCsrf(token, str(req.body.csrf))) {
        logAction('Promjena e-maila ODBIJENA (nevažeći CSRF token).');
        return renderIndex(req, res, { csrfError: 'CSRF token nevažeći — zahtjev odbijen.' });
      }
      const email = str(req.body.email);
      changeEmail(db, session.username, email);
      logAction(`E-mail korisnika "${session.username}" promijenjen u "${email}".`);
      return res.redirect('/');
    }
    case 'csrf-attack': {
      const token = sessionToken(req);
      const session = resolveSession(db, token);
      if (!session || !token) {
        return renderIndex(req, res, { csrfResult: 'Nema prijavljene žrtve — prvo se prijavite.' });
      }
      const evil = 'napadac@zlo.example';
      if (!flags.csrfVulnerable && !validateCsrf(token, str(req.body.csrf))) {
        logAction('CSRF napad ODBIJEN (nedostaje valjani token).');
        return renderIndex(req, res, {
          csrfResult: 'Napad odbijen — poslužitelj traži valjani CSRF token kojeg napadač nema.',
        });
      }
      changeEmail(db, session.username, evil);
      logAction(`CSRF napad USPIO — e-mail "${session.username}" promijenjen u "${evil}".`);
      return renderIndex(req, res, {
        csrfResult: `Napad uspio — e-mail žrtve "${session.username}" promijenjen u "${evil}" bez njezina pristanka.`,
      });
    }

    default:
      return res.redirect('/');
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

export default app;
