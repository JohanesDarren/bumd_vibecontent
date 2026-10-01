import test from 'node:test';
import assert from 'node:assert/strict';
import { clearAllData, createOrganizationWithAdmin, pool, runMigrations, listWorkspaceDrafts, createDraft, saveKnowledgeSource } from './database.ts';

test.before(async () => {
  await runMigrations(); await clearAllData();
  await createOrganizationWithAdmin({organizationName:'Test Org',code:'TEST',sector:'Test',city:'Test',adminName:'Admin',adminEmail:'admin@test.local'});
  const ids=await pool.query('SELECT o.id workspace_id,u.id user_id FROM organizations o JOIN memberships m ON m.organization_id=o.id JOIN users u ON u.id=m.user_id LIMIT 1');
  testContext={...ids.rows[0]};
  await saveKnowledgeSource({id:'doc-test',workspaceId:testContext.workspace_id,title:'Test Source',category:'sop_layanan',owner:'Admin',version:'1',effectiveDate:'2026',status:'aktif',uploadDate:new Date().toISOString(),fileSize:'',summary:'',chunks:[]});
});
test.after(async () => { await pool.end(); });
let testContext:{workspace_id:string;user_id:string};

test('drafts remain isolated by workspace', async () => {
  const own = await listWorkspaceDrafts(testContext.workspace_id);
  const other = await listWorkspaceDrafts('missing');
  assert.deepEqual(own, []);
  assert.deepEqual(other, []);
});

test('created draft persists with citations and versions', async () => {
  const created = await createDraft({
    workspaceId: testContext.workspace_id, title: 'Integration Draft', format: 'copy_caption',
    creatorId: testContext.user_id, content: 'Konten uji database', sourceIds: ['doc-test']
  });
  const drafts = await listWorkspaceDrafts(testContext.workspace_id);
  const saved = drafts.find(draft => draft.id === created.id);
  assert.equal(saved?.versions[0].content, 'Konten uji database');
  assert.equal(saved?.versions[0].citations.length, 1);
});
