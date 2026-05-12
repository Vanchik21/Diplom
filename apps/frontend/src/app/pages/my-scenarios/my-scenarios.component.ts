import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-my-scenarios',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  template: `
    <div class="page-placeholder">
      <h2>{{ 'nav.myScenarios' | translate }}</h2>
    </div>
  `,
  styles: [`.page-placeholder { padding: 2rem; }`],
})
export class MyScenariosComponent {}
