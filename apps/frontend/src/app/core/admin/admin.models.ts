export interface AdminUser {
  id: string;
  email: string;
  userName: string;
  firstName: string;
  lastName: string;
  university: string;
  avatarUrl: string | null;
  isActive: boolean;
  isDeleted: boolean;
  isAdmin: boolean;
  role: 'Admin' | 'Teacher' | 'Student' | 'User';
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  totalScenarios: number;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface SetRoleRequest {
  isAdmin: boolean;
}

export interface AdminAuditLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  targetUserId: string;
  targetUserName: string;
  details: string | null;
  createdAt: string;
}
