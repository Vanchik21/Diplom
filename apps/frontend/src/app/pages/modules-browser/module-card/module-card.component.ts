import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LocalizedPipe } from '../../../core/pipes/localized.pipe';
import type { RegistryEntry } from '../../../physics-modules/registry.service';

@Component({
  selector: 'app-module-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslateModule, LocalizedPipe],
  templateUrl: './module-card.component.html',
  styleUrl: './module-card.component.scss',
})
export class ModuleCardComponent {
  readonly entry = input.required<RegistryEntry>();
}
