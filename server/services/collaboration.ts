/**
 * Collaboration Service
 * Handles multi-user project sharing, permissions, and real-time presence
 */

export type UserRole = 'owner' | 'editor' | 'viewer' | 'commenter';

export interface ProjectShare {
  id: number;
  projectId: number;
  userId: number;
  userEmail: string;
  userName: string;
  role: UserRole;
  sharedAt: Date;
  lastAccessedAt?: Date;
}

export interface UserPresence {
  userId: number;
  userName: string;
  userEmail: string;
  isOnline: boolean;
  lastSeen: Date;
  currentTab?: string;
  cursorPosition?: { x: number; y: number };
}

export interface ProjectComment {
  id: number;
  projectId: number;
  userId: number;
  userName: string;
  userEmail: string;
  content: string;
  timestamp: Date;
  resolved: boolean;
  replies?: ProjectComment[];
}

export interface ActivityLog {
  id: number;
  projectId: number;
  userId: number;
  userName: string;
  action: string;
  details: string;
  timestamp: Date;
}

/**
 * Check if user has permission to perform action
 */
export function hasPermission(role: UserRole, action: string): boolean {
  const permissions: Record<UserRole, string[]> = {
    owner: ['view', 'edit', 'delete', 'share', 'manage_permissions', 'export'],
    editor: ['view', 'edit', 'export', 'comment'],
    commenter: ['view', 'comment'],
    viewer: ['view'],
  };
  
  return permissions[role]?.includes(action) ?? false;
}

/**
 * Get role hierarchy level (higher = more permissions)
 */
export function getRoleLevel(role: UserRole): number {
  const levels: Record<UserRole, number> = {
    owner: 4,
    editor: 3,
    commenter: 2,
    viewer: 1,
  };
  
  return levels[role];
}

/**
 * Check if user can change another user's role
 */
export function canChangeRole(userRole: UserRole, targetRole: UserRole): boolean {
  return getRoleLevel(userRole) > getRoleLevel(targetRole);
}

/**
 * Check if user can remove another user from project
 */
export function canRemoveUser(userRole: UserRole, targetRole: UserRole): boolean {
  return getRoleLevel(userRole) > getRoleLevel(targetRole);
}

/**
 * Get suggested role based on user type
 */
export function getSuggestedRole(userType: 'team_member' | 'client' | 'stakeholder'): UserRole {
  const suggestions: Record<string, UserRole> = {
    team_member: 'editor',
    client: 'commenter',
    stakeholder: 'viewer',
  };
  
  return suggestions[userType] ?? 'viewer';
}

/**
 * Format activity log message
 */
export function formatActivityLog(log: ActivityLog): string {
  const timestamp = new Date(log.timestamp).toLocaleString();
  return `${log.userName} ${log.action} at ${timestamp}`;
}

/**
 * Get user presence status
 */
export function getUserPresenceStatus(presence: UserPresence): 'online' | 'away' | 'offline' {
  if (!presence.isOnline) return 'offline';
  
  const now = new Date();
  const lastSeenTime = new Date(presence.lastSeen).getTime();
  const timeDiff = now.getTime() - lastSeenTime;
  const minutesDiff = timeDiff / (1000 * 60);
  
  return minutesDiff > 5 ? 'away' : 'online';
}

/**
 * Format last seen time
 */
export function formatLastSeen(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return new Date(date).toLocaleDateString();
}

/**
 * Create activity log entry
 */
export function createActivityLog(
  projectId: number,
  userId: number,
  userName: string,
  action: string,
  details: string
): ActivityLog {
  return {
    id: 0, // Will be assigned by database
    projectId,
    userId,
    userName,
    action,
    details,
    timestamp: new Date(),
  };
}

/**
 * Check if comment is resolved
 */
export function isCommentResolved(comment: ProjectComment): boolean {
  return comment.resolved;
}

/**
 * Get comment thread (comment + all replies)
 */
export function getCommentThread(comment: ProjectComment): ProjectComment[] {
  const thread: ProjectComment[] = [comment];
  
  if (comment.replies && comment.replies.length > 0) {
    thread.push(...comment.replies);
  }
  
  return thread;
}

/**
 * Count unresolved comments
 */
export function countUnresolvedComments(comments: ProjectComment[]): number {
  return comments.filter(c => !c.resolved).length;
}

/**
 * Get comments by user
 */
export function getCommentsByUser(comments: ProjectComment[], userId: number): ProjectComment[] {
  return comments.filter(c => c.userId === userId);
}

/**
 * Get recent activity (last N entries)
 */
export function getRecentActivity(logs: ActivityLog[], limit: number = 10): ActivityLog[] {
  return logs
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

/**
 * Get activity by user
 */
export function getActivityByUser(logs: ActivityLog[], userId: number): ActivityLog[] {
  return logs.filter(log => log.userId === userId);
}

/**
 * Get activity by action type
 */
export function getActivityByAction(logs: ActivityLog[], action: string): ActivityLog[] {
  return logs.filter(log => log.action === action);
}

/**
 * Get active users (online right now)
 */
export function getActiveUsers(presences: UserPresence[]): UserPresence[] {
  return presences.filter(p => getUserPresenceStatus(p) === 'online');
}

/**
 * Get away users
 */
export function getAwayUsers(presences: UserPresence[]): UserPresence[] {
  return presences.filter(p => getUserPresenceStatus(p) === 'away');
}

/**
 * Check if multiple users are editing same project
 */
export function hasMultipleEditors(shares: ProjectShare[]): boolean {
  const editors = shares.filter(s => s.role === 'editor' || s.role === 'owner');
  return editors.length > 1;
}

/**
 * Get project collaborators
 */
export function getCollaborators(shares: ProjectShare[]): ProjectShare[] {
  return shares.filter(s => s.role !== 'viewer');
}

/**
 * Format share notification
 */
export function formatShareNotification(share: ProjectShare): string {
  return `${share.userName} (${share.userEmail}) was added as ${share.role}`;
}

/**
 * Check if user can be invited (not already shared)
 */
export function canInviteUser(shares: ProjectShare[], userEmail: string): boolean {
  return !shares.some(s => s.userEmail === userEmail);
}

/**
 * Get share expiry status
 */
export function getShareExpiryStatus(share: ProjectShare, expiryDays?: number): 'active' | 'expiring_soon' | 'expired' {
  if (!expiryDays) return 'active';
  
  const now = new Date();
  const sharedDate = new Date(share.sharedAt);
  const expiryDate = new Date(sharedDate.getTime() + expiryDays * 24 * 60 * 60 * 1000);
  const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  
  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry < 7) return 'expiring_soon';
  
  return 'active';
}


/**
 * Advanced collaboration features
 */

// In-memory stores for real-time features
const userPresenceMap = new Map<string, UserPresence>();
const projectComments = new Map<number, ProjectComment[]>();
const activityLogs = new Map<number, ActivityLog[]>();

/**
 * Update user presence
 */
export function updateUserPresence(projectId: number, presence: UserPresence): void {
  const key = `${projectId}_${presence.userId}`;
  userPresenceMap.set(key, { ...presence, lastSeen: new Date() });
}

/**
 * Get active users in project
 */
export function getProjectActiveUsers(projectId: number): UserPresence[] {
  const users: UserPresence[] = [];
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

  userPresenceMap.forEach((presence, key) => {
    if (key.startsWith(`${projectId}_`) && new Date(presence.lastSeen).getTime() > fiveMinutesAgo) {
      users.push(presence);
    }
  });

  return users;
}

/**
 * Add comment to project
 */
export function addProjectComment(comment: ProjectComment): void {
  if (!projectComments.has(comment.projectId)) {
    projectComments.set(comment.projectId, []);
  }
  projectComments.get(comment.projectId)!.push(comment);
}

/**
 * Get project comments
 */
export function getProjectCommentsList(projectId: number): ProjectComment[] {
  return projectComments.get(projectId) || [];
}

/**
 * Log project activity
 */
export function logProjectActivity(activity: ActivityLog): void {
  if (!activityLogs.has(activity.projectId)) {
    activityLogs.set(activity.projectId, []);
  }
  const logs = activityLogs.get(activity.projectId)!;
  logs.push(activity);

  // Keep only last 1000 activities
  if (logs.length > 1000) {
    logs.shift();
  }
}

/**
 * Get project activity log
 */
export function getProjectActivityLog(projectId: number, limit: number = 50): ActivityLog[] {
  const logs = activityLogs.get(projectId) || [];
  return logs.slice(-limit);
}

/**
 * Clean up old presence data
 */
export function cleanupOldPresence(): number {
  let cleaned = 0;
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const keysToDelete: string[] = [];

  userPresenceMap.forEach((presence, key) => {
    if (new Date(presence.lastSeen).getTime() < oneHourAgo) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach((key) => {
    userPresenceMap.delete(key);
    cleaned++;
  });

  return cleaned;
}
