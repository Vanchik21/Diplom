import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { RoleRequestsService } from '../../../core/role-requests/role-requests.service';
import type { RoleRequestDto } from '../../../core/role-requests/role-requests.models';

@Component({
  selector: 'app-admin-role-requests',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule, FormsModule, DatePipe],
  templateUrl: './admin-role-requests.component.html',
  styleUrl: './admin-role-requests.component.scss',
})
export class AdminRoleRequestsComponent implements OnInit {
  private readonly service = inject(RoleRequestsService);

  protected readonly requests   = signal<RoleRequestDto[]>([]);
  protected readonly loading    = signal(true);
  protected readonly busyIds    = signal<Set<string>>(new Set());
  protected readonly modalReq   = signal<RoleRequestDto | null>(null);
  protected selectedRole: 'Student' | 'Teacher' = 'Student';

  ngOnInit(): void { this.load(); }

  private load(): void {
    this.loading.set(true);
    this.service.getPending().subscribe({
      next: list => { this.requests.set(list); this.loading.set(false); },
      error: ()   => this.loading.set(false),
    });
  }

  protected openModal(req: RoleRequestDto): void {
    this.selectedRole = req.requestedRole;
    this.modalReq.set(req);
  }

  protected closeModal(): void {
    this.modalReq.set(null);
  }

  protected approve(): void {
    const req = this.modalReq();
    if (!req) return;
    this.closeModal();
    this.setBusy(req.id, true);
    this.service.approve(req.id, this.selectedRole).subscribe({
      next: () => {
        this.requests.update(list => list.filter(r => r.id !== req.id));
        this.setBusy(req.id, false);
      },
      error: () => this.setBusy(req.id, false),
    });
  }

  protected reject(req: RoleRequestDto): void {
    this.setBusy(req.id, true);
    this.service.reject(req.id).subscribe({
      next: () => {
        this.requests.update(list => list.filter(r => r.id !== req.id));
        this.setBusy(req.id, false);
      },
      error: () => this.setBusy(req.id, false),
    });
  }

  protected isBusy(id: string): boolean { return this.busyIds().has(id); }

  private setBusy(id: string, busy: boolean): void {
    this.busyIds.update(set => {
      const next = new Set(set);
      if (busy) next.add(id); else next.delete(id);
      return next;
    });
  }
}
