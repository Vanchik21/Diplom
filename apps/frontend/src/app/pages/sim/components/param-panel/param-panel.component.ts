import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import type { ParamSpec } from '@physis/sdk';
import { LocalizedPipe } from '../../../../core/pipes/localized.pipe';

@Component({
  selector: 'app-param-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslateModule, LocalizedPipe],
  templateUrl: './param-panel.component.html',
  styleUrl: './param-panel.component.scss',
})
export class ParamPanelComponent implements OnInit {
  readonly paramSpecs = input.required<Record<string, ParamSpec>>();
  readonly apply = output<Record<string, unknown>>();
  readonly resetSim = output<void>();

  protected readonly values = signal<Record<string, unknown>>({});

  protected get entries(): Array<{ key: string; spec: ParamSpec }> {
    return Object.entries(this.paramSpecs()).map(([key, spec]) => ({ key, spec }));
  }

  constructor() {
    effect(() => {
      const specs = this.paramSpecs();
      const initial: Record<string, unknown> = {};
      for (const [key, spec] of Object.entries(specs)) {
        initial[key] = spec.default;
      }
      this.values.set(initial);
    });
  }

  ngOnInit(): void {}

  protected getValue(key: string): unknown {
    return this.values()[key];
  }

  protected setValue(key: string, value: unknown): void {
    this.values.update(prev => ({ ...prev, [key]: value }));
  }

  protected onApply(): void {
    this.apply.emit({ ...this.values() });
  }

  protected onReset(): void {
    this.resetSim.emit();
  }

  protected asNumber(value: unknown): number {
    return Number(value);
  }
}
