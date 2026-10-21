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

/**
 * The app reads one shared project knowledge base (`kb_vibecontent`).
 * Workspace isolation is enforced by KMS document assignment, not by
 * inventing a new RAG knowledge base per workspace.
 */
export const APP_KNOWLEDGE_BASE_ID = 'kb_vibecontent';

export function workspaceKnowledgeBaseId(_workspaceId?: string): string {
  return process.env.RAG_KNOWLEDGE_BASE_ID?.trim() || APP_KNOWLEDGE_BASE_ID;
}

export function isKnowledgeAssigned(assignments: WorkspaceKnowledgeAssignment[], workspaceId: string): boolean {
  return assignments.some(item => item.workspaceId === workspaceId && item.enabled);
}
