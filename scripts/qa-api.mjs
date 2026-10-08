// End-to-end check of the admin control-plane API against the running server.
const B = 'http://127.0.0.1:3005';
let cookie = '';
const api = async (method, path, body) => {
  const res = await fetch(B + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const set = res.headers.get('set-cookie');
  if (set) cookie = set.split(';')[0];
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, data };
};
let fails = 0;
const check = (name, cond, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? ' :: ' + extra : ''}`); if (!cond) fails++; };

const login = await api('POST', '/api/auth/login', { email: 'qa-admin@local.test', password: 'QaAdminPass123' });
check('login as superadmin', login.status === 200 && login.data.role === 'superadmin', JSON.stringify(login.data));
check('superadmin starts with no workspace', Array.isArray(login.data.workspaces) && login.data.workspaces.length === 0);

const before = await api('GET', '/api/admin/overview');
check('overview starts empty', before.status === 200 && before.data.companies.length === 0 && before.data.workspaces === 0, JSON.stringify(before.data));

const co = await api('POST', '/api/admin/companies', { name: 'QA Holding' });
check('create company', co.status === 201 && co.data.name === 'QA Holding', JSON.stringify(co.data));

const ws = await api('POST', '/api/admin/workspaces', { companyId: co.data.id, name: 'QA Unit Bandung', code: 'QA-BDG', sector: 'Air Minum', city: 'Bandung' });
check('create workspace', ws.status === 201 && ws.data.code === 'QA-BDG', JSON.stringify(ws.data));

const corp = await api('POST', '/api/admin/users', { name: 'QA Corporate', email: 'qa-corp@local.test', password: 'QaCorpPass123', role: 'corporate', companyId: co.data.id });
check('create corporate admin', corp.status === 201 && corp.data.role === 'corporate', JSON.stringify(corp.data));

const creator = await api('POST', '/api/admin/users', { name: 'QA Creator', email: 'qa-creator@local.test', password: 'QaCreatorPass123', role: 'creator', companyId: co.data.id, workspaceIds: [ws.data.id] });
check('create creator through admin API', creator.status === 201 && creator.data.role === 'creator', JSON.stringify(creator.data));
check('creator placement returned', JSON.stringify(creator.data.workspaceIds) === JSON.stringify([ws.data.id]));

check('duplicate email -> 409', (await api('POST', '/api/admin/users', { name: 'Dup', email: 'qa-corp@local.test', password: 'QaCorpPass123', role: 'superadmin' })).status === 409);

const users = await api('GET', '/api/admin/users');
check('admin user list exposes workspaceIds', (users.data.find(u => u.id === creator.data.id)?.workspaceIds || []).length === 1);

const overview = await api('GET', '/api/admin/overview');
const coRow = overview.data.companies.find(c => c.id === co.data.id);
// The company holds exactly two accounts: the corporate admin and the creator.
check('overview counts reflect new data', overview.data.workspaces === 1 && overview.data.users.total === 4 && coRow?.workspaceCount === 1 && coRow?.userCount === 2, JSON.stringify(coRow));

check('rename company', (await api('PUT', `/api/admin/companies/${co.data.id}`, { name: 'QA Holding Updated' })).data?.name === 'QA Holding Updated');
const wsList = await api('GET', '/api/admin/workspaces');
check('workspace list has sector/city/companyId', (() => { const w = wsList.data.find(x => x.id === ws.data.id); return Boolean(w && w.sector === 'Air Minum' && w.city === 'Bandung' && w.companyId === co.data.id); })());
check('memberships list creator placement', (await api('GET', '/api/admin/memberships')).data.some(m => m.userId === creator.data.id && m.workspaceId === ws.data.id));

check('duplicate workspace code -> 409', (await api('POST', '/api/admin/workspaces', { companyId: co.data.id, name: 'Dup', code: 'QA-BDG', sector: 'x', city: 'y' })).status === 409);
check('non-empty company delete -> 409', (await api('DELETE', `/api/admin/companies/${co.data.id}`)).status === 409);
check('workspace with members delete -> 409', (await api('DELETE', `/api/admin/workspaces/${ws.data.id}`)).status === 409);
check('last creator placement removal -> 409', (await api('DELETE', `/api/admin/memberships/${ws.data.id}/${creator.data.id}`)).status === 409);

check('delete creator', (await api('DELETE', `/api/admin/users/${creator.data.id}`)).status === 200);
check('delete corporate admin', (await api('DELETE', `/api/admin/users/${corp.data.id}`)).status === 200);
check('delete workspace', (await api('DELETE', `/api/admin/workspaces/${ws.data.id}`)).status === 200);
check('delete company', (await api('DELETE', `/api/admin/companies/${co.data.id}`)).status === 200);

const final = await api('GET', '/api/admin/overview');
check('back to clean state', final.data.companies.length === 0 && final.data.workspaces === 0 && final.data.users.total === 2, JSON.stringify(final.data));

console.log(fails ? `\n${fails} CHECK(S) FAILED` : '\nALL API CHECKS PASSED');
process.exit(fails ? 1 : 0);
