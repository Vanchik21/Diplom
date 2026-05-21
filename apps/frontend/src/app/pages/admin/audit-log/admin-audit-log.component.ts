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
import type { AdminAuditLog } from '../../../core/admin/admin.models';

const PAGE_SIZE = 25;

const ACTIONS = ['Deactivate', 'Activate', 'Delete', 'ApproveRole', 'RejectRole'];

@Component({
  selector: 'app-admin-audit-log',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule, FormsModule, DatePipe, LowerCasePipe],
  templateUrl: './admin-audit-log.component.html',
  styleUrl: './admin-audit-log.component.scss',
})
export class AdminAuditLogComponent implements OnInit {
  private readonly service = inject(AdminService);

  protected readonly logs       = signal<AdminAuditLog[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly page       = signal(1);
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / PAGE_SIZE)));
  protected readonly loading    = signal(true);
  protected readonly actions    = ACTIONS;

  protected actionFilter = '';

  ngOnInit(): void { this.load(); }

  private load(): void {
    this.loading.set(true);
    this.service.getAuditLog(this.page(), PAGE_SIZE, this.actionFilter || undefined).subscribe({
      next: r => {
        this.logs.set(r.items);
        this.totalCount.set(r.totalCount);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected onFilter(): void {
    this.page.set(1);
    this.load();
  }

  protected goToPage(p: number): void {
    if (p < 1 || p > this.totalPages()) return;
    this.page.set(p);
    this.load();
  }
}
