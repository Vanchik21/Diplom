import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import type { NotificationDto } from './notifications.models';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/notifications';

  readonly unreadCount = signal(0);

  startPolling(): void {
    this.fetchCount();
    interval(30_000).pipe(
      switchMap(() => this.http.get<{ count: number }>(`${this.base}/unread-count`)),
    ).subscribe(r => this.unreadCount.set(r.count));
  }

  private fetchCount(): void {
    this.http.get<{ count: number }>(`${this.base}/unread-count`)
      .subscribe(r => this.unreadCount.set(r.count));
  }

  getAll() {
    return this.http.get<NotificationDto[]>(this.base);
  }

  markRead(id: string) {
    return this.http.patch<void>(`${this.base}/${id}/read`, {});
  }

  markAllRead() {
    return this.http.patch<void>(`${this.base}/read-all`, {});
  }

  decrementCount(): void {
    this.unreadCount.update(n => Math.max(0, n - 1));
  }

  resetCount(): void {
    this.unreadCount.set(0);
  }
}
