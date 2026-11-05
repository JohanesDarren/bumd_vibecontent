import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (p: string) => readFile(new URL(p, import.meta.url), 'utf8');

/* ── HIGH: deleting a workspace/company must not be blocked by the audit trigger ── */

test('the append-only audit trigger still blocks app-level deletes', async () => {
  const sql = await read('../../server/migrations/017_audit_cascade.sql');
  assert.match(sql, /IF TG_OP = 'UPDATE' THEN/, 'updates stay refused');
  assert.match(sql, /RAISE EXCEPTION 'audit_events are append-only'/, 'the guarantee is kept');
  assert.match(sql, /EXISTS \(SELECT 1 FROM organizations o WHERE o.id = OLD.organization_id\)/, 'a live parent still blocks the delete');
  assert.match(sql, /RETURN NULL/, 'the FK cascade must be allowed through');
});

test('the cascade-friendly trigger runs on boot', async () => {
  const db = await read('../../server/database.ts');
  assert.match(db, /017_audit_cascade'\"\)\)\.rowCount/, 'migration must be tracked');
  assert.match(db, /migrations', '017_audit_cascade\.sql'/, 'migration must be applied');
});

/* ── Company names: trimmed, unique, never silently blanked ── */

test('company names are validated in one place and reused by POST and PUT', async () => {
  const s = await read('../../server/index.ts');
  assert.match(s, /async function companyNameError/, 'one validator');
  assert.match(s, /lower\(name\)=lower\(\$1\)/, 'duplicates are refused case-insensitively');
  const post = s.slice(s.indexOf("app.post('/api/admin/companies'"), s.indexOf("app.post('/api/admin/companies'") + 900);
  assert.match(post, /await companyNameError\(name\)/, 'POST must use the validator');
  const put = s.slice(s.indexOf("app.put('/api/admin/companies/:id'"), s.indexOf("app.put('/api/admin/companies/:id'") + 900);
  assert.match(put, /await companyNameError\(name,String\(req.params.id\)\)/, 'PUT must use the validator and exclude itself');
  assert.doesNotMatch(put, /isNonEmptyString\(req\.body\?\.name\)/, 'whitespace-only must not pass the old check');
});

/* ── MED: today at a past hour is not schedulable ── */

test('the server rejects a past hour on today, not just a past date', async () => {
  const db = await read('../../server/database.ts');
  const block = db.slice(db.indexOf('export async function saveSchedule'), db.indexOf('export async function saveSchedule') + 2200);
  assert.match(block, /Asia\/Jakarta/, 'the comparison must use the business timezone');
  assert.match(block, /\$2::time <= \(now\(\) AT TIME ZONE 'Asia\/Jakarta'\)::time/, 'the clock time must be compared');
  assert.match(block, /Jam publikasi tidak boleh sudah lewat untuk hari ini/, 'the reason must be specific');
  assert.match(block, /previous\.time!==item\.time/, 'editing an unchanged slot stays allowed');
});

test('the schedule form mirrors the same rule before the round trip', async () => {
  const view = await read('../components/ContentSchedulingView.tsx');
  assert.match(view, /formDate === todayStr && formTime <= nowTime/, 'client must check the clock time');
  assert.match(view, /Jam publikasi tidak boleh sudah lewat untuk hari ini/, 'same wording as the server');
});

/* ── S5: never replace the form under the caret ── */

test('a realtime refresh waits until the user stops typing', async () => {
  const app = await read('../App.tsx');
  assert.match(app, /const isTypingTarget = \(\) =>/, 'the typing guard must exist');
  assert.match(app, /pendingReload\.current = true; return;/, 'the refresh must be deferred, not dropped');
  assert.match(app, /flushPendingReload\(\)/, 'the deferred refresh must be flushed');
  assert.match(app, /addEventListener\('focusout', flush, true\)/, 'blur flushes the pending refresh');
});
