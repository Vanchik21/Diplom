import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AssignmentsService } from '../../core/assignments/assignments.service';
import type { AssignmentSummaryDto } from '../../core/assignments/assignment.models';
import { ModuleRegistryService } from '../../physics-modules/registry.service';
import type { RegistryEntry } from '../../physics-modules/registry.service';

interface MetricEntry {
  key: string;
  value: number;
}

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

  readonly created   = output<AssignmentSummaryDto>();
  readonly cancelled = output<void>();

  private readonly service  = inject(AssignmentsService);
  private readonly registry = inject(ModuleRegistryService);

  protected readonly modules = signal<RegistryEntry[]>([]);

  protected readonly title       = signal('');
  protected readonly description = signal('');
  protected readonly moduleId    = signal('');
  protected readonly dueAt       = signal('');
  protected readonly metrics     = signal<MetricEntry[]>([]);
  protected readonly saving      = signal(false);
  protected readonly error       = signal('');

  ngOnInit(): void {
    const all = this.registry.getAll();
    this.modules.set(all);
    if (all.length > 0) this.moduleId.set(all[0].meta.id);
  }

  protected addMetric(): void {
    this.metrics.update(m => [...m, { key: '', value: 0 }]);
  }

  protected removeMetric(index: number): void {
    this.metrics.update(m => m.filter((_, i) => i !== index));
  }

  protected updateMetricKey(index: number, key: string): void {
    this.metrics.update(m => m.map((e, i) => i === index ? { ...e, key } : e));
  }

  protected updateMetricValue(index: number, value: number): void {
    this.metrics.update(m => m.map((e, i) => i === index ? { ...e, value } : e));
  }

  protected submit(): void {
    if (!this.title().trim() || !this.moduleId()) return;
    this.saving.set(true);
    this.error.set('');

    const expectedMetrics: Record<string, number> = {};
    for (const m of this.metrics()) {
      if (m.key.trim()) expectedMetrics[m.key.trim()] = m.value;
    }

    this.service.create({
      classroomId: this.classroomId(),
      moduleId: this.moduleId(),
      title: this.title().trim(),
      description: this.description().trim() || null,
      expectedMetrics,
      dueAt: this.dueAt() || null,
    }).subscribe({
      next: result => {
        this.saving.set(false);
        this.created.emit(result);
      },
      error: () => {
        this.saving.set(false);
        this.error.set('asgn.createError');
      },
    });
  }
}
