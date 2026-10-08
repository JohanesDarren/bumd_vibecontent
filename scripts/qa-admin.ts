import { hashPassword, pool } from '../server/database.ts';

// Temporary QA account used to verify the admin console. Removed after testing.
const email = 'qa-admin@local.test';
await pool.query('DELETE FROM users WHERE email=$1', [email]);
await pool.query("INSERT INTO users(id,name,email,password_hash,global_role) VALUES('usr-qa-admin','QA Admin',$1,$2,'superadmin')", [email, await hashPassword('QaAdminPass123')]);
console.log(`QA superadmin ready: ${email}`);
await pool.end();
