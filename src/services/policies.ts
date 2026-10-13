import type { ActiveTab, AuthUser, User, UserRole } from '../types/index.ts';

export function resolveDraftActor(activeUser: User | null, authUser: AuthUser | null, workspaceId: string): User | null {
  if (activeUser?.workspaceId === workspaceId) return activeUser;
  if (!authUser?.workspaces.some(workspace => workspace.id === workspaceId)) return null;
  return { id: authUser.id, name: authUser.name, email: authUser.email, role: authUser.role, workspaceId, avatar: '', title: '', department: '' };
}

const access: Record<UserRole, ActiveTab[]> = {
  creator: ['dashboard', 'brief_studio', 'editor', 'visual_studio', 'content_scheduling', 'library'],
  corporate: ['dashboard', 'content_scheduling', 'user_management', 'corporate_management', 'corporate_users', 'knowledge_base', 'settings_help'],
  superadmin: ['dashboard', 'brief_studio', 'editor', 'visual_studio', 'library', 'brand_profile', 'knowledge_base', 'content_scheduling', 'user_management', 'admin_management', 'audit_log', 'settings_help']
};

export function canAccessTab(role: UserRole, tab: ActiveTab): boolean {
  if (!access[role]) return false;
  return access[role].includes(tab);
}

export function filterUsersForWorkspace<T extends Pick<User, 'workspaceId'>>(users: T[], workspaceId: string): T[] {
  return users.filter(user => user.workspaceId === workspaceId);
}
