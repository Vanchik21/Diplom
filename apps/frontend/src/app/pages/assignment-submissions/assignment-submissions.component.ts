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
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AssignmentsService } from '../../core/assignments/assignments.service';
import type { AssignmentDetailDto, SubmissionResultDto } from '../../core/assignments/assignment.models';

@Component({
  selector: 'app-assignment-submissions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, RouterLink, FormsModule, TranslateModule],
  templateUrl: './assignment-submissions.component.html',
  styleUrl: './assignment-submissions.component.scss',
})
export class AssignmentSubmissionsComponent implements OnInit {
  readonly classroomId  = input.required<string>();
  readonly assignmentId = input.required<string>();

  private readonly service = inject(AssignmentsService);

  protected readonly loading    = signal(true);
  protected readonly assignment = signal<AssignmentDetailDto | null>(null);
  protected readonly selected   = signal<SubmissionResultDto | null>(null);
  protected readonly gradeScore = signal(100);
  protected readonly gradeComment = signal('');
  protected readonly grading    = signal(false);
  protected readonly gradeError = signal('');

  protected readonly submissions = computed(() =>
    this.assignment()?.submissions ?? [],
  );

  ngOnInit(): void {
    this.service.getById(this.assignmentId()).subscribe({
      next: a => { this.assignment.set(a); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  protected select(s: SubmissionResultDto): void {
    this.selected.set(s);
    this.gradeScore.set(Math.round((s.teacherScore ?? s.score) * 100));
    this.gradeComment.set(s.teacherComment ?? '');
    this.gradeError.set('');
  }

  protected submitGrade(): void {
    const s = this.selected();
    if (!s) return;
    const score = this.gradeScore();
    if (score < 0 || score > 100) { this.gradeError.set('asgn.gradeRangeError'); return; }

    this.grading.set(true);
    this.gradeError.set('');
    this.service.grade(s.id, {
      teacherScore: score / 100,
      comment: this.gradeComment().trim() || null,
    }).subscribe({
      next: updated => {
        this.grading.set(false);
        this.assignment.update(a => {
          if (!a) return a;
          return {
            ...a,
            submissions: a.submissions.map(sub => sub.id === updated.id ? updated : sub),
          };
        });
        this.selected.set(updated);
      },
      error: () => { this.grading.set(false); this.gradeError.set('asgn.gradeError'); },
    });
  }

  protected scoreColor(score: number): string {
    if (score >= 0.8) return 'green';
    if (score >= 0.5) return 'orange';
    return 'red';
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleString('uk-UA', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }
}
