// Central env loading. Import this FIRST (before anything reads process.env).
// `.env` holds shared defaults; `.env.local` holds machine-local secrets and wins.
//
// Location matters: the zero-downtime deployer starts PM2 from the release
// directory, which does NOT contain .env — only the project root does. Relying on
// process.cwd() therefore loaded zero variables and crashed the server on the
// production guard. Probe upward from the module and from cwd instead.
import dotenv from 'dotenv';
import nodeCrypto from 'node:crypto';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function envRoots(): string[] {
  const roots = new Set<string>();
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  // server/ → project root, and the parent of a release directory.
  for (const candidate of [resolve(moduleDir, '..'), resolve(moduleDir, '../..'), process.cwd()]) {
    roots.add(candidate);
  }
  return [...roots];
}

function loadEnvFile(name: string, override: boolean) {
  for (const root of envRoots()) {
    const file = resolve(root, name);
    if (existsSync(file)) {
      dotenv.config({ path: file, override });
      return;
    }
  }
}

if (process.env.NODE_ENV !== 'test') {
  loadEnvFile('.env', false);
  loadEnvFile('.env.local', process.env.NODE_ENV !== 'production');
}

export const env = {
  ragApiUrl: process.env.RAG_API_URL || '',
  ragApiKey: process.env.RAG_API_KEY || '',

  jwtSecret: process.env.JWT_SECRET || nodeCrypto.randomBytes(32).toString('hex')
};

export const ragConfigured = () => Boolean(env.ragApiUrl && env.ragApiKey);
