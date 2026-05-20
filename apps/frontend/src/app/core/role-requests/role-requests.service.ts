import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { RoleRequestDto } from './role-requests.models';

@Injectable({ providedIn: 'root' })
export class RoleRequestsService {
  private readonly http = inject(HttpClient);

  getMyRequest() {
    return this.http.get<RoleRequestDto | null>('/api/users/me/role-request');
  }

  submit(requestedRole: 'Student' | 'Teacher') {
    return this.http.post<RoleRequestDto>('/api/users/me/role-request', { requestedRole });
  }

  getPending() {
    return this.http.get<RoleRequestDto[]>('/api/admin/role-requests?status=Pending');
  }

  approve(id: string) {
    return this.http.post<void>(`/api/admin/role-requests/${id}/approve`, {});
  }

  reject(id: string) {
    return this.http.post<void>(`/api/admin/role-requests/${id}/reject`, {});
  }
}
