import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import type { AdminStats, AdminUser, PagedResult, SetRoleRequest } from './admin.models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);

  getStats() {
    return this.http.get<AdminStats>('/api/admin/stats');
  }

  getUsers(page: number, pageSize: number, search?: string) {
    let params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);
    if (search?.trim()) params = params.set('search', search.trim());
    return this.http.get<PagedResult<AdminUser>>('/api/admin/users', { params });
  }

  toggleActive(id: string) {
    return this.http.put(`/api/admin/users/${id}/toggle-active`, {});
  }

  setAdmin(id: string, request: SetRoleRequest) {
    return this.http.put(`/api/admin/users/${id}/set-admin`, request);
  }
}
