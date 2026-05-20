import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ClassroomsService } from '../../core/classrooms/classrooms.service';
import { AuthService } from '../../core/auth/auth.service';
import type { ClassroomSummaryDto } from '../../core/classrooms/classroom.models';
import { CreateClassroomDialogComponent } from '../../components/create-classroom-dialog/create-classroom-dialog.component';
import { JoinClassroomDialogComponent } from '../../components/join-classroom-dialog/join-classroom-dialog.component';

@Component({
  selector: 'app-my-classes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslateModule, CreateClassroomDialogComponent, JoinClassroomDialogComponent],
  templateUrl: './my-classes.component.html',
  styleUrl: './my-classes.component.scss',
})
export class MyClassesComponent implements OnInit {
  private readonly service = inject(ClassroomsService);
  protected readonly auth = inject(AuthService);

  protected readonly loading = signal(true);
  protected readonly showCreate = signal(false);
  protected readonly showJoin   = signal(false);

  protected readonly classrooms = this.service.classrooms;

  protected readonly teaching = computed(() =>
    this.classrooms().filter(c => c.myRole === 1),
  );
  protected readonly studying = computed(() =>
    this.classrooms().filter(c => c.myRole === 2),
  );

  ngOnInit(): void {
    this.service.getAll().subscribe({
      next: list => {
        this.service.classrooms.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected onCreated(classroom: ClassroomSummaryDto): void {
    this.showCreate.set(false);
    this.service.classrooms.update(list => [classroom, ...list.filter(c => c.id !== classroom.id)]);
  }

  protected onJoined(classroom: ClassroomSummaryDto): void {
    this.showJoin.set(false);
    this.service.classrooms.update(list => [classroom, ...list.filter(c => c.id !== classroom.id)]);
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
  }
}
