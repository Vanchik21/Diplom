import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AdminService } from '../../core/admin/admin.service';
import { AuthService } from '../../core/auth/auth.service';
import type { AdminStats, AdminUser } from '../../core/admin/admin.models';

const PAGE_SIZE = 15;

@Component({
  selector: 'app-admin',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule, FormsModule, DatePipe],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
})
export class AdminComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly auth = inject(AuthService);

  protected readonly currentUserId = computed(() => {
    const token = this.auth.accessToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return (payload['sub'] as string) ?? null;
    } catch {
      return null;
    }
  });

  protected readonly stats = signal<AdminStats | null>(null);
  protected readonly users = signal<AdminUser[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly page = signal(1);
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalCount() / PAGE_SIZE))
  );

  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  protected readonly search = signal('');
  protected readonly actionError = signal<string | null>(null);
  protected readonly busyIds = signal<Set<string>>(new Set());

  protected searchValue = '';

  ngOnInit(): void {
    this.loadStats();
    this.loadUsers();
  }

  private loadStats(): void {
    this.adminService.getStats().subscribe({
      next: s => this.stats.set(s),
      error: () => {},
    });
  }

  private loadUsers(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.adminService.getUsers(this.page(), PAGE_SIZE, this.search()).subscribe({
      next: result => {
        this.users.set(result.items);
        this.totalCount.set(result.totalCount);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      },
    });
  }

  protected onSearch(): void {
    this.search.set(this.searchValue);
    this.page.set(1);
    this.loadUsers();
  }

  protected goToPage(p: number): void {
    if (p < 1 || p > this.totalPages()) return;
    this.page.set(p);
    this.loadUsers();
  }

  protected toggleActive(user: AdminUser): void {
    this.setBusy(user.id, true);
    this.actionError.set(null);
    this.adminService.toggleActive(user.id).subscribe({
      next: () => {
        this.setBusy(user.id, false);
        this.loadUsers();
        this.loadStats();
      },
      error: () => {
        this.setBusy(user.id, false);
        this.actionError.set('admin.actionError');
      },
    });
  }

  protected toggleAdmin(user: AdminUser): void {
    this.setBusy(user.id, true);
    this.actionError.set(null);
    this.adminService.setAdmin(user.id, { isAdmin: !user.isAdmin }).subscribe({
      next: () => {
        this.setBusy(user.id, false);
        this.loadUsers();
        this.loadStats();
      },
      error: () => {
        this.setBusy(user.id, false);
        this.actionError.set('admin.actionError');
      },
    });
  }

  protected isBusy(id: string): boolean {
    return this.busyIds().has(id);
  }

  protected isSelf(id: string): boolean {
    return id === this.currentUserId();
  }

  protected displayName(user: AdminUser): string {
    const full = [user.firstName, user.lastName].filter(Boolean).join(' ');
    return full || user.userName;
  }

  private setBusy(id: string, busy: boolean): void {
    this.busyIds.update(set => {
      const next = new Set(set);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }
}
