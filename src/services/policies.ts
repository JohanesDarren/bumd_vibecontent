import type { ActiveTab, DraftStatus, User, UserRole } from '../types/index.ts';

const access: Record<UserRole, ActiveTab[]> = {
  creator: ['dashboard', 'brief_studio', 'editor', 'visual_studio', 'content_scheduling', 'review_approval', 'library', 'settings_help'],
  reviewer: ['dashboard', 'review_approval', 'library', 'settings_help'],
  admin: ['dashboard', 'review_approval', 'library', 'brand_profile', 'content_scheduling', 'user_management', 'audit_log', 'settings_help']
};

export function canAccessTab(role: UserRole, tab: ActiveTab): boolean {
  return access[role].includes(tab);
}

export function canTransitionDraft(role: UserRole, current: DraftStatus, next: DraftStatus): boolean {
  if (role === 'creator') {
    return (current === 'draft' || current === 'revisi_diminta') && next === 'menunggu_review';
  }
  if (role === 'reviewer' || role === 'admin') {
    return current === 'menunggu_review' && (next === 'disetujui' || next === 'revisi_diminta' || next === 'ditolak');
  }
  return false;
}

export function filterUsersForWorkspace<T extends Pick<User, 'workspaceId'>>(users: T[], workspaceId: string): T[] {
  return users.filter(user => user.workspaceId === workspaceId);
}
