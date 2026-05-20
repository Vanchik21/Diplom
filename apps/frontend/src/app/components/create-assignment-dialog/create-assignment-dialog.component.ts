import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AssignmentsService } from '../../core/assignments/assignments.service';
import type { AssignmentSummaryDto, QuizQuestion } from '../../core/assignments/assignment.models';
import { AssignmentTypes } from '../../core/assignments/assignment.models';
import { ModuleRegistryService } from '../../physics-modules/registry.service';
import type { RegistryEntry } from '../../physics-modules/registry.service';

interface MetricEntry { key: string; value: number; }

@Component({
  selector: 'app-create-assignment-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslateModule],
  templateUrl: './create-assignment-dialog.component.html',
  styleUrl: './create-assignment-dialog.component.scss',
})
export class CreateAssignmentDialogComponent implements OnInit {
  readonly classroomId = input.required<string>();
  readonly created     = output<AssignmentSummaryDto>();
  readonly cancelled   = output<void>();

  private readonly service  = inject(AssignmentsService);
  private readonly registry = inject(ModuleRegistryService);

  protected readonly AT = AssignmentTypes;

  protected readonly modules     = signal<RegistryEntry[]>([]);
  protected readonly title       = signal('');
  protected readonly description = signal('');
  protected readonly moduleId    = signal('');
  protected readonly dueAt       = signal('');
  protected readonly assignmentType = signal<0|1|2>(0);
  protected readonly metrics     = signal<MetricEntry[]>([]);
  protected readonly questions   = signal<QuizQuestion[]>([]);
  protected readonly saving      = signal(false);
  protected readonly error       = signal('');

  protected readonly isQuiz     = computed(() => this.assignmentType() === AssignmentTypes.Quiz);
  protected readonly isScenario = computed(() => this.assignmentType() === AssignmentTypes.Scenario);
  protected readonly isPoe      = computed(() => this.assignmentType() === AssignmentTypes.Poe);

  ngOnInit(): void {
    const all = this.registry.getAll();
    this.modules.set(all);
    if (all.length > 0) this.moduleId.set(all[0].meta.id);
  }

  protected addMetric(): void {
    this.metrics.update(m => [...m, { key: '', value: 0 }]);
  }
  protected removeMetric(i: number): void {
    this.metrics.update(m => m.filter((_, j) => j !== i));
  }
  protected updateMetricKey(i: number, key: string): void {
    this.metrics.update(m => m.map((e, j) => j === i ? { ...e, key } : e));
  }
  protected updateMetricValue(i: number, value: number): void {
    this.metrics.update(m => m.map((e, j) => j === i ? { ...e, value } : e));
  }

  protected addQuestion(): void {
    if (this.questions().length >= 6) return;
    this.questions.update(q => [...q, {
      text: '',
      options: ['', '', '', ''],
      correctIndex: 0,
    }]);
  }
  protected removeQuestion(i: number): void {
    this.questions.update(q => q.filter((_, j) => j !== i));
  }
  protected updateQuestionText(i: number, text: string): void {
    this.questions.update(q => q.map((e, j) => j === i ? { ...e, text } : e));
  }
  protected updateOption(qi: number, oi: number, text: string): void {
    this.questions.update(q => q.map((e, j) => j === qi
      ? { ...e, options: e.options.map((o, k) => k === oi ? text : o) }
      : e));
  }
  protected setCorrect(qi: number, oi: number): void {
    this.questions.update(q => q.map((e, j) => j === qi ? { ...e, correctIndex: oi } : e));
  }

  protected submit(): void {
    if (!this.title().trim()) return;
    if (this.isQuiz() && this.questions().length === 0) {
      this.error.set('asgn.quizNeedQuestions'); return;
    }
    this.saving.set(true);
    this.error.set('');

    const expectedMetrics: Record<string, number> = {};
    if (!this.isQuiz()) {
      for (const m of this.metrics()) {
        if (m.key.trim()) expectedMetrics[m.key.trim()] = m.value;
      }
    }

    this.service.create({
      classroomId:    this.classroomId(),
      moduleId:       this.moduleId(),
      title:          this.title().trim(),
      description:    this.description().trim() || null,
      assignmentType: this.assignmentType(),
      expectedMetrics,
      questions:      this.isQuiz() ? this.questions() : null,
      dueAt:          this.dueAt() || null,
    }).subscribe({
      next: result => { this.saving.set(false); this.created.emit(result); },
      error: () => { this.saving.set(false); this.error.set('asgn.createError'); },
    });
  }
}
