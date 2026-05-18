import {
  ChangeDetectionStrategy,
  Component,
  inject,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ClassroomsService } from '../../core/classrooms/classrooms.service';
import type { ClassroomSummaryDto } from '../../core/classrooms/classroom.models';

@Component({
  selector: 'app-create-classroom-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslateModule],
  templateUrl: './create-classroom-dialog.component.html',
  styleUrl: './create-classroom-dialog.component.scss',
})
export class CreateClassroomDialogComponent {
  readonly created = output<ClassroomSummaryDto>();
  readonly cancelled = output<void>();

  private readonly service = inject(ClassroomsService);

  protected name        = signal('');
  protected description = signal('');
  protected saving      = signal(false);
  protected error       = signal('');

  protected submit(): void {
    const name = this.name().trim();
    if (!name) return;
    this.saving.set(true);
    this.error.set('');
    this.service.create({ name, description: this.description().trim() || undefined }).subscribe({
      next: classroom => this.created.emit(classroom),
      error: () => {
        this.error.set('cls.createError');
        this.saving.set(false);
      },
    });
  }

  protected cancel(): void {
    this.cancelled.emit();
  }
}
