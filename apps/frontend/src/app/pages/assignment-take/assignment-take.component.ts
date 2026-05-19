import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { DatePipe, DecimalPipe, KeyValuePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AssignmentsService } from '../../core/assignments/assignments.service';
import { ModuleRegistryService } from '../../physics-modules/registry.service';
import type { AssignmentDetailDto, SubmissionResultDto } from '../../core/assignments/assignment.models';

interface MetricInput {
  key: string;
  value: number;
}

@Component({
  selector: 'app-assignment-take',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule, FormsModule, DatePipe, DecimalPipe, KeyValuePipe, RouterLink],
  templateUrl: './assignment-take.component.html',
  styleUrl: './assignment-take.component.scss',
})
export class AssignmentTakeComponent implements OnInit {
  readonly assignmentId = input.required<string>();

  private readonly service  = inject(AssignmentsService);
  private readonly registry = inject(ModuleRegistryService);

  protected readonly loading    = signal(true);
  protected readonly assignment = signal<AssignmentDetailDto | null>(null);
  protected readonly submitting = signal(false);
  protected readonly error      = signal('');
  protected readonly result     = signal<SubmissionResultDto | null>(null);

  protected readonly metricInputs  = signal<MetricInput[]>([]);
  protected readonly conclusionText = signal('');

  protected readonly moduleEntry = computed(() => {
    const a = this.assignment();
    return a ? this.registry.getById(a.moduleId) : undefined;
  });

  protected readonly moduleName = computed(() => {
    const entry = this.moduleEntry();
    return entry?.meta.name?.uk ?? this.assignment()?.moduleId ?? '';
  });

  protected readonly alreadySubmitted = computed(() =>
    !!this.assignment()?.mySubmission,
  );

  ngOnInit(): void {
    this.service.getById(this.assignmentId()).subscribe({
      next: a => {
        this.assignment.set(a);
        this.loading.set(false);

        if (a.mySubmission) {
          this.result.set(a.mySubmission);
        } else {
          const inputs = Object.keys(a.expectedMetrics).map(key => ({ key, value: 0 }));
          this.metricInputs.set(inputs);
        }
      },
      error: () => this.loading.set(false),
    });
  }

  protected updateMetric(key: string, raw: string): void {
    const value = parseFloat(raw);
    this.metricInputs.update(list =>
      list.map(m => m.key === key ? { ...m, value: isNaN(value) ? 0 : value } : m),
    );
  }

  protected submit(): void {
    if (this.submitting()) return;
    this.submitting.set(true);
    this.error.set('');

    const observed: Record<string, number> = {};
    for (const m of this.metricInputs()) observed[m.key] = m.value;

    this.service.submit(this.assignmentId(), {
      observedMetrics: observed,
      conclusionText:  this.conclusionText().trim() || null,
      screenshotBase64: null,
    }).subscribe({
      next: r => {
        this.result.set(r);
        this.submitting.set(false);
      },
      error: err => {
        this.error.set(
          err.status === 400 ? 'asgn.alreadySubmitted' : 'common.error',
        );
        this.submitting.set(false);
      },
    });
  }

  protected downloadPdf(): void {
    const r = this.result();
    if (r) this.service.downloadReport(r.id);
  }

  protected scorePercent(score: number): number {
    return Math.round(score * 100);
  }

  protected scoreClass(score: number): string {
    if (score >= 0.9) return 'score--high';
    if (score >= 0.5) return 'score--mid';
    return 'score--low';
  }
}
