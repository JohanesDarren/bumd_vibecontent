export type WorkspaceKnowledgeAssignment = { workspaceId: string; enabled: boolean };

export function normalizeWorkspaceAssignments(raw: unknown, fallbackWorkspaceId?: string): WorkspaceKnowledgeAssignment[] {
  if (raw === undefined) return fallbackWorkspaceId ? [{ workspaceId: fallbackWorkspaceId, enabled: true }] : [];
  if (!Array.isArray(raw)) return [];
  const unique = new Map<string, WorkspaceKnowledgeAssignment>();
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const value = item as Record<string, unknown>;
    if (typeof value.workspaceId !== 'string' || !value.workspaceId.trim() || typeof value.enabled !== 'boolean') continue;
    if (!unique.has(value.workspaceId)) unique.set(value.workspaceId, { workspaceId: value.workspaceId, enabled: value.enabled });
  }
  return [...unique.values()];
}

export function workspaceKnowledgeBaseId(workspaceId: string): string {
  const safe = workspaceId.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 180);
  return `kb-vibecontent-ws-${safe}`;
}

export function isKnowledgeAssigned(assignments: WorkspaceKnowledgeAssignment[], workspaceId: string): boolean {
  return assignments.some(item => item.workspaceId === workspaceId && item.enabled);
}
