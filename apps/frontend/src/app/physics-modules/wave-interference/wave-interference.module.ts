// Physics: Superposition of two circular waves from point sources.
// u(x,y,t) = A·cos(k·r₁ − ωt) + A·cos(k·r₂ − ωt + Δφ)
// Analytic — no numerical ODE. Rendered as a per-pixel heatmap on DynamicTexture.
//
// World-space convention: 1 world unit = 1 m (physical).
// Wave speed assumed c = 1 m/s (dimensionless demo); ω = k·c = k.
// This keeps parameters in familiar cm/Hz range without distorting the pattern.

import { type Scene, ArcRotateCamera, Vector3 } from '@babylonjs/core';
import type { Metrics, ModuleMetadata, PhysicsModule, PredictionTarget } from '@physis/sdk';
import type { BabylonRenderable } from '../../rendering/babylon/babylon-renderable';
import {
  setupWaveInterferenceScene,
  updateWaveInterferenceScene,
  type WaveInterferenceMeshes,
} from './wave-interference.renderer';
import type { WaveInterferenceParams, WaveInterferenceState } from './wave-interference.types';

// Physical simulation: world units = metres, wave speed c = 3 m/s (visual speed, not light)
const WAVE_SPEED = 3.0; // m/s — keeps animation visually pleasing

const META: ModuleMetadata = {
  id: 'wave-interference',
  name: { uk: 'Інтерференція двох когерентних джерел', en: 'Two-Source Wave Interference' },
  category: 'waves',
  description: {
    uk: 'Двопроменева інтерференція. Картина максимумів і мінімумів залежно від відстані між джерелами та довжини хвилі.',
    en: 'Two-source interference. Pattern of maxima and minima depending on source distance and wavelength.',
  },
  defaultParams: {
    wavelength: {
      type: 'number',
      label: { uk: 'Довжина хвилі λ', en: 'Wavelength λ' },
      unit: 'м',
      default: 1.0,
      min: 0.2,
      max: 3.0,
      step: 0.1,
    },
    sourceDistance: {
      type: 'number',
      label: { uk: 'Відстань між джерелами d', en: 'Source separation d' },
      unit: 'м',
      default: 2.0,
      min: 0.2,
      max: 4.0,
      step: 0.1,
    },
    phaseDiff: {
      type: 'number',
      label: { uk: 'Різниця фаз Δφ', en: 'Phase difference Δφ' },
      unit: '°',
      default: 0,
      min: 0,
      max: 360,
      step: 10,
    },
    amplitude: {
      type: 'number',
      label: { uk: 'Амплітуда', en: 'Amplitude' },
      default: 1,
      min: 1,
      max: 3,
      step: 1,
    },
  },
  renderer: '3d-babylon',
  educationalTopics: [
    'interference', 'coherence', 'double-slit', 'інтерференція', 'хвилі', 'когерентність', 'максимум', 'мінімум',
  ],
  difficulty: 'university',
  formulas: [
    {
      id: 'superposition',
      label: { uk: 'Суперпозиція хвиль', en: 'Wave superposition' },
      latex: String.raw`u=A\cos(kr_1-\omega t)+A\cos(kr_2-\omega t+\Delta\varphi)`,
    },
    {
      id: 'maxima',
      label: { uk: 'Умова максимуму', en: 'Constructive interference' },
      latex: String.raw`\Delta r = r_2 - r_1 = m\lambda,\quad m\in\mathbb{Z}`,
    },
    {
      id: 'minima',
      label: { uk: 'Умова мінімуму', en: 'Destructive interference' },
      latex: String.raw`\Delta r = \left(m+\tfrac{1}{2}\right)\lambda`,
    },
  ],
};

export class WaveInterferenceModule
  implements PhysicsModule<WaveInterferenceParams, WaveInterferenceState>, BabylonRenderable
{
  readonly meta: ModuleMetadata = META;

  private params: WaveInterferenceParams = {
    wavelength: 1.0,
    sourceDistance: 2.0,
    phaseDiff: 0,
    amplitude: 1,
  };

  private time = 0;
  private omega = 0;
  private kWave = 0;
  private frequency = 0;

  private readonly history = {
    time: [] as number[],
  };

  private meshes: WaveInterferenceMeshes | null = null;

  private computeWave(): void {
    const { wavelength } = this.params;
    this.kWave = (2 * Math.PI) / wavelength;
    this.frequency = WAVE_SPEED / wavelength;
    this.omega = 2 * Math.PI * this.frequency;
  }

  init(params: WaveInterferenceParams): void {
    this.params = params;
    this.time = 0;
    this.computeWave();
    this.history.time = [];
  }

  step(dt: number): void {
    this.time += dt;
    this.history.time.push(this.time);
  }

  getState(): WaveInterferenceState {
    return {
      time: this.time,
      frequency: this.frequency,
      omega: this.omega,
      kWave: this.kWave,
    };
  }

  getMetrics(): Metrics {
    const { wavelength, sourceDistance, phaseDiff } = this.params;
    // Number of maxima in far field: approx d/λ on each side
    const maxima = Math.floor(sourceDistance / wavelength);

    return {
      scalars: {
        'λ (м)': wavelength,
        'd (м)': sourceDistance,
        'f (Гц)': this.frequency,
        'Δφ (°)': phaseDiff,
        'Максимумів ≈': maxima * 2 + 1,
        't (с)': this.time,
      },
      timeSeries: {
        time: this.history.time,
      },
    };
  }

  getPredictionTargets(): PredictionTarget[] {
    const { sourceDistance, wavelength } = this.params;
    const maxima = Math.floor(sourceDistance / wavelength) * 2 + 1;

    return [
      {
        metricKey: 'Максимумів ≈',
        label: { uk: 'Кількість максимумів інтерференції', en: 'Number of interference maxima' },
        unit: '',
        slider: {
          min: 1,
          max: 15,
          labelLow: { uk: 'Мало максимумів (λ велика або d мала)', en: 'Few maxima (λ large or d small)' },
          labelHigh: { uk: 'Багато максимумів (λ мала або d велика)', en: 'Many maxima (λ small or d large)' },
        },
      },
    ];
  }

  getExplanation(predictions: Record<string, number>, locale = 'uk'): string {
    const { wavelength, sourceDistance, phaseDiff } = this.params;
    const maxima = Math.floor(sourceDistance / wavelength) * 2 + 1;
    const predM = predictions['Максимумів ≈'] ?? 0;
    const errM = maxima > 0 ? Math.abs(((predM - maxima) / maxima) * 100).toFixed(1) : '—';
    const phaseStr = phaseDiff === 0
      ? (locale === 'uk' ? 'джерела синфазні' : 'sources in phase')
      : (locale === 'uk' ? `різниця фаз ${phaseDiff}°` : `phase diff ${phaseDiff}°`);

    if (locale === 'uk') {
      return (
        `Два когерентні джерела (${phaseStr}), $d=${sourceDistance}\\,\\text{м}$, $\\lambda=${wavelength}\\,\\text{м}$. ` +
        `Умова максимуму: $\\Delta r=m\\lambda$, кількість максимумів $\\approx${maxima}$ ` +
        `(передбачено: ${Math.round(predM)}, похибка: ${errM}%). ` +
        `Синій колір — позитивна фаза, червоний — негативна, чорний — вузол (мінімум).`
      );
    }
    return (
      `Two coherent sources (${phaseStr}), $d=${sourceDistance}\\,\\text{m}$, $\\lambda=${wavelength}\\,\\text{m}$. ` +
      `Constructive condition: $\\Delta r=m\\lambda$, maxima $\\approx${maxima}$ ` +
      `(predicted: ${Math.round(predM)}, error: ${errM}%). ` +
      `Blue = positive phase, red = negative phase, black = node (minimum).`
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
      camera.target = new Vector3(0, 0, 0);
      camera.alpha = Math.PI / 2;
      camera.beta = Math.PI * 0.4;
      camera.radius = 8;
    }
    this.meshes = setupWaveInterferenceScene(scene);
    this.renderFrame();
  }

  babylonFrame(scene: Scene): void {
    void scene;
    this.renderFrame();
  }

  private renderFrame(): void {
    if (!this.meshes) return;
    updateWaveInterferenceScene(
      this.meshes,
      this.params.sourceDistance,
      this.kWave,
      this.params.phaseDiff * (Math.PI / 180),
      this.time,
      this.omega,
    );
  }
}
