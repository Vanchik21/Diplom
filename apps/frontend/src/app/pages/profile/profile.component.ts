import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  template: `
    <div class="page-placeholder">
      <h2>{{ 'nav.profile' | translate }}</h2>
      <p>{{ auth.currentUserName() }}</p>
    </div>
  `,
  styles: [`.page-placeholder { padding: 2rem; display: flex; flex-direction: column; gap: 0.5rem; }`],
})
export class ProfileComponent {
  protected readonly auth = inject(AuthService);
}
