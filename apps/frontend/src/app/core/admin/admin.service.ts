import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import type { AdminAuditLog, AdminStats, AdminUser, PagedResult, SetRoleRequest } from './admin.models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);

  getStats() {
    return this.http.get<AdminStats>('/api/admin/stats');
  }

  getUsers(page: number, pageSize: number, search?: string, role?: string, isActive?: boolean) {
    let params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);
    if (search?.trim()) params = params.set('search', search.trim());
    if (role)            params = params.set('role', role);
    if (isActive != null) params = params.set('isActive', String(isActive));
    return this.http.get<PagedResult<AdminUser>>('/api/admin/users', { params });
  }

  deactivate(id: string) {
    return this.http.patch(`/api/admin/users/${id}/deactivate`, {});
  }

  activate(id: string) {
    return this.http.patch(`/api/admin/users/${id}/activate`, {});
  }

  deleteUser(id: string) {
    return this.http.delete(`/api/admin/users/${id}`);
  }

  setAdmin(id: string, request: SetRoleRequest) {
    return this.http.put(`/api/admin/users/${id}/set-admin`, request);
  }

  getAuditLog(page: number, pageSize: number, action?: string) {
    let params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);
    if (action) params = params.set('action', action);
    return this.http.get<PagedResult<AdminAuditLog>>('/api/admin/audit-log', { params });
  }
}
