import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
  private readonly route = inject(ActivatedRoute);
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
  protected readonly shareCopied = signal(false);

  protected setupFn: BabylonSetupFn | undefined;
  protected frameFn: BabylonFrameFn | undefined;

  protected readonly loadedParams = signal<Record<string, unknown>>({});
  protected readonly currentParams = signal<Record<string, unknown>>({});
  protected readonly loadedPredictions = signal<Record<string, number>>({});
  protected readonly currentPredictions = signal<Record<string, number>>({});

  ngOnInit(): void {
    const entry = this.entry();
    if (!entry) {
      this.router.navigate(['/modules']);
      return;
    }

    const pending = this.scenarioLoader.consume();
    const defaults = this.extractDefaults(entry.meta.defaultParams);

    const queryParams = this.route.snapshot.queryParams;
    const urlParams = { ...defaults };
    if (!pending && Object.keys(queryParams).length > 0) {
      for (const [key, spec] of Object.entries(entry.meta.defaultParams)) {
        if (queryParams[key] !== undefined) {
          urlParams[key] = this.parseParamValue(spec, String(queryParams[key]));
        }
      }
    }

    const initParams = pending?.params ?? urlParams;
    const initPredictions = pending?.predictions ?? {};

    this.loadedParams.set(initParams);
    this.currentParams.set(initParams);
    this.loadedPredictions.set(initPredictions);
    this.currentPredictions.set(initPredictions);

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

  protected onParamsChange(params: Record<string, unknown>): void {
    this.currentParams.set(params);
  }

  protected onPredictionsChange(predictions: Record<string, number>): void {
    this.currentPredictions.set(predictions);
  }

  protected onApplyParams(params: Record<string, unknown>): void {
    const mod = this.module();
    if (!mod) return;
    this.currentParams.set(params);
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
      paramsJson: JSON.stringify(this.currentParams()),
      stateSnapshotJson: JSON.stringify(mod.getMetrics().scalars),
      predictionsJson: JSON.stringify(this.currentPredictions()),
    }).subscribe({
      next: () => {
        this.saveStatus.set('saved');
        setTimeout(() => this.closeSavePanel(), 1200);
      },
      error: () => this.saveStatus.set('error'),
    });
  }

  protected shareSimulation(): void {
    const params = this.currentParams();
    const qs = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    const url = `${window.location.origin}/sim/${this.moduleId()}?${qs}`;
    navigator.clipboard.writeText(url).then(() => {
      this.shareCopied.set(true);
      setTimeout(() => this.shareCopied.set(false), 2000);
    });
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.savePanelOpen()) {
      this.closeSavePanel();
      return;
    }

    const tag = (event.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    if (event.key === ' ') {
      event.preventDefault();
      this.togglePause();
    } else if ((event.key === 'r' || event.key === 'R') && !event.ctrlKey && !event.metaKey) {
      this.onResetSim();
    } else if ((event.key === 's' || event.key === 'S') && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      if (this.isAuthenticated()) this.openSavePanel();
    }
  }

  private extractDefaults(specs: Record<string, ParamSpec>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(specs).map(([key, spec]) => [key, spec.default]),
    );
  }

  private parseParamValue(spec: ParamSpec, raw: string): unknown {
    if (spec.type === 'number') return Number(raw);
    if (spec.type === 'boolean') return raw === 'true';
    return raw;
  }

  ngOnDestroy(): void {
    this.module()?.dispose();
    this.module.set(null);
  }
}
