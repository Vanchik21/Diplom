import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LayoutService {
  readonly sidebarCollapsed = signal(false);
  readonly bottomPanelVisible = signal(false);

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }

  showBottomPanel(): void {
    this.bottomPanelVisible.set(true);
  }

  hideBottomPanel(): void {
    this.bottomPanelVisible.set(false);
  }
}
