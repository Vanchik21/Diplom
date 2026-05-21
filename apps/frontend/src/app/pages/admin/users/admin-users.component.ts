import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe, LowerCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AdminService } from '../../../core/admin/admin.service';
import { AuthService } from '../../../core/auth/auth.service';
import type { AdminStats, AdminUser } from '../../../core/admin/admin.models';

const PAGE_SIZE = 15;

@Component({
  selector: 'app-admin-users',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule, FormsModule, DatePipe, LowerCasePipe],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.scss',
})
export class AdminUsersComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly auth = inject(AuthService);

  protected readonly currentUserId = computed(() => {
    const token = this.auth.accessToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return (payload['sub'] as string) ?? null;
    } catch { return null; }
  });

  protected readonly stats      = signal<AdminStats | null>(null);
  protected readonly users      = signal<AdminUser[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly page       = signal(1);
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / PAGE_SIZE)));
  protected readonly loading    = signal(true);
  protected readonly loadError  = signal(false);
  protected readonly actionError = signal<string | null>(null);
  protected readonly busyIds    = signal<Set<string>>(new Set());
  protected readonly confirmDeleteId = signal<string | null>(null);

  protected searchValue = '';
  protected roleFilter  = '';
  protected activeFilter = '';

  private search = '';
  private role   = '';
  private isActive: boolean | undefined;

  ngOnInit(): void {
    this.loadStats();
    this.loadUsers();
  }

  private loadStats(): void {
    this.adminService.getStats().subscribe({ next: s => this.stats.set(s), error: () => {} });
  }

  private loadUsers(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.adminService.getUsers(this.page(), PAGE_SIZE, this.search, this.role, this.isActive).subscribe({
      next: r => {
        this.users.set(r.items);
        this.totalCount.set(r.totalCount);
        this.loading.set(false);
      },
      error: () => { this.loadError.set(true); this.loading.set(false); },
    });
  }

  protected onSearch(): void {
    this.search = this.searchValue;
    this.role = this.roleFilter;
    this.isActive = this.activeFilter === '' ? undefined
      : this.activeFilter === 'true';
    this.page.set(1);
    this.loadUsers();
  }

  protected goToPage(p: number): void {
    if (p < 1 || p > this.totalPages()) return;
    this.page.set(p);
    this.loadUsers();
  }

  protected deactivate(user: AdminUser): void {
    this.setBusy(user.id, true);
    this.actionError.set(null);
    this.adminService.deactivate(user.id).subscribe({
      next: () => { this.setBusy(user.id, false); this.loadUsers(); this.loadStats(); },
      error: () => { this.setBusy(user.id, false); this.actionError.set('admin.actionError'); },
    });
  }

  protected activate(user: AdminUser): void {
    this.setBusy(user.id, true);
    this.actionError.set(null);
    this.adminService.activate(user.id).subscribe({
      next: () => { this.setBusy(user.id, false); this.loadUsers(); this.loadStats(); },
      error: () => { this.setBusy(user.id, false); this.actionError.set('admin.actionError'); },
    });
  }

  protected requestDelete(id: string): void {
    this.confirmDeleteId.set(id);
  }

  protected cancelDelete(): void {
    this.confirmDeleteId.set(null);
  }

  protected confirmDelete(user: AdminUser): void {
    this.confirmDeleteId.set(null);
    this.setBusy(user.id, true);
    this.actionError.set(null);
    this.adminService.deleteUser(user.id).subscribe({
      next: () => { this.setBusy(user.id, false); this.loadUsers(); this.loadStats(); },
      error: () => { this.setBusy(user.id, false); this.actionError.set('admin.actionError'); },
    });
  }

  protected isBusy(id: string): boolean { return this.busyIds().has(id); }
  protected isSelf(id: string): boolean  { return id === this.currentUserId(); }

  protected displayName(u: AdminUser): string {
    const full = [u.firstName, u.lastName].filter(Boolean).join(' ');
    return full || u.userName;
  }

  private setBusy(id: string, busy: boolean): void {
    this.busyIds.update(set => {
      const next = new Set(set);
      if (busy) next.add(id); else next.delete(id);
      return next;
    });
  }
}
