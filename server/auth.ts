import { createHmac } from 'node:crypto';
import { env } from './env.ts';

function base64url(str: string | Buffer): string {
  const b = typeof str === 'string' ? Buffer.from(str) : str;
  return b.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export function signJwt(payload: any, secret: string = env.jwtSecret, expiresInMs: number = 30 * 60 * 1000) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const exp = Date.now() + expiresInMs;
  const p = base64url(JSON.stringify({ ...payload, exp }));
  const signature = base64url(createHmac('sha256', secret).update(`${header}.${p}`).digest());
  return `${header}.${p}.${signature}`;
}

export function verifyJwt(token: string, secret: string = env.jwtSecret): any {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token');
  const [header, p, signature] = parts;
  const expectedSignature = base64url(createHmac('sha256', secret).update(`${header}.${p}`).digest());
  if (signature !== expectedSignature) throw new Error('Invalid signature');
  const payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
  if (payload.exp && payload.exp < Date.now()) throw new Error('Token expired');
  return payload;
}
