import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import type { FormulaSpec } from '@physis/sdk';
import katex from 'katex';
import { LocalizedPipe } from '../../../../core/pipes/localized.pipe';

@Component({
  selector: 'app-formula-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LocalizedPipe],
  templateUrl: './formula-panel.component.html',
  styleUrl: './formula-panel.component.scss',
})
export class FormulaPanelComponent {
  readonly formulas = input.required<FormulaSpec[]>();

  private readonly sanitizer = inject(DomSanitizer);

  protected renderLatex(latex: string): SafeHtml {
    const html = katex.renderToString(latex, {
      throwOnError: false,
      displayMode: true,
    });
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
