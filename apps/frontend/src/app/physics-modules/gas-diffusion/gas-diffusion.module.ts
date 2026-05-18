// Physics: Two-species ideal gas diffusion — kinetic model.
// Same elastic wall collisions as ideal-gas module (no inter-particle collisions).
// Two populations: species 0 (blue, starts left half) and species 1 (red, starts right half).
// Mixing tracked by concentration of each species in each half.
// Entropy proxy: S ≈ -[c·ln(c) + (1-c)·ln(1-c)] where c = fraction of blue in left half.
// Integration: Euler with capped dt.

import { type Scene, ArcRotateCamera, Vector3 } from '@babylonjs/core';
import type { Metrics, ModuleMetadata, PhysicsModule, PredictionTarget } from '@physis/sdk';
import type { BabylonRenderable } from '../../rendering/babylon/babylon-renderable';
import {
  setupGasDiffusionScene,
  updateGasDiffusionScene,
  type GasDiffusionMeshes,
} from './gas-diffusion.renderer';
import type { GasDiffusionParams, GasDiffusionState, DiffusionParticle } from './gas-diffusion.types';

const MAX_N_SPECIES = 250;
const MAX_STEP = 0.016;

const META: ModuleMetadata = {
  id: 'gas-diffusion',
  name: { uk: 'Дифузія двох газів', en: 'Gas Diffusion (Two Species)' },
  category: 'thermo',
  description: {
    uk: 'Дві популяції частинок у коробці поступово змішуються. Ілюстрація другого начала термодинаміки на рівні кінетичної моделі.',
    en: 'Two particle populations in a box gradually mix. Illustrates the second law of thermodynamics through a kinetic model.',
  },
  defaultParams: {
    particleCount: {
      type: 'number',
      label: { uk: 'Частинок кожного виду N', en: 'Particles per species N' },
      default: 100,
      min: 20,
      max: MAX_N_SPECIES,
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
    separated: {
      type: 'number',
      label: { uk: 'Старт розділено (1) / перемішано (0)', en: 'Start separated (1) / mixed (0)' },
      default: 1,
      min: 0,
      max: 1,
      step: 1,
    },
  },
  renderer: '3d-babylon',
  educationalTopics: [
    'diffusion', 'entropy', 'random-walk', 'дифузія', 'ентропія',
    'друге начало термодинаміки', 'термодинаміка',
  ],
  difficulty: 'university',
  formulas: [
    {
      id: 'entropy',
      label: { uk: 'Ентропія змішування (Больцман)', en: 'Entropy of mixing (Boltzmann)' },
      latex: String.raw`S = -Nk_B\bigl[c\ln c + (1-c)\ln(1-c)\bigr]`,
    },
    {
      id: 'second-law',
      label: { uk: 'Другий закон: ентропія зростає', en: 'Second law: entropy increases' },
      latex: String.raw`\Delta S \geq 0`,
    },
    {
      id: 'diffusion',
      label: { uk: 'Закон Фіка (макро)', en: "Fick's law (macro)" },
      latex: String.raw`J = -D\,\frac{\partial c}{\partial x}`,
    },
  ],
};

function randn(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function entropyProxy(c: number): number {
  if (c <= 0 || c >= 1) return 0;
  return -(c * Math.log(c) + (1 - c) * Math.log(1 - c));
}

export class GasDiffusionModule
  implements PhysicsModule<GasDiffusionParams, GasDiffusionState>, BabylonRenderable
{
  readonly meta: ModuleMetadata = META;

  private params: GasDiffusionParams = {
    particleCount: 100,
    temperature: 4,
    boxWidth: 10,
    boxHeight: 7,
    separated: 1,
  };

  private particles: DiffusionParticle[] = [];
  private time = 0;

  private blueLeftHistory: number[] = [];
  private redRightHistory: number[] = [];
  private entropyHistory: number[] = [];
  private timeHistory: number[] = [];

  private concBlueLeft = 1;
  private concRedRight = 1;

  private meshes: GasDiffusionMeshes | null = null;

  private initParticles(): void {
    const { particleCount, temperature, boxWidth, boxHeight, separated } = this.params;
    const N = Math.min(particleCount, MAX_N_SPECIES);
    const sigma = Math.sqrt(temperature);
    this.particles = [];

    for (let i = 0; i < N; i++) {
      // Blue (species 0): left half if separated, else full box
      const xBlue = separated
        ? Math.random() * (boxWidth / 2)
        : Math.random() * boxWidth;
      this.particles.push({
        x: xBlue,
        y: Math.random() * boxHeight,
        vx: randn() * sigma,
        vy: randn() * sigma,
        species: 0,
      });
    }

    for (let i = 0; i < N; i++) {
      // Red (species 1): right half if separated, else full box
      const xRed = separated
        ? boxWidth / 2 + Math.random() * (boxWidth / 2)
        : Math.random() * boxWidth;
      this.particles.push({
        x: xRed,
        y: Math.random() * boxHeight,
        vx: randn() * sigma,
        vy: randn() * sigma,
        species: 1,
      });
    }
  }

  private updateConcentrations(): void {
    const { boxWidth } = this.params;
    const half = boxWidth / 2;
    let blueLeft = 0, blueTotal = 0;
    let redRight = 0, redTotal = 0;

    for (const p of this.particles) {
      if (p.species === 0) {
        blueTotal++;
        if (p.x < half) blueLeft++;
      } else {
        redTotal++;
        if (p.x >= half) redRight++;
      }
    }

    this.concBlueLeft = blueTotal > 0 ? blueLeft / blueTotal : 0;
    this.concRedRight = redTotal > 0 ? redRight / redTotal : 0;
  }

  init(params: GasDiffusionParams): void {
    this.params = params;
    this.time = 0;
    this.blueLeftHistory = [];
    this.redRightHistory = [];
    this.entropyHistory = [];
    this.timeHistory = [];
    this.concBlueLeft = 1;
    this.concRedRight = 1;
    this.initParticles();
    this.updateConcentrations();
  }

  step(dt: number): void {
    const { boxWidth: W, boxHeight: H } = this.params;
    const safedt = Math.min(dt, MAX_STEP);

    for (const p of this.particles) {
      p.x += p.vx * safedt;
      p.y += p.vy * safedt;

      if (p.x <= 0)      { p.x = -p.x;      p.vx = -p.vx; }
      else if (p.x >= W) { p.x = 2 * W - p.x; p.vx = -p.vx; }
      if (p.y <= 0)      { p.y = -p.y;      p.vy = -p.vy; }
      else if (p.y >= H) { p.y = 2 * H - p.y; p.vy = -p.vy; }
    }

    this.time += safedt;
    this.updateConcentrations();

    // Record every frame
    this.blueLeftHistory.push(this.concBlueLeft);
    this.redRightHistory.push(this.concRedRight);
    this.entropyHistory.push(entropyProxy(this.concBlueLeft));
    this.timeHistory.push(this.time);
  }

  getState(): GasDiffusionState {
    const mixing = 1 - Math.abs(this.concBlueLeft - 0.5) * 2;
    return {
      particles: this.particles,
      concBlueLeft: this.concBlueLeft,
      concRedRight: this.concRedRight,
      mixingIndex: Math.max(0, mixing),
    };
  }

  getMetrics(): Metrics {
    const state = this.getState();
    const entropy = entropyProxy(this.concBlueLeft);

    return {
      scalars: {
        'Сині вліво (%)': this.concBlueLeft * 100,
        'Червоні вправо (%)': this.concRedRight * 100,
        'Індекс змішування': state.mixingIndex,
        'Ентропія S': entropy,
        't (с)': this.time,
      },
      timeSeries: {
        blueLeft: this.blueLeftHistory,
        redRight: this.redRightHistory,
        entropy: this.entropyHistory,
        time: this.timeHistory,
      },
    };
  }

  getPredictionTargets(): PredictionTarget[] {
    return [
      {
        metricKey: 'Індекс змішування',
        label: { uk: 'Ступінь змішування газів', en: 'Mixing index' },
        unit: '',
        slider: {
          min: 0,
          max: 1,
          labelLow: { uk: 'Повністю розділені', en: 'Fully separated' },
          labelHigh: { uk: 'Повністю перемішані', en: 'Fully mixed' },
        },
      },
      {
        metricKey: 'Ентропія S',
        label: { uk: 'Ентропія системи', en: 'System entropy' },
        unit: '',
        slider: {
          min: 0,
          max: Math.log(2),
          labelLow: { uk: 'Мала ентропія (впорядкована система)', en: 'Low entropy (ordered)' },
          labelHigh: { uk: 'Максимальна ентропія (ln 2 ≈ 0.693)', en: 'Maximum entropy (ln 2 ≈ 0.693)' },
        },
      },
    ];
  }

  getExplanation(predictions: Record<string, number>, locale = 'uk'): string {
    const S = entropyProxy(this.concBlueLeft);
    const Smax = Math.log(2);
    const predS = predictions['Ентропія S'] ?? 0;
    const errS = S > 0.01 ? Math.abs(((predS - S) / S) * 100).toFixed(1) : '—';

    if (locale === 'uk') {
      return (
        `Друге начало термодинаміки: система самовільно переходить у стан з максимальною ентропією. ` +
        `Поточна ентропія $S=${S.toFixed(3)}$ (макс $\\ln 2\\approx${Smax.toFixed(3)}$), ` +
        `передбачено: ${predS.toFixed(3)}, похибка: ${errS}%. ` +
        `Синя крива — частка синіх частинок у лівій половині (спадає від 1 до 0.5). ` +
        `Червона — частка червоних у правій половині. Обидва прямують до 50%.`
      );
    }
    return (
      `Second law of thermodynamics: the system spontaneously evolves toward maximum entropy. ` +
      `Current entropy $S=${S.toFixed(3)}$ (max $\\ln 2\\approx${Smax.toFixed(3)}$), ` +
      `predicted: ${predS.toFixed(3)}, error: ${errS}%. ` +
      `Blue curve: fraction of blue particles in left half (decreasing from 1 to 0.5). ` +
      `Red curve: fraction of red in right half. Both approach 50%.`
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
    this.meshes = setupGasDiffusionScene(scene);
  }

  babylonFrame(scene: Scene): void {
    void scene;
    if (!this.meshes) return;
    updateGasDiffusionScene(
      this.meshes,
      this.getState(),
      this.params.boxWidth,
      this.params.boxHeight,
      this.blueLeftHistory,
      this.redRightHistory,
    );
  }
}
