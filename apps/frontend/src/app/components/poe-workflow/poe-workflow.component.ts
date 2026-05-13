import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import type { PhysicsModule, PredictionTarget } from '@physis/sdk';
import katex from 'katex';
import { LocalizedPipe } from '../../core/pipes/localized.pipe';

type PoePhase = 'predict' | 'observe' | 'explain';

interface ComparisonRow {
  target: PredictionTarget;
  predicted: number;
  actual: number;
  absoluteError: number;
  relativeError: number | null;
}

const MIN_OBSERVE_SECONDS = 5;

@Component({
  selector: 'app-poe-workflow',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, FormsModule, TranslateModule, LocalizedPipe],
  templateUrl: './poe-workflow.component.html',
  styleUrl: './poe-workflow.component.scss',
})
export class PoeWorkflowComponent implements OnDestroy {
  readonly module = input.required<PhysicsModule>();

  private readonly sanitizer = inject(DomSanitizer);

  protected readonly phase = signal<PoePhase>('predict');
  protected readonly predictions = signal<Record<string, number>>({});
  protected readonly observedSeconds = signal(0);
  protected readonly comparisonRows = signal<ComparisonRow[]>([]);
  protected readonly explanationHtml = signal<SafeHtml>('');

  protected readonly targets = computed<PredictionTarget[]>(() =>
    this.module().getPredictionTargets(),
  );

  protected readonly canContinueObserve = computed(
    () => this.observedSeconds() >= MIN_OBSERVE_SECONDS,
  );

  protected readonly observeProgress = computed(() =>
    Math.min(100, (this.observedSeconds() / MIN_OBSERVE_SECONDS) * 100),
  );

  private timer: ReturnType<typeof setInterval> | null = null;

  protected getPrediction(key: string): number {
    return this.predictions()[key] ?? 0;
  }

  protected setPrediction(key: string, value: number): void {
    this.predictions.update(prev => ({ ...prev, [key]: Number(value) }));
  }

  protected toObserve(): void {
    this.observedSeconds.set(0);
    this.phase.set('observe');
    this.timer = setInterval(() => {
      this.observedSeconds.update(s => s + 1);
    }, 1000);
  }

  protected toExplain(): void {
    this.stopTimer();
    const metrics = this.module().getMetrics();
    const preds = this.predictions();

    const rows: ComparisonRow[] = this.targets().map(target => {
      const predicted = preds[target.metricKey] ?? 0;
      const actual = metrics.scalars[target.metricKey] ?? 0;
      const absoluteError = Math.abs(actual - predicted);
      const relativeError = Math.abs(actual) > 1e-9
        ? (absoluteError / Math.abs(actual)) * 100
        : null;
      return { target, predicted, actual, absoluteError, relativeError };
    });

    this.comparisonRows.set(rows);
    this.explanationHtml.set(this.renderExplanation(preds));
    this.phase.set('explain');
  }

  protected tryAgain(): void {
    this.stopTimer();
    this.predictions.set({});
    this.observedSeconds.set(0);
    this.module().reset();
    this.phase.set('predict');
  }

  private renderExplanation(preds: Record<string, number>): SafeHtml {
    const raw = this.module().getExplanation(preds);
    const html = raw.replace(/\$([^$]+)\$/g, (_match, latex: string) => {
      try {
        return katex.renderToString(latex, { throwOnError: false });
      } catch {
        return latex;
      }
    });
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private stopTimer(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }
}
