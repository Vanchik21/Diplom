export interface AdminUser {
  id: string;
  email: string;
  userName: string;
  firstName: string;
  lastName: string;
  university: string;
  avatarUrl: string | null;
  isActive: boolean;
  isAdmin: boolean;
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
