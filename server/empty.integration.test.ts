import test from 'node:test';
import assert from 'node:assert/strict';
import { clearAllData, createOrganizationWithAdmin, listBootstrap, pool, runMigrations } from './database.ts';

test.before(async () => { await runMigrations(); });
test.after(async () => { await clearAllData(); await pool.end(); });

test('empty database returns empty bootstrap without mock fallback', async () => {
  await clearAllData();
  const data = await listBootstrap();
  assert.deepEqual(data.workspaces, []);
  assert.deepEqual(data.users, []);
  assert.deepEqual(data.documents, []);
  assert.deepEqual(data.drafts, []);
  assert.deepEqual(data.auditLogs, []);
  assert.equal(data.brandProfile, null);
});

test('first-run setup creates only submitted organization and admin', async () => {
  await clearAllData();
  const created = await createOrganizationWithAdmin({
    organizationName: 'Manual BUMD', code: 'MANUAL', sector: 'Services', city: 'Bandung',
    adminName: 'Manual Admin', adminEmail: 'admin@manual.test'
  });
  const data = await listBootstrap(created.workspace.id);
  assert.equal(data.workspaces.length, 1);
  assert.equal(data.users.length, 1);
  assert.equal(data.users[0].role, 'admin');
  assert.deepEqual(data.documents, []);
  assert.deepEqual(data.drafts, []);
});
