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

  protected readonly entry = computed(() => this.registry.getById(this.moduleId()));
  protected readonly notFound = computed(() => !this.entry());

  protected readonly metrics = signal<Metrics>({ scalars: {}, timeSeries: {} });
  protected readonly paused = signal(false);
  protected readonly module = signal<PhysicsModule | null>(null);

  protected setupFn: BabylonSetupFn | undefined;
  protected frameFn: BabylonFrameFn | undefined;

  ngOnInit(): void {
    const entry = this.entry();
    if (!entry) {
      this.router.navigate(['/modules']);
      return;
    }

    const mod = new entry.factory();
    mod.init(this.extractDefaults(entry.meta.defaultParams));
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
