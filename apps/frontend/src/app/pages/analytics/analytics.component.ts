import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { Chart, registerables } from 'chart.js';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { ClassroomsService } from '../../core/classrooms/classrooms.service';
import type {
  ClassroomOverviewDto,
  PersonalAnalyticsDto,
  StudentTimelineDto,
} from '../../core/analytics/analytics.models';

Chart.register(...registerables);

@Component({
  selector: 'app-analytics',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule, DecimalPipe],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.scss',
})
export class AnalyticsComponent implements OnDestroy {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly classroomsService = inject(ClassroomsService);

  protected readonly mode = signal<'personal' | 'classrooms'>('personal');
  protected readonly selectedClassroomId = signal<string | null>(null);
  protected readonly selectedStudentId   = signal<string | null>(null);

  protected readonly allClassrooms = toSignal(this.classroomsService.getAll(), {
    initialValue: [],
  });
  protected readonly teacherClassrooms = computed(() =>
    this.allClassrooms().filter(c => c.myRole === 1 && !c.isArchived),
  );
  protected readonly isTeacher = computed(() => this.teacherClassrooms().length > 0);

  protected readonly personalData    = signal<PersonalAnalyticsDto | null>(null);
  protected readonly personalLoading = signal(true);
  protected readonly personalError   = signal(false);
  protected readonly overviewData    = signal<ClassroomOverviewDto | null>(null);
  protected readonly overviewLoading = signal(false);
  protected readonly studentTimeline = signal<StudentTimelineDto | null>(null);
  protected readonly studentLoading  = signal(false);

  private personalSub?: Subscription;

  private scoreBarEl   = viewChild<ElementRef<HTMLCanvasElement>>('scoreBarCanvas');
  private studentLineEl = viewChild<ElementRef<HTMLCanvasElement>>('studentLineCanvas');

  private barChart?: Chart;
  private lineChart?: Chart;

  protected readonly categories = [
    { key: 'mechanics', labelKey: 'analytics.cat.mechanics' },
    { key: 'em',        labelKey: 'analytics.cat.em'        },
    { key: 'waves',     labelKey: 'analytics.cat.waves'     },
    { key: 'thermo',    labelKey: 'analytics.cat.thermo'    },
    { key: 'gravity',   labelKey: 'analytics.cat.gravity'   },
    { key: 'quantum',   labelKey: 'analytics.cat.quantum'   },
  ];

  constructor() {
    this.personalSub = this.analyticsService.getPersonal().subscribe({
      next: data => { this.personalData.set(data); this.personalLoading.set(false); },
      error: ()   => { this.personalError.set(true); this.personalLoading.set(false); },
    });

    effect(() => {
      const el   = this.scoreBarEl();
      const data = this.overviewData();
      if (!el || !data) return;
      untracked(() => this.renderBarChart(el.nativeElement, data));
    });

    effect(() => {
      const el   = this.studentLineEl();
      const data = this.studentTimeline();
      if (!el || !data) return;
      untracked(() => this.renderLineChart(el.nativeElement, data));
    });
  }

  ngOnDestroy(): void {
    this.personalSub?.unsubscribe();
    this.barChart?.destroy();
    this.lineChart?.destroy();
  }

  protected selectClassroom(id: string): void {
    if (this.selectedClassroomId() === id) return;
    this.selectedClassroomId.set(id);
    this.selectedStudentId.set(null);
    this.studentTimeline.set(null);
    this.overviewData.set(null);
    this.overviewLoading.set(true);
    this.analyticsService.getClassroomOverview(id).subscribe({
      next: data => { this.overviewData.set(data); this.overviewLoading.set(false); },
      error: ()   => this.overviewLoading.set(false),
    });
  }

  protected selectStudent(studentId: string): void {
    const classroomId = this.selectedClassroomId();
    if (!classroomId || this.selectedStudentId() === studentId) return;
    this.selectedStudentId.set(studentId);
    this.studentTimeline.set(null);
    this.studentLoading.set(true);
    this.analyticsService.getStudentTimeline(classroomId, studentId).subscribe({
      next: data => { this.studentTimeline.set(data); this.studentLoading.set(false); },
      error: ()   => this.studentLoading.set(false),
    });
  }

  protected masteryColor(mastery: number | null | undefined): string {
    if (mastery == null) return 'var(--color-surface-2, #374151)';
    const hue = Math.round(mastery * 120);
    return `hsl(${hue}, 65%, 45%)`;
  }

  protected masteryLabel(mastery: number | null | undefined): string {
    if (mastery == null) return '—';
    return `${Math.round(mastery * 100)}%`;
  }

  protected masteryClass(mastery: number | null | undefined): string {
    if (mastery == null) return '';
    if (mastery >= 0.8) return 'heatmap__cell--high';
    if (mastery >= 0.5) return 'heatmap__cell--mid';
    return 'heatmap__cell--low';
  }

  private renderBarChart(canvas: HTMLCanvasElement, data: ClassroomOverviewDto): void {
    this.barChart?.destroy();
    this.barChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.assignments.map(a => a.title),
        datasets: [
          {
            label: '',
            data: data.assignments.map(a => Math.round(a.averageScore * 100)),
            backgroundColor: 'rgba(59, 130, 246, 0.6)',
            borderColor:     'rgba(59, 130, 246, 1)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales:  { y: { beginAtZero: true, max: 100, title: { display: true, text: '%' } } },
      },
    });
  }

  private renderLineChart(canvas: HTMLCanvasElement, data: StudentTimelineDto): void {
    this.lineChart?.destroy();
    this.lineChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: data.scoreOverTime.map(p =>
          new Date(p.submittedAt).toLocaleDateString('uk-UA'),
        ),
        datasets: [
          {
            label: data.studentName,
            data:  data.scoreOverTime.map(p => Math.round(p.score * 100)),
            backgroundColor: 'rgba(16, 185, 129, 0.2)',
            borderColor:     'rgba(16, 185, 129, 1)',
            fill:    true,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales:  { y: { beginAtZero: true, max: 100, title: { display: true, text: '%' } } },
      },
    });
  }
}
