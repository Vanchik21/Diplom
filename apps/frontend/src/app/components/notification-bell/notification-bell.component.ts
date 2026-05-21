import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NotificationsService } from '../../core/notifications/notifications.service';
import type { NotificationDto } from '../../core/notifications/notifications.models';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.scss',
})
export class NotificationBellComponent implements OnInit {
  protected readonly svc    = inject(NotificationsService);
  private  readonly router  = inject(Router);
  private  readonly elRef   = inject(ElementRef);

  protected readonly open    = signal(false);
  protected readonly items   = signal<NotificationDto[]>([]);
  protected readonly loading = signal(false);

  ngOnInit(): void {
    this.svc.startPolling();
  }

  protected toggle(): void {
    if (this.open()) {
      this.open.set(false);
      return;
    }
    this.open.set(true);
    this.loadItems();
  }

  private loadItems(): void {
    this.loading.set(true);
    this.svc.getAll().subscribe({
      next: list => { this.items.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  protected markAllRead(): void {
    this.svc.markAllRead().subscribe(() => {
      this.items.update(list => list.map(n => ({ ...n, isRead: true })));
      this.svc.resetCount();
    });
  }

  protected clickItem(n: NotificationDto): void {
    if (!n.isRead) {
      this.svc.markRead(n.id).subscribe();
      this.items.update(list => list.map(x => x.id === n.id ? { ...x, isRead: true } : x));
      this.svc.decrementCount();
    }
    this.open.set(false);
    if (n.link) this.router.navigateByUrl(n.link);
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleString('uk-UA', {
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.elRef.nativeElement.contains(event.target)) {
      this.open.set(false);
    }
  }
}
