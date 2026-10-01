import { pool, runMigrations } from './database.ts';
try { await runMigrations(); console.log('Migration 001_initial applied'); } finally { await pool.end(); }
