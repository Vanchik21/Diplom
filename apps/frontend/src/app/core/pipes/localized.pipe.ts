import { ChangeDetectorRef, DestroyRef, inject, Pipe, PipeTransform } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import type { LocalizedString } from '@physis/sdk';

@Pipe({ name: 'localized', standalone: true, pure: false })
export class LocalizedPipe implements PipeTransform {
  private readonly translate = inject(TranslateService);
  private readonly cdr = inject(ChangeDetectorRef);

  constructor() {
    this.translate.onLangChange
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(() => this.cdr.markForCheck());
  }

  transform(value: LocalizedString): string {
    const lang = this.translate.currentLang ?? this.translate.defaultLang ?? 'uk';
    return value[lang as keyof LocalizedString] ?? value.uk;
  }
}
