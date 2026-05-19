import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ClassroomsService } from '../../core/classrooms/classrooms.service';
import type { ClassroomDetailDto, ClassroomMemberDto } from '../../core/classrooms/classroom.models';
import { AssignmentsService } from '../../core/assignments/assignments.service';
import type { AssignmentSummaryDto } from '../../core/assignments/assignment.models';
import { CreateAssignmentDialogComponent } from '../../components/create-assignment-dialog/create-assignment-dialog.component';

@Component({
  selector: 'app-classroom-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule, RouterLink, DecimalPipe, CreateAssignmentDialogComponent],
  templateUrl: './classroom-detail.component.html',
  styleUrl: './classroom-detail.component.scss',
})
export class ClassroomDetailComponent implements OnInit {
  readonly classroomId = input.required<string>();

  private readonly service            = inject(ClassroomsService);
  protected readonly assignmentsService = inject(AssignmentsService);

  protected readonly classroom   = signal<ClassroomDetailDto | null>(null);
  protected readonly loading     = signal(true);
  protected readonly codeCopied  = signal(false);
  protected readonly rotating    = signal(false);
  protected readonly removingId  = signal<string | null>(null);

  protected readonly tab                 = signal<'members' | 'assignments'>('members');
  protected readonly assignments         = signal<AssignmentSummaryDto[]>([]);
  protected readonly assignmentsLoading  = signal(false);
  protected readonly showCreateDialog    = signal(false);

  protected readonly isTeacher = computed(() => this.classroom()?.myRole === 1);
  protected readonly teachers  = computed(() =>
    this.classroom()?.members.filter(m => m.role === 1) ?? [],
  );
  protected readonly students  = computed(() =>
    this.classroom()?.members.filter(m => m.role === 2) ?? [],
  );

  ngOnInit(): void {
    this.service.getById(this.classroomId()).subscribe({
      next: cls => {
        this.classroom.set(cls);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected copyCode(): void {
    const code = this.classroom()?.inviteCode;
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      this.codeCopied.set(true);
      setTimeout(() => this.codeCopied.set(false), 2000);
    });
  }

  protected rotateCode(): void {
    const cls = this.classroom();
    if (!cls) return;
    this.rotating.set(true);
    this.service.rotateCode(cls.id).subscribe({
      next: ({ inviteCode }) => {
        this.classroom.update(c => c ? { ...c, inviteCode } : c);
        this.rotating.set(false);
      },
      error: () => this.rotating.set(false),
    });
  }

  protected removeMember(member: ClassroomMemberDto): void {
    const cls = this.classroom();
    if (!cls) return;
    this.removingId.set(member.userId);
    this.service.removeMember(cls.id, member.userId).subscribe({
      next: () => {
        this.classroom.update(c =>
          c ? { ...c, members: c.members.filter(m => m.userId !== member.userId) } : c,
        );
        this.removingId.set(null);
      },
      error: () => this.removingId.set(null),
    });
  }

  protected selectTab(t: 'members' | 'assignments'): void {
    this.tab.set(t);
    if (t === 'assignments' && this.assignments().length === 0 && !this.assignmentsLoading()) {
      this.loadAssignments();
    }
  }

  private loadAssignments(): void {
    this.assignmentsLoading.set(true);
    this.assignmentsService.getForClassroom(this.classroomId()).subscribe({
      next: list => { this.assignments.set(list); this.assignmentsLoading.set(false); },
      error: ()   => this.assignmentsLoading.set(false),
    });
  }

  protected onAssignmentCreated(a: AssignmentSummaryDto): void {
    this.assignments.update(list => [a, ...list]);
    this.showCreateDialog.set(false);
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
  }
}
