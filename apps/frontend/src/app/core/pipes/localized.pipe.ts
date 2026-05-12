import { inject, Pipe, PipeTransform } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import type { LocalizedString } from '@physis/sdk';

@Pipe({ name: 'localized', standalone: true, pure: false })
export class LocalizedPipe implements PipeTransform {
  private readonly translate = inject(TranslateService);

  transform(value: LocalizedString): string {
    const lang = this.translate.currentLang ?? 'uk';
    return value[lang as keyof LocalizedString] ?? value.uk;
  }
}
