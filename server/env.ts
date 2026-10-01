// Central env loading. Import this FIRST (before anything reads process.env).
// `.env` holds shared defaults; `.env.local` holds machine-local secrets and wins.
import 'dotenv/config';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', override: true });

export const env = {
  ragApiUrl: process.env.RAG_API_URL || '',
  ragApiKey: process.env.RAG_API_KEY || ''
};

export const ragConfigured = () => Boolean(env.ragApiUrl && env.ragApiKey);
