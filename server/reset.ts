import { pool, resetKeepingSuperadmins, runMigrations } from './database.ts';

// Destructive maintenance command: removes every workspace, account and content
// record, but keeps superadmin logins so the admin console stays reachable.
try {
  await runMigrations();
  await resetKeepingSuperadmins();
  const admins = await pool.query("SELECT email FROM users WHERE global_role='superadmin' ORDER BY email");
  console.log(`All application data cleared. Kept ${admins.rowCount} superadmin account(s):`);
  for (const row of admins.rows) console.log(`  ${row.email}`);
  if (!admins.rowCount) {
    console.warn('  none found — set SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD in .env.local, then restart the API to provision one.');
  }
} finally {
  await pool.end();
}
