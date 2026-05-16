import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  viewChild,
} from '@angular/core';
import { Chart, registerables } from 'chart.js';
import type { Metrics } from '@physis/sdk';

Chart.register(...registerables);

const MAX_POINTS = 400;

@Component({
  selector: 'app-chart-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<canvas #chartCanvas class="chart-canvas"></canvas>`,
  styles: [`:host { display: block; padding: 0.5rem; }
             .chart-canvas { width: 100% !important; height: 100% !important; }`],
})
export class ChartPanelComponent implements AfterViewInit, OnDestroy {
  readonly metrics = input.required<Metrics>();

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('chartCanvas');
  private chart!: Chart;

  constructor() {
    effect(() => {
      const m = this.metrics();
      if (!this.chart) return;
      this.updateChart(m);
    });
  }

  private primaryKey = 'theta';
  private primaryLabel = 'θ (°)';

  private resolveSeries(m: Metrics): void {
    const keys = Object.keys(m.timeSeries).filter(k => k !== 'time' && k !== 'totalEnergy');
    const key = keys[0] ?? 'theta';
    const labelMap: Record<string, string> = {
      theta: 'θ (°)',
      r: 'r (AU)',
    };
    this.primaryKey = key;
    this.primaryLabel = labelMap[key] ?? key;
  }

  ngAfterViewInit(): void {
    this.chart = new Chart(this.canvasRef().nativeElement, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: this.primaryLabel,
            data: [],
            borderColor: 'rgb(92, 110, 248)',
            backgroundColor: 'rgba(92, 110, 248, 0.1)',
            borderWidth: 1.5,
            pointRadius: 0,
            yAxisID: 'yPrimary',
          },
          {
            label: 'E',
            data: [],
            borderColor: 'rgb(74, 222, 128)',
            backgroundColor: 'rgba(74, 222, 128, 0.1)',
            borderWidth: 1.5,
            pointRadius: 0,
            yAxisID: 'yEnergy',
          },
        ],
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { color: '#8b91b5', font: { size: 11 } } },
        },
        scales: {
          x: {
            ticks: { color: '#8b91b5', font: { size: 10 }, maxTicksLimit: 6 },
            grid: { color: 'rgba(46, 49, 72, 0.8)' },
            title: { display: true, text: 't', color: '#8b91b5', font: { size: 10 } },
          },
          yPrimary: {
            type: 'linear',
            position: 'left',
            ticks: { color: 'rgb(92, 110, 248)', font: { size: 10 } },
            grid: { color: 'rgba(46, 49, 72, 0.8)' },
            title: { display: true, text: this.primaryLabel, color: 'rgb(92, 110, 248)', font: { size: 10 } },
          },
          yEnergy: {
            type: 'linear',
            position: 'right',
            ticks: { color: 'rgb(74, 222, 128)', font: { size: 10 } },
            grid: { drawOnChartArea: false },
            title: { display: true, text: 'E', color: 'rgb(74, 222, 128)', font: { size: 10 } },
          },
        },
      },
    });
  }

  private updateChart(m: Metrics): void {
    if (!this.chart) return;

    this.resolveSeries(m);

    const time = m.timeSeries['time'] ?? [];
    const primary = m.timeSeries[this.primaryKey] ?? [];
    const energy = m.timeSeries['totalEnergy'] ?? [];

    const step = Math.max(1, Math.floor(time.length / MAX_POINTS));
    const start = Math.max(0, time.length - MAX_POINTS * step);

    const labels: string[] = [];
    const primaryData: number[] = [];
    const energyData: number[] = [];

    for (let i = start; i < time.length; i += step) {
      labels.push((time[i] ?? 0).toFixed(1));
      primaryData.push(primary[i] ?? 0);
      energyData.push(energy[i] ?? 0);
    }

    const d0 = this.chart.data.datasets[0]!;
    const d1 = this.chart.data.datasets[1]!;

    if (d0.label !== this.primaryLabel) {
      d0.label = this.primaryLabel;
      const scaleY = (this.chart.options.scales as Record<string, unknown>)['yPrimary'] as { title?: { text?: string } } | undefined;
      if (scaleY?.title) scaleY.title.text = this.primaryLabel;
    }

    this.chart.data.labels = labels;
    d0.data = primaryData;
    d1.data = energyData;
    this.chart.update('none');
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}
