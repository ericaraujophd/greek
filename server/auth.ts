/**
 * auth.ts: who is allowed in, and how we remember that they signed in.
 *
 * SIGNING IN WITH GOOGLE (production)
 *   1. The browser shows Google's own "Sign in with Google" button
 *      (Google Identity Services). Google checks the password, 2FA etc.
 *   2. Google hands the browser an ID token: a JWT signed by Google that
 *      says "this is efer251@calvinseminary.edu, verified".
 *   3. The browser sends that token to POST /api/auth/google.
 *   4. verifyGoogleToken() checks Google's signature (using Google's public
 *      keys), that the token was issued for OUR client id, that it has not
 *      expired, and that the email is verified and at ALLOWED_DOMAIN.
 *   5. isAllowed() checks the invitation list.
 *   6. We issue our own session token (below). Google's token is not kept.
 *
 * DEVELOPER SIGN-IN (only when DEV_LOGIN=1, i.e. on your Mac)
 *   POST /api/auth/dev with an email skips Google but still requires an
 *   invitation, so you can test the student experience with fake invited
 *   addresses before setting up Google.
 *
 * SESSIONS
 *   Our session token is a JWT signed with SESSION_SECRET (HS256), valid
 *   for 30 days. The browser keeps it in localStorage and sends it as
 *   "Authorization: Bearer <token>". We use a header rather than a cookie
 *   because the website (GitHub Pages) and the API will live on different
 *   domains, and browsers increasingly block cross-site cookies.
 */
import { createRemoteJWKSet, jwtVerify, SignJWT } from 'jose';
import type { Db } from './db';
import type { Env } from './env';

/** Google's public signing keys. jose caches and refreshes them automatically. */
const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

export interface GoogleIdentity { email: string; name: string }

export async function verifyGoogleToken(idToken: string, env: Env): Promise<GoogleIdentity> {
  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience: env.GOOGLE_CLIENT_ID,
  });
  const email = String(payload.email ?? '').toLowerCase();
  if (!email || payload.email_verified !== true) throw new AuthError('Google did not confirm this email address.');
  // `hd` (hosted domain) is set by Google only for Google Workspace accounts.
  // Checking both hd and the email suffix rejects personal Gmail accounts.
  if (payload.hd !== env.ALLOWED_DOMAIN || !email.endsWith('@' + env.ALLOWED_DOMAIN)) {
    throw new AuthError(`Only @${env.ALLOWED_DOMAIN} accounts can sign in.`);
  }
  return { email, name: String(payload.name ?? '') };
}

export class AuthError extends Error {}

export function adminEmails(env: Env): string[] {
  return env.ADMIN_EMAILS.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
}

/** Admins from ADMIN_EMAILS are always allowed; everyone else needs a live invitation. */
export async function isAllowed(db: Db, env: Env, email: string): Promise<boolean> {
  if (adminEmails(env).includes(email)) return true;
  const rows = await db.query('SELECT 1 FROM invitations WHERE email = $1 AND revoked_at IS NULL', [email]);
  return rows.length > 0;
}

export interface User { id: string; email: string; name: string; role: 'student' | 'admin' }

/**
 * Create the user on first sign-in, or update name/last_seen on later ones.
 * Role: admin if listed in ADMIN_EMAILS, otherwise whatever is stored
 * (an admin can promote someone from the Admin page).
 */
export async function upsertUser(db: Db, env: Env, email: string, name: string): Promise<User> {
  const isEnvAdmin = adminEmails(env).includes(email);
  const rows = await db.query<User>(
    `INSERT INTO users (email, name, role) VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET
       name = CASE WHEN EXCLUDED.name <> '' THEN EXCLUDED.name ELSE users.name END,
       role = CASE WHEN $3 = 'admin' THEN 'admin' ELSE users.role END,
       last_seen_at = now()
     RETURNING id, email, name, role`,
    [email, name, isEnvAdmin ? 'admin' : 'student'],
  );
  await db.query('UPDATE invitations SET accepted_at = COALESCE(accepted_at, now()) WHERE email = $1', [email]);
  return rows[0];
}

const SESSION_DAYS = 30;

function key(env: Env): Uint8Array {
  return new TextEncoder().encode(env.SESSION_SECRET);
}

export async function issueSession(user: User, env: Env): Promise<string> {
  return new SignJWT({ email: user.email, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(key(env));
}

/** Returns the user id from a valid session token, or throws. */
export async function readSession(token: string, env: Env): Promise<string> {
  const { payload } = await jwtVerify(token, key(env), { algorithms: ['HS256'] });
  if (!payload.sub) throw new AuthError('Bad session.');
  return payload.sub;
}
