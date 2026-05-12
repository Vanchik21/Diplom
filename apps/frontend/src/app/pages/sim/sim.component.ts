import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import type { Metrics, ParamSpec, PhysicsModule } from '@physis/sdk';
import type { Scene } from '@babylonjs/core';
import { LocalizedPipe } from '../../core/pipes/localized.pipe';
import { ModuleRegistryService } from '../../physics-modules/registry.service';
import {
  BabylonAdapterComponent,
  type BabylonFrameFn,
  type BabylonSetupFn,
} from '../../rendering/babylon/babylon-adapter.component';
import { isBabylonRenderable } from '../../rendering/babylon/babylon-renderable';
import { PoeWorkflowComponent } from '../../components/poe-workflow/poe-workflow.component';
import { ChartPanelComponent } from './components/chart-panel/chart-panel.component';
import { FormulaPanelComponent } from './components/formula-panel/formula-panel.component';
import { MetricsPanelComponent } from './components/metrics-panel/metrics-panel.component';
import { ParamPanelComponent } from './components/param-panel/param-panel.component';
import { AuthService } from '../../core/auth/auth.service';
import { ScenarioService } from '../../core/scenarios/scenario.service';
import { ScenarioLoadService } from '../../core/scenarios/scenario-load.service';

@Component({
  selector: 'app-sim',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslateModule,
    LocalizedPipe,
    BabylonAdapterComponent,
    PoeWorkflowComponent,
    ParamPanelComponent,
    MetricsPanelComponent,
    ChartPanelComponent,
    FormulaPanelComponent,
  ],
  templateUrl: './sim.component.html',
  styleUrl: './sim.component.scss',
})
export class SimComponent implements OnInit, OnDestroy {
  readonly moduleId = input.required<string>();

  private readonly registry = inject(ModuleRegistryService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly scenarioService = inject(ScenarioService);
  private readonly scenarioLoader = inject(ScenarioLoadService);

  protected readonly entry = computed(() => this.registry.getById(this.moduleId()));
  protected readonly notFound = computed(() => !this.entry());
  protected readonly isAuthenticated = this.auth.isAuthenticated;

  protected readonly metrics = signal<Metrics>({ scalars: {}, timeSeries: {} });
  protected readonly paused = signal(false);
  protected readonly module = signal<PhysicsModule | null>(null);

  protected readonly savePanelOpen = signal(false);
  protected readonly saveName = signal('');
  protected readonly saveStatus = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');

  protected setupFn: BabylonSetupFn | undefined;
  protected frameFn: BabylonFrameFn | undefined;

  private currentParams: Record<string, unknown> = {};

  ngOnInit(): void {
    const entry = this.entry();
    if (!entry) {
      this.router.navigate(['/modules']);
      return;
    }

    const pending = this.scenarioLoader.consume();
    const defaults = this.extractDefaults(entry.meta.defaultParams);
    const initParams = pending ?? defaults;

    this.currentParams = initParams;

    const mod = new entry.factory();
    mod.init(initParams as never);
    this.module.set(mod);

    if (isBabylonRenderable(mod)) {
      this.setupFn = (scene: Scene) => mod.babylonSetup(scene);
      this.frameFn = (scene: Scene, dt: number) => {
        mod.step(dt);
        mod.babylonFrame(scene);
        this.metrics.set(mod.getMetrics());
      };
    }
  }

  protected onApplyParams(params: Record<string, unknown>): void {
    const mod = this.module();
    if (!mod) return;
    this.currentParams = params;
    mod.init(params as never);
    this.metrics.set(mod.getMetrics());
  }

  protected onResetSim(): void {
    const mod = this.module();
    if (!mod) return;
    mod.reset();
    this.metrics.set(mod.getMetrics());
  }

  protected togglePause(): void {
    this.paused.update(v => !v);
  }

  protected openSavePanel(): void {
    this.saveName.set('');
    this.saveStatus.set('idle');
    this.savePanelOpen.set(true);
  }

  protected closeSavePanel(): void {
    this.savePanelOpen.set(false);
  }

  protected onSaveNameInput(event: Event): void {
    this.saveName.set((event.target as HTMLInputElement).value);
  }

  protected saveScenario(): void {
    const name = this.saveName().trim();
    if (!name) return;
    const mod = this.module();
    if (!mod) return;

    this.saveStatus.set('saving');

    this.scenarioService.create({
      moduleId: this.moduleId(),
      name,
      paramsJson: JSON.stringify(this.currentParams),
      stateSnapshotJson: JSON.stringify(mod.getMetrics().scalars),
    }).subscribe({
      next: () => {
        this.saveStatus.set('saved');
        setTimeout(() => this.closeSavePanel(), 1200);
      },
      error: () => this.saveStatus.set('error'),
    });
  }

  private extractDefaults(specs: Record<string, ParamSpec>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(specs).map(([key, spec]) => [key, spec.default]),
    );
  }

  ngOnDestroy(): void {
    this.module()?.dispose();
    this.module.set(null);
  }
}
