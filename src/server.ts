import path from 'path';
import express, { type Request, type Response, type NextFunction } from 'express';
import { db } from './db';
import { flags, setFlag } from './config';
import { searchProducts, sqlLogin, type SearchResult, type LoginResult } from './sqli';
import {
  COOKIE_NAME,
  parseCookies,
  resolveSession,
  login as authLogin,
  destroySession,
  forgeToken,
  bruteForce,
  logAction,
  actionLog,
  type SessionUser,
} from './auth';

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
    authError?: string | null;
    authResult?: string | null;
  } = {}
): void {
  const userCount = (db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n;
  const productCount = (db.prepare('SELECT COUNT(*) AS n FROM products').get() as { n: number }).n;
  const token = sessionToken(req);
  const session: SessionUser | null = resolveSession(db, token, flags.authVulnerable);
  const forgedAdmin = forgeToken('admin');
  res.render('index', {
    title: 'RWA — Demo sigurnosnih ranjivosti',
    userCount,
    productCount,
    q: extra.q ?? '',
    searchResult: extra.searchResult ?? null,
    loginUsername: extra.loginUsername ?? '',
    loginResult: extra.loginResult ?? null,
    session,
    forgedAdmin,
    sessionCookie: token ?? '',
    authError: extra.authError ?? null,
    authResult: extra.authResult ?? null,
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
    
    case 'auth-login': {
      const username = str(req.body.username);
      const password = str(req.body.password);
      const outcome = authLogin(db, username, password, flags.authVulnerable);
      if (outcome.ok && outcome.token) {
        res.cookie(COOKIE_NAME, outcome.token, {
          httpOnly: true,
          sameSite: flags.authVulnerable ? 'lax' : 'strict',
        });
        logAction(`Prijava: "${username}".`);
        return res.redirect('/');
      }
      if (outcome.locked) {
        logAction(`Prijava ODBIJENA — račun "${username}" je zaključan.`);
        return renderIndex(req, res, {
          authError: `Račun "${username}" je zaključan nakon previše neuspjelih pokušaja.`,
        });
      }
      return renderIndex(req, res, { authError: 'Prijava neuspješna — pogrešni podaci.' });
    }
    case 'auth-logout': {
      destroySession(sessionToken(req));
      res.clearCookie(COOKIE_NAME);
      logAction('Odjava.');
      return res.redirect('/');
    }
    case 'auth-forge': {
      const forged = forgeToken('admin');
      if (flags.authVulnerable) {
        res.cookie(COOKIE_NAME, forged, { httpOnly: true, sameSite: 'lax' });
        logAction(`Krivotvorena sjednica: kolačić postavljen na "${forged}" (base64 za "admin").`);
        return res.redirect('/');
      }
      res.cookie(COOKIE_NAME, forged, { httpOnly: true, sameSite: 'strict' });
      logAction('Krivotvorena sjednica ODBIJENA — token nije u poslužiteljskom spremištu.');
      return renderIndex(req, res, {
        authResult: 'Napad odbijen — poslužitelj prihvaća samo nasumični token iz svog spremišta, a ne krivotvoreni kolačić.',
      });
    }
    case 'auth-brute': {
      const target = 'admin';
      const outcome = bruteForce(db, target, flags.authVulnerable);
      if (outcome.cracked) {
        logAction(`Brute-force USPIO — lozinka za "${target}" pogođena nakon ${outcome.processed} pokušaja.`);
        return renderIndex(req, res, {
          authResult: `Napad uspio — nema ograničenja pokušaja, lozinka za "${target}" pogođena ("${outcome.crackedPassword}") nakon ${outcome.processed} pokušaja.`,
        });
      }
      if (outcome.locked) {
        logAction(`Brute-force ZAUSTAVLJEN — račun "${target}" zaključan nakon ${outcome.processed} pokušaja.`);
        return renderIndex(req, res, {
          authResult: `Napad zaustavljen — račun "${target}" zaključan nakon ${outcome.processed} pokušaja; daljnje pogađanje je blokirano.`,
        });
      }
      logAction(`Brute-force: ${outcome.processed} pokušaja, lozinka nije pogođena.`);
      return renderIndex(req, res, {
        authResult: `Obrađeno ${outcome.processed} pokušaja, lozinka nije pogođena.`,
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
