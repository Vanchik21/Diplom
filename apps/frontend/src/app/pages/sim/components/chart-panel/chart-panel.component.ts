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

  ngAfterViewInit(): void {
    this.chart = new Chart(this.canvasRef().nativeElement, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'θ (°)',
            data: [],
            borderColor: 'rgb(92, 110, 248)',
            backgroundColor: 'rgba(92, 110, 248, 0.1)',
            borderWidth: 1.5,
            pointRadius: 0,
            yAxisID: 'yTheta',
          },
          {
            label: 'E (J)',
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
            title: { display: true, text: 't (s)', color: '#8b91b5', font: { size: 10 } },
          },
          yTheta: {
            type: 'linear',
            position: 'left',
            ticks: { color: 'rgb(92, 110, 248)', font: { size: 10 } },
            grid: { color: 'rgba(46, 49, 72, 0.8)' },
            title: { display: true, text: 'θ (°)', color: 'rgb(92, 110, 248)', font: { size: 10 } },
          },
          yEnergy: {
            type: 'linear',
            position: 'right',
            ticks: { color: 'rgb(74, 222, 128)', font: { size: 10 } },
            grid: { drawOnChartArea: false },
            title: { display: true, text: 'E (J)', color: 'rgb(74, 222, 128)', font: { size: 10 } },
          },
        },
      },
    });
  }

  private updateChart(m: Metrics): void {
    const time = m.timeSeries['time'] ?? [];
    const theta = m.timeSeries['theta'] ?? [];
    const energy = m.timeSeries['totalEnergy'] ?? [];

    const len = Math.min(time.length, MAX_POINTS);
    const step = Math.max(1, Math.floor(time.length / MAX_POINTS));

    const labels: string[] = [];
    const thetaData: number[] = [];
    const energyData: number[] = [];

    for (let i = time.length - len * step; i < time.length; i += step) {
      const idx = Math.max(0, i);
      labels.push((time[idx] ?? 0).toFixed(1));
      thetaData.push(theta[idx] ?? 0);
      energyData.push(energy[idx] ?? 0);
    }

    this.chart.data.labels = labels;
    this.chart.data.datasets[0]!.data = thetaData;
    this.chart.data.datasets[1]!.data = energyData;
    this.chart.update('none');
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}
