import { pool, runMigrations } from './database.ts';
try { await runMigrations(); console.log('Database migrations applied'); } finally { await pool.end(); }
