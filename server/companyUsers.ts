import { randomUUID } from 'node:crypto';
import { pool, hashPassword } from './database.ts';

export async function listCompanyUsers(companyId: string) {
  const result = await pool.query(`SELECT u.id,u.name,u.email,array_agg(DISTINCT o.id ORDER BY o.id) AS "workspaceIds"
    FROM users u JOIN memberships m ON m.user_id=u.id AND m.active
    JOIN organizations o ON o.id=m.organization_id AND o.company_id=$1
    WHERE u.global_role='creator' GROUP BY u.id,u.name,u.email ORDER BY u.name`, [companyId]);
  return result.rows;
}

export async function createCompanyUser(companyId: string, input: {name:string;email:string;password:string;workspaceIds:string[]}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ids = [...new Set(input.workspaceIds)];
    const allowed = await client.query('SELECT id FROM organizations WHERE company_id=$1 AND id=ANY($2::text[])', [companyId,ids]);
    if (allowed.rowCount !== ids.length) { await client.query('ROLLBACK'); return null; }
    const created = await client.query(`INSERT INTO users(id,name,email,password_hash,global_role)
      VALUES($1,$2,$3,$4,'creator') RETURNING id,name,email`, [`usr-${randomUUID()}`,input.name,input.email.toLowerCase().trim(),await hashPassword(input.password)]);
    for (const id of ids) await client.query("INSERT INTO memberships(organization_id,user_id,role) VALUES($1,$2,'creator')", [id,created.rows[0].id]);
    await client.query('COMMIT');
    return {...created.rows[0],workspaceIds:ids};
  } catch(error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function assignCompanyUser(companyId: string, userId: string, workspaceIds: string[]) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ids = [...new Set(workspaceIds)];
    const user = await client.query(`SELECT u.id FROM users u WHERE u.id=$1 AND u.global_role='creator'
      AND EXISTS(SELECT 1 FROM memberships m JOIN organizations o ON o.id=m.organization_id WHERE m.user_id=u.id AND m.active AND o.company_id=$2) FOR UPDATE`,[userId,companyId]);
    if (!user.rowCount) { await client.query('ROLLBACK'); return {status:404 as const}; }
    const allowed = await client.query('SELECT id FROM organizations WHERE company_id=$1 AND id=ANY($2::text[])',[companyId,ids]);
    if (allowed.rowCount !== ids.length) { await client.query('ROLLBACK'); return {status:403 as const}; }
    await client.query('DELETE FROM memberships m USING organizations o WHERE m.organization_id=o.id AND o.company_id=$1 AND m.user_id=$2 AND NOT (o.id=ANY($3::text[]))',[companyId,userId,ids]);
    for (const id of ids) await client.query(`INSERT INTO memberships(organization_id,user_id,role) VALUES($1,$2,'creator')
      ON CONFLICT (organization_id,user_id) DO UPDATE SET active=true,role='creator'`,[id,userId]);
    await client.query('COMMIT');
    return {status:200 as const,workspaceIds:ids};
  } catch(error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
