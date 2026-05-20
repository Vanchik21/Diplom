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
import { DatePipe, DecimalPipe, KeyValuePipe, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import type { Scene } from '@babylonjs/core';
import type { Metrics, PhysicsModule } from '@physis/sdk';
import { AssignmentsService } from '../../core/assignments/assignments.service';
import { ModuleRegistryService } from '../../physics-modules/registry.service';
import type { AssignmentDetailDto, SubmissionResultDto } from '../../core/assignments/assignment.models';
import { AssignmentTypes } from '../../core/assignments/assignment.models';
import {
  BabylonAdapterComponent,
  type BabylonFrameFn,
  type BabylonSetupFn,
} from '../../rendering/babylon/babylon-adapter.component';
import { isBabylonRenderable } from '../../rendering/babylon/babylon-renderable';
import { PoeWorkflowComponent } from '../../components/poe-workflow/poe-workflow.component';

interface MetricInput { key: string; value: number; }

@Component({
  selector: 'app-assignment-take',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslateModule, FormsModule, DatePipe, DecimalPipe, KeyValuePipe, RouterLink,
    NgTemplateOutlet, BabylonAdapterComponent, PoeWorkflowComponent,
  ],
  templateUrl: './assignment-take.component.html',
  styleUrl: './assignment-take.component.scss',
})
export class AssignmentTakeComponent implements OnInit, OnDestroy {
  readonly assignmentId = input.required<string>();

  private readonly service  = inject(AssignmentsService);
  private readonly registry = inject(ModuleRegistryService);

  protected readonly AT = AssignmentTypes;

  protected readonly loading    = signal(true);
  protected readonly assignment = signal<AssignmentDetailDto | null>(null);
  protected readonly submitting = signal(false);
  protected readonly error      = signal('');
  protected readonly result     = signal<SubmissionResultDto | null>(null);

  protected readonly physicsModule = signal<PhysicsModule | null>(null);
  protected readonly metrics       = signal<Metrics>({ scalars: {}, timeSeries: {} });
  protected readonly paused        = signal(false);
  protected setupFn: BabylonSetupFn | undefined;
  protected frameFn: BabylonFrameFn | undefined;

  protected readonly poeObservedMetrics = signal<Record<string, number> | null>(null);
  protected readonly conclusionText     = signal('');
  protected readonly metricInputs       = signal<MetricInput[]>([]);
  protected readonly quizAnswers        = signal<number[]>([]);

  protected readonly gradeInputs = signal<Record<string, number>>({});
  protected readonly gradingId   = signal<string | null>(null);

  protected readonly moduleEntry = computed(() => {
    const a = this.assignment();
    return a ? this.registry.getById(a.moduleId) : undefined;
  });

  protected readonly moduleName = computed(() => {
    const entry = this.moduleEntry();
    return entry?.meta.name?.uk ?? this.assignment()?.moduleId ?? '';
  });

  protected readonly alreadySubmitted = computed(() => !!this.assignment()?.mySubmission);
  protected readonly isQuiz     = computed(() => this.assignment()?.assignmentType === AssignmentTypes.Quiz);
  protected readonly isScenario = computed(() => this.assignment()?.assignmentType === AssignmentTypes.Scenario);
  protected readonly isPoe      = computed(() => this.assignment()?.assignmentType === AssignmentTypes.Poe);

  ngOnInit(): void {
    this.service.getById(this.assignmentId()).subscribe({
      next: a => {
        this.assignment.set(a);
        this.loading.set(false);

        if (a.mySubmission) {
          this.result.set(a.mySubmission);
        }

        if (a.assignmentType !== AssignmentTypes.Quiz) {
          const entry = this.registry.getById(a.moduleId);
          if (entry) {
            const defaults = Object.fromEntries(
              Object.entries(entry.meta.defaultParams).map(([k, spec]) => [k, spec.default]),
            );
            const mod = new entry.factory();
            mod.init(defaults as never);
            this.physicsModule.set(mod);

            if (isBabylonRenderable(mod)) {
              this.setupFn = (scene: Scene) => mod.babylonSetup(scene);
              this.frameFn = (scene: Scene, dt: number) => {
                mod.step(dt);
                mod.babylonFrame(scene);
                this.metrics.set(mod.getMetrics());
              };
            }
          }
        }

        if (a.assignmentType === AssignmentTypes.Quiz && !a.mySubmission) {
          this.quizAnswers.set(new Array(a.questions?.length ?? 0).fill(-1));
        }

        if (a.assignmentType === AssignmentTypes.Scenario && !a.mySubmission) {
          this.metricInputs.set(Object.keys(a.expectedMetrics).map(key => ({ key, value: 0 })));
        }

        if (a.isTeacher) {
          const inputs: Record<string, number> = {};
          for (const s of a.submissions) {
            inputs[s.id] = s.teacherScore != null
              ? Math.round(s.teacherScore * 100)
              : Math.round(s.score * 100);
          }
          this.gradeInputs.set(inputs);
        }
      },
      error: () => this.loading.set(false),
    });
  }

  protected togglePause(): void { this.paused.update(v => !v); }

  protected onPoeExplained(metrics: Record<string, number>): void {
    this.poeObservedMetrics.set(metrics);
  }

  protected updateMetric(key: string, raw: string): void {
    const value = parseFloat(raw);
    this.metricInputs.update(list =>
      list.map(m => m.key === key ? { ...m, value: isNaN(value) ? 0 : value } : m),
    );
  }

  protected setQuizAnswer(qi: number, oi: number): void {
    this.quizAnswers.update(arr => arr.map((a, i) => i === qi ? oi : a));
  }

  protected allAnswered(): boolean {
    return this.quizAnswers().every(a => a !== -1);
  }

  protected submitPoe(): void {
    const observed = this.poeObservedMetrics();
    if (!observed || this.submitting()) return;
    this._submit({
      observedMetrics: observed,
      conclusionText: this.conclusionText().trim() || null,
      screenshotBase64: null,
      quizAnswers: null,
    });
  }

  protected submitScenario(): void {
    if (this.submitting()) return;
    const observed: Record<string, number> = {};
    for (const m of this.metricInputs()) observed[m.key] = m.value;
    this._submit({
      observedMetrics: observed,
      conclusionText: this.conclusionText().trim() || null,
      screenshotBase64: null,
      quizAnswers: null,
    });
  }

  protected submitQuiz(): void {
    if (this.submitting() || !this.allAnswered()) return;
    this._submit({ observedMetrics: null, conclusionText: null, screenshotBase64: null, quizAnswers: this.quizAnswers() });
  }

  private _submit(dto: Parameters<typeof this.service.submit>[1]): void {
    this.submitting.set(true);
    this.error.set('');
    this.service.submit(this.assignmentId(), dto).subscribe({
      next: r => { this.result.set(r); this.submitting.set(false); },
      error: err => {
        this.error.set(err.status === 400 ? 'asgn.alreadySubmitted' : 'common.error');
        this.submitting.set(false);
      },
    });
  }

  protected setGradeInput(submissionId: string, raw: string): void {
    const v = parseInt(raw, 10);
    this.gradeInputs.update(m => ({
      ...m, [submissionId]: isNaN(v) ? 0 : Math.min(100, Math.max(0, v)),
    }));
  }

  protected gradeSubmission(submissionId: string): void {
    if (this.gradingId()) return;
    this.gradingId.set(submissionId);
    this.service.grade(submissionId, (this.gradeInputs()[submissionId] ?? 0) / 100).subscribe({
      next: updated => {
        this.assignment.update(a =>
          a ? { ...a, submissions: a.submissions.map(s => s.id === submissionId ? updated : s) } : a,
        );
        this.gradingId.set(null);
      },
      error: () => this.gradingId.set(null),
    });
  }

  protected downloadPdf(): void {
    const r = this.result();
    if (r) this.service.downloadReport(r.id);
  }

  protected scorePercent(score: number): number { return Math.round(score * 100); }
  protected scoreClass(score: number): string {
    if (score >= 0.9) return 'score--high';
    if (score >= 0.5) return 'score--mid';
    return 'score--low';
  }

  ngOnDestroy(): void {
    this.physicsModule()?.dispose();
    this.physicsModule.set(null);
  }
}
