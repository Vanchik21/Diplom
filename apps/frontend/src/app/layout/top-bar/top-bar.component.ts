import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/auth.service';
import { LayoutService } from '../../core/layout/layout.service';

@Component({
  selector: 'app-top-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslateModule],
  templateUrl: './top-bar.component.html',
  styleUrl: './top-bar.component.scss',
})
export class TopBarComponent {
  protected readonly auth = inject(AuthService);
  protected readonly layout = inject(LayoutService);
  protected readonly translate = inject(TranslateService);

  protected toggleLanguage(): void {
    const next = this.translate.currentLang === 'uk' ? 'en' : 'uk';
    this.translate.use(next);
  }

  protected get currentLang(): string {
    return this.translate.currentLang ?? 'uk';
  }
}
