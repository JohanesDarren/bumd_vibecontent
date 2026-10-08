import type { ActiveTab, DraftStatus, User, UserRole } from '../types/index.ts';

const access: Record<UserRole, ActiveTab[]> = {
  creator: ['dashboard', 'brief_studio', 'editor', 'visual_studio', 'content_scheduling', 'library', 'settings_help'],
  reviewer: ['dashboard', 'library', 'content_scheduling', 'settings_help', 'editor', 'visual_studio'],
  admin: ['dashboard', 'brief_studio', 'editor', 'visual_studio', 'library', 'brand_profile', 'knowledge_base', 'content_scheduling', 'user_management', 'audit_log', 'settings_help']
};

export function canAccessTab(role: UserRole, tab: ActiveTab): boolean {
  if (!access[role]) return false;
  return access[role].includes(tab);
}

export function canTransitionDraft(role: UserRole, current: DraftStatus, next: DraftStatus): boolean {
  return (role === 'creator' || role === 'superadmin')
    && (current === 'draft' || current === 'revisi_diminta' || current === 'menunggu_review')
    && next === 'disetujui';
}

export function filterUsersForWorkspace<T extends Pick<User, 'workspaceId'>>(users: T[], workspaceId: string): T[] {
  return users.filter(user => user.workspaceId === workspaceId);
}
