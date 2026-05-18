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
  selector: 'app-join-classroom-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslateModule],
  templateUrl: './join-classroom-dialog.component.html',
  styleUrl: './join-classroom-dialog.component.scss',
})
export class JoinClassroomDialogComponent {
  readonly joined    = output<ClassroomSummaryDto>();
  readonly cancelled = output<void>();

  private readonly service = inject(ClassroomsService);

  protected code   = signal('');
  protected saving = signal(false);
  protected error  = signal('');

  protected submit(): void {
    const inviteCode = this.code().trim().toUpperCase();
    if (inviteCode.length !== 8) return;
    this.saving.set(true);
    this.error.set('');
    this.service.join({ inviteCode }).subscribe({
      next: classroom => this.joined.emit(classroom),
      error: () => {
        this.error.set('cls.joinError');
        this.saving.set(false);
      },
    });
  }

  protected cancel(): void {
    this.cancelled.emit();
  }
}
