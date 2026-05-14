import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { UpdateProfileRequest, UserProfile } from './profile.models';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);

  getProfile() {
    return this.http.get<UserProfile>('/api/profile');
  }

  updateProfile(request: UpdateProfileRequest) {
    return this.http.put<UserProfile>('/api/profile', request);
  }

  uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ avatarUrl: string }>('/api/profile/avatar', formData);
  }
}
