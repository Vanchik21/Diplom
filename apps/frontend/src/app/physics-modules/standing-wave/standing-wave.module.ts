// Physics: Standing wave on a fixed string — analytic solution.
// y(x,t) = A · sin(nπx/L) · cos(ωt)
// Wave speed:  v  = √(T/μ)
// n-th harmonic: f_n = nv/(2L),  λ_n = 2L/n,  ω_n = 2πf_n
// String length L = 2 m (physical), mapped to 4 world units in renderer.
// No numerical integration needed — fully analytic.

import { type Scene, ArcRotateCamera, Vector3 } from '@babylonjs/core';
import type { Metrics, ModuleMetadata, PhysicsModule, PredictionTarget } from '@physis/sdk';
import type { BabylonRenderable } from '../../rendering/babylon/babylon-renderable';
import {
  setupStandingWaveScene,
  updateStandingWaveScene,
  STRING_LENGTH,
  type StandingWaveMeshes,
} from './standing-wave.renderer';
import type { StandingWaveParams, StandingWaveState } from './standing-wave.types';

const PHYS_L = 2.0; // physical string length (m)

const META: ModuleMetadata = {
  id: 'standing-wave',
  name: { uk: 'Стояча хвиля на струні', en: 'Standing Wave on a String' },
  category: 'waves',
  description: {
    uk: 'Утворення стоячої хвилі на закріпленій струні. Гармоніки, вузли, пучності, залежність частоти від натягу й лінійної густини.',
    en: 'Standing wave on a fixed string. Harmonics, nodes, antinodes, frequency dependence on tension and linear density.',
  },
  defaultParams: {
    tension: {
      type: 'number',
      label: { uk: 'Натяг T', en: 'Tension T' },
      unit: 'Н',
      default: 40,
      min: 1,
      max: 200,
      step: 1,
    },
    linearDensity: {
      type: 'number',
      label: { uk: 'Лінійна густина μ', en: 'Linear density μ' },
      unit: 'г/м',
      default: 10,
      min: 1,
      max: 100,
      step: 1,
    },
    harmonic: {
      type: 'number',
      label: { uk: 'Номер гармоніки n', en: 'Harmonic number n' },
      default: 1,
      min: 1,
      max: 6,
      step: 1,
    },
    amplitude: {
      type: 'number',
      label: { uk: 'Амплітуда A', en: 'Amplitude A' },
      unit: 'см',
      default: 20,
      min: 1,
      max: 50,
      step: 1,
    },
  },
  renderer: '3d-babylon',
  educationalTopics: [
    'standing-wave', 'harmonics', 'string', 'стояча хвиля', 'гармоніки', 'резонанс', 'хвилі',
  ],
  difficulty: 'school',
  formulas: [
    {
      id: 'speed',
      label: { uk: 'Швидкість хвилі', en: 'Wave speed' },
      latex: String.raw`v=\sqrt{\frac{T}{\mu}}`,
    },
    {
      id: 'freq',
      label: { uk: 'Частота n-ї гармоніки', en: 'Frequency of n-th harmonic' },
      latex: String.raw`f_n=\frac{n}{2L}\sqrt{\frac{T}{\mu}}`,
    },
    {
      id: 'shape',
      label: { uk: 'Форма стоячої хвилі', en: 'Standing wave shape' },
      latex: String.raw`y(x,t)=A\sin\!\left(\frac{n\pi x}{L}\right)\cos(\omega_n t)`,
    },
  ],
};

export class StandingWaveModule
  implements PhysicsModule<StandingWaveParams, StandingWaveState>, BabylonRenderable
{
  readonly meta: ModuleMetadata = META;

  private params: StandingWaveParams = {
    tension: 40,
    linearDensity: 10,
    harmonic: 1,
    amplitude: 20,
  };

  private time = 0;
  private omega = 0;
  private frequency = 0;
  private wavelength = 0;
  private waveSpeed = 0;

  private readonly history = {
    displacement: [] as number[],
    time: [] as number[],
  };

  private meshes: StandingWaveMeshes | null = null;

  private computeWave(): void {
    const { tension, linearDensity, harmonic } = this.params;
    const mu = linearDensity * 1e-3; // g/m → kg/m
    this.waveSpeed = Math.sqrt(tension / mu);
    this.wavelength = (2 * PHYS_L) / harmonic;
    this.frequency = this.waveSpeed / this.wavelength;
    this.omega = 2 * Math.PI * this.frequency;
  }

  init(params: StandingWaveParams): void {
    this.params = params;
    this.time = 0;
    this.computeWave();
    this.history.displacement = [];
    this.history.time = [];
  }

  step(dt: number): void {
    this.time += dt;

    // Sample antinode displacement for chart (x = L/4 for odd harmonics)
    const A = this.params.amplitude * 1e-2; // cm → m
    const xSample = PHYS_L / 4;
    const k = (this.params.harmonic * Math.PI) / PHYS_L;
    const y = A * Math.sin(k * xSample) * Math.cos(this.omega * this.time);
    this.history.displacement.push(y * 100); // store in cm
    this.history.time.push(this.time);
  }

  getState(): StandingWaveState {
    return {
      waveSpeed: this.waveSpeed,
      frequency: this.frequency,
      wavelength: this.wavelength,
      omega: this.omega,
      time: this.time,
    };
  }

  getMetrics(): Metrics {
    return {
      scalars: {
        'f (Гц)': this.frequency,
        'λ (м)': this.wavelength,
        'v (м/с)': this.waveSpeed,
        'n (гармоніка)': this.params.harmonic,
        'T (Н)': this.params.tension,
        't (с)': this.time,
      },
      timeSeries: {
        displacement: this.history.displacement,
        time: this.history.time,
      },
    };
  }

  getPredictionTargets(): PredictionTarget[] {
    return [
      {
        metricKey: 'f (Гц)',
        label: { uk: 'Частота коливань струни', en: 'String oscillation frequency' },
        unit: 'Гц',
        slider: {
          min: 0,
          max: Math.max(this.frequency * 3, 50),
          labelLow: { uk: 'Низька частота (повільні коливання)', en: 'Low frequency (slow oscillation)' },
          labelHigh: { uk: 'Висока частота (швидкі коливання)', en: 'High frequency (fast oscillation)' },
        },
      },
    ];
  }

  getExplanation(predictions: Record<string, number>, locale = 'uk'): string {
    const { harmonic, tension, linearDensity } = this.params;
    const predF = predictions['f (Гц)'] ?? 0;
    const errF = this.frequency > 0
      ? Math.abs(((predF - this.frequency) / this.frequency) * 100).toFixed(1)
      : '—';

    if (locale === 'uk') {
      return (
        `${harmonic}-а гармоніка струни: $f_${harmonic}=${this.frequency.toFixed(2)}\\,\\text{Гц}$ ` +
        `(передбачено: ${predF.toFixed(2)} Гц, похибка: ${errF}%). ` +
        `Швидкість хвилі $v=\\sqrt{T/\\mu}=\\sqrt{${tension}/${(linearDensity / 1000).toFixed(3)}}=${this.waveSpeed.toFixed(1)}\\,\\text{м/с}$. ` +
        `Вузлів: ${harmonic - 1} (жовті кулі), довжина хвилі $\\lambda=${this.wavelength.toFixed(3)}\\,\\text{м}$.`
      );
    }
    return (
      `Harmonic ${harmonic}: $f_${harmonic}=${this.frequency.toFixed(2)}\\,\\text{Hz}$ ` +
      `(predicted: ${predF.toFixed(2)} Hz, error: ${errF}%). ` +
      `Wave speed $v=\\sqrt{T/\\mu}=${this.waveSpeed.toFixed(1)}\\,\\text{m/s}$. ` +
      `Nodes: ${harmonic - 1} (yellow spheres), wavelength $\\lambda=${this.wavelength.toFixed(3)}\\,\\text{m}$.`
    );
  }

  reset(): void {
    this.init(this.params);
  }

  dispose(): void {
    this.meshes = null;
  }

  babylonSetup(scene: Scene): void {
    const camera = scene.activeCamera as ArcRotateCamera | null;
    if (camera) {
      camera.target = new Vector3(0, -0.5, 0);
      camera.radius = 6;
      camera.beta = Math.PI * 0.38;
    }
    this.meshes = setupStandingWaveScene(scene);
    this.renderFrame();
  }

  babylonFrame(scene: Scene): void {
    void scene;
    this.renderFrame();
  }

  private renderFrame(): void {
    if (!this.meshes) return;
    const A_world = (this.params.amplitude * 1e-2) * (STRING_LENGTH / PHYS_L); // scale to world units
    updateStandingWaveScene(
      this.meshes,
      this.params.harmonic,
      A_world,
      this.omega,
      this.time,
      this.waveSpeed,
      this.frequency,
      this.wavelength,
    );
  }
}
