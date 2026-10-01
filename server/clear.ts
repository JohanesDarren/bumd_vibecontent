import { clearAllData, pool, runMigrations } from './database.ts';
try { await runMigrations(); await clearAllData(); console.log('All application data cleared'); } finally { await pool.end(); }
