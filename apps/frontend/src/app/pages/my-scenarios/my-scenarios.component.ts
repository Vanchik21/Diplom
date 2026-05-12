import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ScenarioService } from '../../core/scenarios/scenario.service';
import { ScenarioLoadService } from '../../core/scenarios/scenario-load.service';
import type { Scenario } from '../../core/scenarios/scenario.models';

@Component({
  selector: 'app-my-scenarios',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  templateUrl: './my-scenarios.component.html',
  styleUrl: './my-scenarios.component.scss',
})
export class MyScenariosComponent implements OnInit {
  private readonly scenarioService = inject(ScenarioService);
  private readonly scenarioLoader = inject(ScenarioLoadService);
  private readonly router = inject(Router);

  protected readonly scenarios = signal<Scenario[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly deletingId = signal<string | null>(null);

  ngOnInit(): void {
    this.loadScenarios();
  }

  private loadScenarios(): void {
    this.loading.set(true);
    this.error.set(false);

    this.scenarioService.getAll().subscribe({
      next: list => {
        this.scenarios.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  protected loadScenario(scenario: Scenario): void {
    const params = JSON.parse(scenario.paramsJson) as Record<string, unknown>;
    this.scenarioLoader.schedule(params);
    this.router.navigate(['/sim', scenario.moduleId]);
  }

  protected deleteScenario(scenario: Scenario): void {
    this.deletingId.set(scenario.id);

    this.scenarioService.delete(scenario.id).subscribe({
      next: () => {
        this.scenarios.update(list => list.filter(s => s.id !== scenario.id));
        this.deletingId.set(null);
      },
      error: () => this.deletingId.set(null),
    });
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}
