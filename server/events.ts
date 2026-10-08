// In-process publish/subscribe hub for live cross-role propagation.
//
// Every role (superadmin / corporate / creator) reads from ONE PostgreSQL root,
// but each screen loads its data once on mount. So a successful write on the
// admin side is invisible to an already-open corporate/creator screen until a
// manual reload — it *looks* like the data "doesn't share the same root".
//
// Fix: after every successful mutation under /api, fan out a lightweight
// "something changed" signal over SSE. Receivers simply re-read the same root.
// No payload data travels — only a nudge — so no cross-tenant leakage is possible.
//
// The signal is scoped to the AFFECTED resource (company / workspaces / users),
// never to the actor: a superadmin has no company of their own, so actor-scoping
// would either leak a nudge to every tenant or miss the one that changed.

export type ChangeEvent = {
  kind: 'change';
  at: string;
  actorId: string;
  actorRole: string;
  companyId: string | null;
  workspaceIds: string[];
  userIds: string[];
  method: string;
  path: string;
};

type Subscriber = {
  userId: string;
  role: string;
  companyId: string | null;
  workspaceIds: Set<string>;
  write: (chunk: string) => void;
};

export type Scope = { companyId: string | null; workspaceIds: string[]; userIds: string[] };

// Rows use prefixed ids (`co-` company, `org-` workspace, `usr-` user), so a
// single id string tells us exactly what kind of resource was touched. We look
// at the route params, the request body and the JSON response — whichever
// carries the affected id — and never trust the actor's own scope for this.
const classify = (value: unknown, scope: Scope) => {
  if (typeof value !== 'string' || !value) return;
  if (value.startsWith('co-')) scope.companyId = value;
  else if (value.startsWith('org-')) scope.workspaceIds.push(value);
  else if (value.startsWith('usr-')) scope.userIds.push(value);
};

export function resolveScope(input: { params?: unknown; body?: unknown; result?: unknown; actor?: { role: string; companyId?: string | null } }): Scope {
  const scope: Scope = { companyId: null, workspaceIds: [], userIds: [] };
  const visit = (source: unknown, keys: string[]) => {
    if (!source || typeof source !== 'object') return;
    const record = source as Record<string, unknown>;
    for (const key of keys) classify(record[key], scope);
  };
  visit(input.params, ['id', 'workspaceId', 'userId', 'companyId']);
  visit(input.body, ['id', 'workspaceId', 'userId', 'companyId']);
  visit(input.result, ['id', 'companyId', 'workspaceId', 'userId']);
  // A corporate actor can only ever affect their own company, so if the route
  // didn't name a company (e.g. PUT /api/corporate/settings) we scope it there.
  if (!scope.companyId && input.actor?.role === 'corporate' && input.actor.companyId) scope.companyId = input.actor.companyId;
  scope.workspaceIds = [...new Set(scope.workspaceIds)];
  scope.userIds = [...new Set(scope.userIds)];
  return scope;
}

const subscribers = new Set<Subscriber>();

/** Live SSE connection count — used by tests and health checks. */
export const subscriberCount = () => subscribers.size;

export function subscribe(input: {
  userId: string;
  role: string;
  companyId: string | null;
  workspaceIds: string[];
  write: (chunk: string) => void;
}): Subscriber {
  const sub: Subscriber = { ...input, workspaceIds: new Set(input.workspaceIds) };
  subscribers.add(sub);
  return sub;
}

export function unsubscribe(sub: Subscriber) {
  subscribers.delete(sub);
}

// A subscriber cares about a change when:
//   • they are the affected user, or
//   • they are a superadmin (global reader), or
//   • they share the affected company, or
//   • they share at least one affected workspace, or
//   • the change is global (no company/workspace/user scope could be resolved).
// Over-notifying only costs a redundant refetch of identical data; under-notifying
// is the bug we are fixing — so this errs deliberately on the side of notifying.
function relevant(sub: Subscriber, event: ChangeEvent): boolean {
  // The actor's own screens refresh themselves already; skip to avoid a feedback loop.
  if (sub.userId === event.actorId) return false;
  if (event.userIds.includes(sub.userId)) return true;
  if (sub.role === 'superadmin') return true;
  if (event.companyId && sub.companyId === event.companyId) return true;
  if (event.workspaceIds.some(id => sub.workspaceIds.has(id))) return true;
  return !event.companyId && event.workspaceIds.length === 0 && event.userIds.length === 0;
}

/** Fan a change signal out to every other relevant connected screen. */
export function publish(event: ChangeEvent): number {
  const payload = `event: change\ndata: ${JSON.stringify(event)}\n\n`;
  let delivered = 0;
  for (const sub of subscribers) {
    if (!relevant(sub, event)) continue;
    try {
      sub.write(payload);
      delivered++;
    } catch {
      subscribers.delete(sub);
    }
  }
  return delivered;
}
