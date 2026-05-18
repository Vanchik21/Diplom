// Physics: Newtonian gravity between three point masses in 2D.
// F_ij = G * m_i * m_j / (|r_ij|² + ε²) * r̂_ij   (softened potential)
// Integration: RK4 with fixed sub-step 0.001 s (×timeScale).
// Gravitational constant G = 1 (normalized units).
//
// Presets:
//   0 — Figure-eight (Chenciner-Montgomery, equal masses, periodic ~6.33 tu)
//   1 — Hierarchical (sun-planet-moon style)
//   2 — Chaotic triangle (breaks quickly, demonstrates sensitivity)

import { type Scene, ArcRotateCamera, Vector3 } from '@babylonjs/core';
import type { Metrics, ModuleMetadata, PhysicsModule, PredictionTarget } from '@physis/sdk';
import type { BabylonRenderable } from '../../rendering/babylon/babylon-renderable';
import {
  setupThreeBodyScene,
  updateThreeBodyScene,
  type ThreeBodyMeshes,
} from './three-body.renderer';
import type {
  ThreeBodyParams,
  ThreeBodyState12,
  ThreeBodyRenderState,
} from './three-body.types';

const G = 1.0;
const FIXED_DT = 0.001;
const MAX_ACCUMULATOR = 0.05;

const META: ModuleMetadata = {
  id: 'three-body',
  name: { uk: 'Задача трьох тіл', en: 'Three-Body Problem' },
  category: 'gravity',
  description: {
    uk: 'Гравітаційна взаємодія трьох тіл. Демонстрація хаотичності, нестабільності та чутливості до початкових умов.',
    en: 'Gravitational interaction of three bodies. Demonstrates chaos, instability and sensitivity to initial conditions.',
  },
  defaultParams: {
    mass1: {
      type: 'number',
      label: { uk: 'Маса тіла 1', en: 'Mass 1' },
      default: 1,
      min: 0.1,
      max: 10,
      step: 0.1,
    },
    mass2: {
      type: 'number',
      label: { uk: 'Маса тіла 2', en: 'Mass 2' },
      default: 1,
      min: 0.1,
      max: 10,
      step: 0.1,
    },
    mass3: {
      type: 'number',
      label: { uk: 'Маса тіла 3', en: 'Mass 3' },
      default: 1,
      min: 0.1,
      max: 10,
      step: 0.1,
    },
    preset: {
      type: 'number',
      label: { uk: 'Пресет (0=вісімка, 1=ієрархічна, 2=хаотична)', en: 'Preset (0=figure-eight, 1=hierarchical, 2=chaotic)' },
      default: 0,
      min: 0,
      max: 2,
      step: 1,
    },
    timeScale: {
      type: 'number',
      label: { uk: 'Швидкість симуляції', en: 'Time scale' },
      default: 1,
      min: 0.1,
      max: 5,
      step: 0.1,
    },
    softening: {
      type: 'number',
      label: { uk: 'Пом\'якшення ε', en: 'Softening ε' },
      default: 0.01,
      min: 0.001,
      max: 0.5,
      step: 0.005,
    },
  },
  renderer: '3d-babylon',
  educationalTopics: [
    'three-body', 'chaos', 'n-body', 'три тіла', 'хаос', 'гравітація', 'нестабільність',
  ],
  difficulty: 'university',
  formulas: [
    {
      id: 'gravity',
      label: { uk: 'Сила тяжіння (з пом\'якшенням)', en: 'Gravity (softened)' },
      latex: String.raw`\vec{F}_{ij}=\frac{Gm_im_j}{|\vec{r}_{ij}|^2+\varepsilon^2}\hat{r}_{ij}`,
    },
    {
      id: 'energy',
      label: { uk: 'Повна енергія', en: 'Total energy' },
      latex: String.raw`E=\sum_i\frac{1}{2}m_iv_i^2-\sum_{i<j}\frac{Gm_im_j}{r_{ij}}`,
    },
  ],
};

// Initial conditions for each preset
function getInitialState(preset: number, m1: number, m2: number, m3: number): ThreeBodyState12 {
  switch (preset) {
    case 0: {
      // Figure-eight (Chenciner-Montgomery, G=1, equal masses = 1)
      // Rescale positions/velocities if masses differ
      const mFactor = 1 / ((m1 + m2 + m3) / 3); // scale so average mass ~1
      const vScale = Math.sqrt(1 / mFactor);
      return [
        0.97000436,  -0.24308753, 0.46620369 * vScale,  0.43236573 * vScale,
       -0.97000436,   0.24308753, 0.46620369 * vScale,  0.43236573 * vScale,
        0,            0,         -0.93240737 * vScale, -0.86473146 * vScale,
      ];
    }
    case 1: {
      // Hierarchical: heavy central body + two lighter orbiting bodies
      const M = m1;
      const v1 = Math.sqrt(G * M / 2.0); // orbit radius 2
      const v2 = Math.sqrt(G * M / 3.5); // orbit radius 3.5
      return [
        0,    0,    0,   0,       // central body, at rest
        2.0,  0,    0,   v1,      // body 2 circular orbit
        -3.5, 0,    0,  -v2,      // body 3 circular orbit (opposite side)
      ];
    }
    default: {
      // Chaotic: nearly-equilateral triangle with slight velocity perturbation
      const r = 1.5;
      const om = Math.sqrt(G * (m1 + m2 + m3) / (r * r * r)) * 0.8;
      return [
        r,             0,           0,          r * om * 0.95,
       -r / 2,   r * Math.sqrt(3) / 2, -r * om * 1.05,   0,
       -r / 2,  -r * Math.sqrt(3) / 2,  r * om * 0.5,  -r * om * 0.9,
      ];
    }
  }
}

type Vec2 = [number, number];

function accel(
  state: ThreeBodyState12,
  masses: [number, number, number],
  eps2: number,
): [Vec2, Vec2, Vec2] {
  const bodies: [Vec2, Vec2, Vec2] = [
    [state[0], state[1]],
    [state[4], state[5]],
    [state[8], state[9]],
  ];
  const acc: [Vec2, Vec2, Vec2] = [[0, 0], [0, 0], [0, 0]];

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (i === j) continue;
      const dx = bodies[j][0] - bodies[i][0];
      const dy = bodies[j][1] - bodies[i][1];
      const dist2 = dx * dx + dy * dy + eps2;
      const inv = G * masses[j] / (dist2 * Math.sqrt(dist2));
      acc[i][0] += inv * dx;
      acc[i][1] += inv * dy;
    }
  }
  return acc;
}

function rk4Step(
  s: ThreeBodyState12,
  dt: number,
  masses: [number, number, number],
  eps2: number,
): ThreeBodyState12 {
  const derive = (st: ThreeBodyState12): ThreeBodyState12 => {
    const a = accel(st, masses, eps2);
    return [
      st[2],  st[3],  a[0][0], a[0][1],
      st[6],  st[7],  a[1][0], a[1][1],
      st[10], st[11], a[2][0], a[2][1],
    ];
  };

  const k1 = derive(s);
  const s2 = s.map((v, i) => v + 0.5 * dt * k1[i]) as ThreeBodyState12;
  const k2 = derive(s2);
  const s3 = s.map((v, i) => v + 0.5 * dt * k2[i]) as ThreeBodyState12;
  const k3 = derive(s3);
  const s4 = s.map((v, i) => v + dt * k3[i]) as ThreeBodyState12;
  const k4 = derive(s4);

  return s.map((v, i) =>
    v + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])
  ) as ThreeBodyState12;
}

export class ThreeBodyModule
  implements PhysicsModule<ThreeBodyParams, ThreeBodyRenderState>, BabylonRenderable
{
  readonly meta: ModuleMetadata = META;

  private params: ThreeBodyParams = {
    mass1: 1, mass2: 1, mass3: 1,
    preset: 0, timeScale: 1, softening: 0.01,
  };

  private state: ThreeBodyState12 = [0,0,0,0, 0,0,0,0, 0,0,0,0];
  private masses: [number, number, number] = [1, 1, 1];
  private time = 0;
  private accumulator = 0;
  private energy0 = 0;

  private readonly history = {
    energy: [] as number[],
    time: [] as number[],
    separation: [] as number[],
  };

  private meshes: ThreeBodyMeshes | null = null;

  private totalEnergy(): number {
    const [x1, y1, vx1, vy1, x2, y2, vx2, vy2, x3, y3, vx3, vy3] = this.state;
    const [m1, m2, m3] = this.masses;

    const ke = 0.5 * m1 * (vx1**2 + vy1**2)
             + 0.5 * m2 * (vx2**2 + vy2**2)
             + 0.5 * m3 * (vx3**2 + vy3**2);

    const r12 = Math.sqrt((x2-x1)**2 + (y2-y1)**2) + 1e-9;
    const r13 = Math.sqrt((x3-x1)**2 + (y3-y1)**2) + 1e-9;
    const r23 = Math.sqrt((x3-x2)**2 + (y3-y2)**2) + 1e-9;

    const pe = -G * m1 * m2 / r12 - G * m1 * m3 / r13 - G * m2 * m3 / r23;

    return ke + pe;
  }

  init(params: ThreeBodyParams): void {
    this.params = params;
    this.masses = [params.mass1, params.mass2, params.mass3];
    this.state = getInitialState(params.preset, params.mass1, params.mass2, params.mass3);
    this.time = 0;
    this.accumulator = 0;
    this.energy0 = this.totalEnergy();
    this.history.energy = [this.energy0];
    this.history.time = [0];
    this.history.separation = [0];
  }

  step(dt: number): void {
    const scaledDt = dt * this.params.timeScale;
    this.accumulator += Math.min(scaledDt, MAX_ACCUMULATOR);
    const eps2 = this.params.softening ** 2;

    while (this.accumulator >= FIXED_DT) {
      this.state = rk4Step(this.state, FIXED_DT, this.masses, eps2);
      this.time += FIXED_DT;
      this.accumulator -= FIXED_DT;
    }

    const E = this.totalEnergy();
    const [x1, y1, , , x2, y2] = this.state;
    const sep = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

    this.history.energy.push(E);
    this.history.separation.push(sep);
    this.history.time.push(this.time);
  }

  getState(): ThreeBodyRenderState {
    const [x1, y1, , , x2, y2, , , x3, y3] = this.state;
    return {
      pos: [[x1, y1], [x2, y2], [x3, y3]],
      time: this.time,
    };
  }

  getMetrics(): Metrics {
    const E = this.totalEnergy();
    const dE = this.energy0 !== 0 ? ((E - this.energy0) / Math.abs(this.energy0)) * 100 : 0;
    const [x1, y1, , , x2, y2, , , x3, y3] = this.state;
    const r12 = Math.sqrt((x2-x1)**2 + (y2-y1)**2);
    const r13 = Math.sqrt((x3-x1)**2 + (y3-y1)**2);
    const r23 = Math.sqrt((x3-x2)**2 + (y3-y2)**2);

    return {
      scalars: {
        'E (повна)': E,
        'ΔE (%)': dE,
        'r₁₂': r12,
        'r₁₃': r13,
        'r₂₃': r23,
        't': this.time,
      },
      timeSeries: {
        energy: this.history.energy,
        separation: this.history.separation,
        time: this.history.time,
      },
    };
  }

  getPredictionTargets(): PredictionTarget[] {
    return [
      {
        metricKey: 'r₁₂',
        label: { uk: 'Відстань між тілами 1 і 2', en: 'Distance between bodies 1 and 2' },
        unit: 'а.о.',
        slider: {
          min: 0,
          max: 5,
          labelLow: { uk: 'Близько (можливе злиття)', en: 'Close (possible merger)' },
          labelHigh: { uk: 'Далеко (тіло вилетіло)', en: 'Far (body ejected)' },
        },
      },
      {
        metricKey: 'ΔE (%)',
        label: { uk: 'Похибка збереження енергії', en: 'Energy conservation error' },
        unit: '%',
        slider: {
          min: 0,
          max: 10,
          labelLow: { uk: 'Висока точність (мала похибка)', en: 'High accuracy (small error)' },
          labelHigh: { uk: 'Велика похибка (тіла зближуються)', en: 'Large error (bodies approach)' },
        },
      },
    ];
  }

  getExplanation(predictions: Record<string, number>, locale = 'uk'): string {
    const E = this.totalEnergy();
    const dE = this.energy0 !== 0
      ? Math.abs((E - this.energy0) / this.energy0 * 100).toFixed(3)
      : '0';
    const preset = ['вісімка', 'ієрархічна', 'хаотична'][this.params.preset] ?? '';

    if (locale === 'uk') {
      return (
        `Задача трьох тіл ($G=1$, пресет: ${preset}). ` +
        `RK4 зберігає повну енергію $E=${E.toFixed(4)}$ з відносною похибкою ${dE}% ` +
        `(менше пом'якшення ε → вища точність, але ризик сингулярності). ` +
        `При $\\varepsilon\\to 0$ і великих кутових зближеннях система проявляє ` +
        `чутливість до початкових умов — характеристику хаотичних систем.`
      );
    }
    return (
      `Three-body problem ($G=1$, preset: ${['figure-eight','hierarchical','chaotic'][this.params.preset]}). ` +
      `RK4 conserves total energy $E=${E.toFixed(4)}$ with relative error ${dE}% ` +
      `(smaller softening ε → higher accuracy but singularity risk). ` +
      `Near close approaches the system exhibits sensitivity to initial conditions — ` +
      `a hallmark of chaotic dynamics.`
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
      camera.beta = Math.PI * 0.38;
      camera.lowerRadiusLimit = 1;
      camera.upperRadiusLimit = 25;
      const presetRadii = [5, 12, 5];
      camera.radius = presetRadii[this.params.preset] ?? 5;
    }
    this.meshes = setupThreeBodyScene(scene);
    updateThreeBodyScene(this.getState(), this.meshes, this.masses);
  }

  babylonFrame(scene: Scene): void {
    void scene;
    if (this.meshes) {
      updateThreeBodyScene(this.getState(), this.meshes, this.masses);
    }
  }
}
