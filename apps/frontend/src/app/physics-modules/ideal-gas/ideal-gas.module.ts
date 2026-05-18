// Physics: Ideal gas kinetic model — N particles in a 2D box.
// No particle-particle collisions (ideal gas approximation).
// Wall collisions: elastic reflection (vx → -vx, vy → -vy).
// Initial speeds: Box-Muller transform → 2D Maxwell-Boltzmann (Rayleigh) distribution.
//   vx, vy ~ N(0, σ) where σ = sqrt(T), gives speed ~ Rayleigh(σ).
// Pressure: P = (total |Δp_⊥| from wall hits) / (perimeter * Δt).
// Integration: Euler with capped dt for stability.

import { type Scene, ArcRotateCamera, Vector3 } from '@babylonjs/core';
import type { Metrics, ModuleMetadata, PhysicsModule, PredictionTarget } from '@physis/sdk';
import type { BabylonRenderable } from '../../rendering/babylon/babylon-renderable';
import {
  setupIdealGasScene,
  updateIdealGasScene,
  type IdealGasMeshes,
} from './ideal-gas.renderer';
import type { IdealGasParams, IdealGasState, Particle } from './ideal-gas.types';

const HIST_BINS = 30;
const MAX_N = 500;
const MAX_STEP = 0.016; // cap dt

const META: ModuleMetadata = {
  id: 'ideal-gas',
  name: { uk: 'Ідеальний газ у коробці', en: 'Ideal Gas in a Box' },
  category: 'thermo',
  description: {
    uk: 'Кінетична модель ідеального газу. Частинки рухаються та пружно стикаються зі стінками. Тиск, температура, розподіл швидкостей Максвелла–Больцмана.',
    en: 'Kinetic model of an ideal gas. Particles bounce elastically off walls. Pressure, temperature, Maxwell–Boltzmann speed distribution.',
  },
  defaultParams: {
    particleCount: {
      type: 'number',
      label: { uk: 'Кількість частинок N', en: 'Particle count N' },
      default: 150,
      min: 10,
      max: MAX_N,
      step: 10,
    },
    temperature: {
      type: 'number',
      label: { uk: 'Температура T (нормована)', en: 'Temperature T (normalized)' },
      unit: 'у.о.',
      default: 4,
      min: 0.5,
      max: 20,
      step: 0.5,
    },
    boxWidth: {
      type: 'number',
      label: { uk: 'Ширина коробки', en: 'Box width' },
      unit: 'м',
      default: 10,
      min: 4,
      max: 20,
      step: 1,
    },
    boxHeight: {
      type: 'number',
      label: { uk: 'Висота коробки', en: 'Box height' },
      unit: 'м',
      default: 7,
      min: 4,
      max: 15,
      step: 1,
    },
  },
  renderer: '3d-babylon',
  educationalTopics: [
    'ideal-gas', 'kinetic-theory', 'maxwell-boltzmann', 'ідеальний газ',
    'кінетична теорія', 'тиск', 'термодинаміка',
  ],
  difficulty: 'school',
  formulas: [
    {
      id: 'pressure',
      label: { uk: 'Тиск ідеального газу', en: 'Ideal gas pressure' },
      latex: String.raw`P=\frac{Nm\langle v^2\rangle}{2V}`,
    },
    {
      id: 'maxwell',
      label: { uk: 'Розподіл Максвелла–Больцмана (2D)', en: 'Maxwell–Boltzmann distribution (2D)' },
      latex: String.raw`f(v)=\frac{m}{k_BT}\,v\,e^{-mv^2/(2k_BT)}`,
    },
    {
      id: 'vrms',
      label: { uk: 'RMS-швидкість', en: 'RMS speed' },
      latex: String.raw`v_{\rm rms}=\sqrt{\frac{2k_BT}{m}}`,
    },
  ],
};

// Box-Muller transform for normal random variable
function randn(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export class IdealGasModule
  implements PhysicsModule<IdealGasParams, IdealGasState>, BabylonRenderable
{
  readonly meta: ModuleMetadata = META;

  private params: IdealGasParams = {
    particleCount: 150,
    temperature: 4,
    boxWidth: 10,
    boxHeight: 7,
  };

  private particles: Particle[] = [];
  private time = 0;

  // Pressure tracking
  private pressureAccum = 0;   // accumulated |Δp| from wall hits
  private pressureTime = 0;    // time window for pressure calc
  private pressure = 0;        // current smoothed pressure
  private pressureHistory: number[] = [];
  private timeHistory: number[] = [];

  // Speed histogram
  private histogram = new Array<number>(HIST_BINS).fill(0);
  private histNorm = new Array<number>(HIST_BINS).fill(0);
  private maxObservedSpeed = 1;

  private meshes: IdealGasMeshes | null = null;

  private initParticles(): void {
    const { particleCount, temperature, boxWidth, boxHeight } = this.params;
    const sigma = Math.sqrt(temperature);
    this.particles = [];
    for (let i = 0; i < Math.min(particleCount, MAX_N); i++) {
      this.particles.push({
        x: Math.random() * boxWidth,
        y: Math.random() * boxHeight,
        vx: randn() * sigma,
        vy: randn() * sigma,
      });
    }
  }

  private updateHistogram(): void {
    this.histogram.fill(0);
    let maxSpeed = 0.001;
    for (const p of this.particles) {
      const s = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (s > maxSpeed) maxSpeed = s;
    }
    this.maxObservedSpeed = maxSpeed;

    for (const p of this.particles) {
      const s = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      const bin = Math.min(Math.floor((s / maxSpeed) * HIST_BINS), HIST_BINS - 1);
      this.histogram[bin]++;
    }
    const maxCount = Math.max(...this.histogram, 1);
    this.histNorm = this.histogram.map(c => c / maxCount);
  }

  init(params: IdealGasParams): void {
    this.params = params;
    this.time = 0;
    this.pressureAccum = 0;
    this.pressureTime = 0;
    this.pressure = 0;
    this.pressureHistory = [];
    this.timeHistory = [];
    this.histogram.fill(0);
    this.histNorm.fill(0);
    this.maxObservedSpeed = 1;
    this.initParticles();
  }

  step(dt: number): void {
    const { boxWidth: W, boxHeight: H } = this.params;
    const safedt = Math.min(dt, MAX_STEP);
    let impulse = 0;

    for (const p of this.particles) {
      p.x += p.vx * safedt;
      p.y += p.vy * safedt;

      if (p.x <= 0) {
        p.x = -p.x;
        impulse += 2 * Math.abs(p.vx);
        p.vx = -p.vx;
      } else if (p.x >= W) {
        p.x = 2 * W - p.x;
        impulse += 2 * Math.abs(p.vx);
        p.vx = -p.vx;
      }
      if (p.y <= 0) {
        p.y = -p.y;
        impulse += 2 * Math.abs(p.vy);
        p.vy = -p.vy;
      } else if (p.y >= H) {
        p.y = 2 * H - p.y;
        impulse += 2 * Math.abs(p.vy);
        p.vy = -p.vy;
      }
    }

    this.pressureAccum += impulse;
    this.pressureTime += safedt;
    this.time += safedt;

    // Update pressure every ~0.5s window
    if (this.pressureTime >= 0.5) {
      const perimeter = 2 * (W + H);
      this.pressure = this.pressureAccum / (perimeter * this.pressureTime);
      this.pressureAccum = 0;
      this.pressureTime = 0;
    }

    this.updateHistogram();

    this.pressureHistory.push(this.pressure);
    this.timeHistory.push(this.time);
  }

  getState(): IdealGasState {
    let sumSq = 0;
    for (const p of this.particles) sumSq += p.vx * p.vx + p.vy * p.vy;
    const avgSpeed = this.particles.length > 0
      ? Math.sqrt(sumSq / this.particles.length)
      : 0;

    return {
      particles: this.particles,
      pressure: this.pressure,
      avgSpeed,
      temperature: this.params.temperature,
    };
  }

  getMetrics(): Metrics {
    const state = this.getState();
    const { particleCount, temperature, boxWidth, boxHeight } = this.params;
    const vRms = Math.sqrt(2 * temperature);

    return {
      scalars: {
        'N (частинок)': particleCount,
        'T (нормована)': temperature,
        'P (тиск)': this.pressure,
        '|v| середня': state.avgSpeed,
        'v_rms теор.': vRms,
        't (с)': this.time,
      },
      timeSeries: {
        pressure: this.pressureHistory,
        time: this.timeHistory,
      },
    };
  }

  getPredictionTargets(): PredictionTarget[] {
    const { temperature } = this.params;
    const vRms = Math.sqrt(2 * temperature);

    return [
      {
        metricKey: 'P (тиск)',
        label: { uk: 'Тиск на стінки коробки', en: 'Pressure on box walls' },
        unit: 'у.о.',
        slider: {
          min: 0,
          max: vRms * this.params.particleCount * 0.5,
          labelLow: { uk: 'Малий тиск (мало частинок або низька T)', en: 'Low pressure (few particles or low T)' },
          labelHigh: { uk: 'Великий тиск (багато частинок або висока T)', en: 'High pressure (many particles or high T)' },
        },
      },
      {
        metricKey: '|v| середня',
        label: { uk: 'Середня швидкість частинок', en: 'Mean particle speed' },
        unit: 'м/с',
        slider: {
          min: 0,
          max: vRms * 2,
          labelLow: { uk: 'Повільні частинки (низька T)', en: 'Slow particles (low T)' },
          labelHigh: { uk: 'Швидкі частинки (висока T)', en: 'Fast particles (high T)' },
        },
      },
    ];
  }

  getExplanation(predictions: Record<string, number>, locale = 'uk'): string {
    const { temperature, particleCount, boxWidth, boxHeight } = this.params;
    const vRms = Math.sqrt(2 * temperature);
    const predP = predictions['P (тиск)'] ?? 0;
    const errP = this.pressure > 0
      ? Math.abs(((predP - this.pressure) / this.pressure) * 100).toFixed(1)
      : '—';

    if (locale === 'uk') {
      return (
        `$N=${particleCount}$ частинок при $T=${temperature}$: ` +
        `теоретична RMS-швидкість $v_{\\rm rms}=\\sqrt{2T}=${vRms.toFixed(2)}$ од/с, ` +
        `виміряний тиск $P\\approx${this.pressure.toFixed(2)}$ (передбачено: ${predP.toFixed(2)}, похибка: ${errP}%). ` +
        `Гістограма знизу наближається до розподілу Максвелла–Больцмана. ` +
        `Зелена лінія — теоретичний пік $v_p=\\sqrt{T}=${Math.sqrt(temperature).toFixed(2)}$ од/с.`
      );
    }
    return (
      `$N=${particleCount}$ particles at $T=${temperature}$: ` +
      `theoretical RMS speed $v_{\\rm rms}=\\sqrt{2T}=${vRms.toFixed(2)}$ units/s, ` +
      `measured pressure $P\\approx${this.pressure.toFixed(2)}$ (predicted: ${predP.toFixed(2)}, error: ${errP}%). ` +
      `The histogram below converges to the Maxwell–Boltzmann distribution. ` +
      `Green line marks theoretical peak $v_p=\\sqrt{T}=${Math.sqrt(temperature).toFixed(2)}$ units/s.`
    );
  }

  reset(): void {
    this.init(this.params);
  }

  dispose(): void {
    this.meshes = null;
    this.particles = [];
  }

  babylonSetup(scene: Scene): void {
    const camera = scene.activeCamera as ArcRotateCamera | null;
    if (camera) {
      camera.target = new Vector3(0, 0, 0);
      camera.alpha = Math.PI / 2;
      camera.beta = Math.PI * 0.4;
      camera.radius = 10;
    }
    this.meshes = setupIdealGasScene(scene);
  }

  babylonFrame(scene: Scene): void {
    void scene;
    if (!this.meshes) return;
    const mbPeak = Math.sqrt(this.params.temperature); // v_p for Rayleigh in 2D
    updateIdealGasScene(
      this.meshes,
      this.getState(),
      this.params.boxWidth,
      this.params.boxHeight,
      this.histNorm,
      this.maxObservedSpeed,
      mbPeak,
    );
  }
}
