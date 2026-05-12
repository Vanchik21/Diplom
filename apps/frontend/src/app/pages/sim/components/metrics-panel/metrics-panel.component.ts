import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { Metrics } from '@physis/sdk';

@Component({
  selector: 'app-metrics-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  templateUrl: './metrics-panel.component.html',
  styleUrl: './metrics-panel.component.scss',
})
export class MetricsPanelComponent {
  readonly metrics = input.required<Metrics>();

  protected get scalarEntries(): Array<{ key: string; value: number }> {
    return Object.entries(this.metrics().scalars).map(([key, value]) => ({
      key,
      value,
    }));
  }
}
