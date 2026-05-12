import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LayoutService } from '../../core/layout/layout.service';

@Component({
  selector: 'app-sim',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  template: `
    <div class="page-placeholder">
      <p>Simulation: {{ moduleId() }}</p>
    </div>
  `,
  styles: [`.page-placeholder { padding: 2rem; }`],
})
export class SimComponent implements OnInit, OnDestroy {
  readonly moduleId = input.required<string>();

  private readonly layout = inject(LayoutService);

  ngOnInit(): void {
    this.layout.showBottomPanel();
  }

  ngOnDestroy(): void {
    this.layout.hideBottomPanel();
  }
}
