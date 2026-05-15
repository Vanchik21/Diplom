import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-privacy',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  templateUrl: './privacy.component.html',
  styleUrl: './privacy.component.scss',
})
export class PrivacyComponent implements OnInit, OnDestroy {
  private readonly translate = inject(TranslateService);
  protected readonly currentLang = signal(this.translate.currentLang ?? this.translate.defaultLang ?? 'uk');
  private sub!: Subscription;

  ngOnInit(): void {
    this.sub = this.translate.onLangChange.subscribe(e => this.currentLang.set(e.lang));
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
