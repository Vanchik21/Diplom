// Physics: Lorentz force F = q(E + v×B).
// B field along +Z axis, E field along +Y axis.
// Numerical integration: RK4 with fixed sub-step dt=0.5 ms.
// For pure B: circular motion, radius r = v/(q/m * B), period T = 2π/(q/m * B).
// For B+E: cycloidal drift with drift velocity vD = E/B along X.

import { type Scene, ArcRotateCamera, Vector3 } from '@babylonjs/core';
import type { Metrics, ModuleMetadata, PhysicsModule, PredictionTarget } from '@physis/sdk';
import type { BabylonRenderable } from '../../rendering/babylon/babylon-renderable';
import {
  setupLorentzScene,
  updateLorentzScene,
  type LorentzMeshes,
} from './lorentz-particle.renderer';
import type { LorentzParams, LorentzState } from './lorentz-particle.types';

const FIXED_DT = 0.0005;
const MAX_ACCUMULATOR = 0.05;
const MAX_POS = 500; // physics units — reset trail if particle escapes

const META: ModuleMetadata = {
  id: 'lorentz-particle',
  name: { uk: 'Заряджена частинка в магнітному полі', en: 'Charged Particle in Magnetic Field' },
  category: 'em',
  description: {
    uk: 'Сила Лоренца у комбінованих електричному та магнітному полях. Циклоїдальні та спіральні траєкторії залежно від співвідношення полів.',
    en: 'Lorentz force in combined electric and magnetic fields. Cycloidal and spiral trajectories depending on field ratio.',
  },
  defaultParams: {
    bField: {
      type: 'number',
      label: { uk: 'Магнітне поле B (вздовж Z)', en: 'Magnetic field B (along Z)' },
      unit: 'Тл',
      default: 1.0,
      min: 0,
      max: 5,
      step: 0.1,
    },
    eField: {
      type: 'number',
      label: { uk: 'Електричне поле E (вздовж Y)', en: 'Electric field E (along Y)' },
      unit: 'В/м',
      default: 0,
      min: -50,
      max: 50,
      step: 1,
    },
    qOverM: {
      type: 'number',
      label: { uk: 'Питомий заряд q/m', en: 'Charge-to-mass ratio q/m' },
      unit: 'Кл/кг',
      default: 1.0,
      min: 0.1,
      max: 5,
      step: 0.1,
    },
    initialVx: {
      type: 'number',
      label: { uk: 'Початкова швидкість vₓ', en: 'Initial velocity vₓ' },
      unit: 'м/с',
      default: 20,
      min: -50,
      max: 50,
      step: 1,
    },
    initialVy: {
      type: 'number',
      label: { uk: 'Початкова швидкість vᵧ', en: 'Initial velocity vᵧ' },
      unit: 'м/с',
      default: 0,
      min: -50,
      max: 50,
      step: 1,
    },
  },
  renderer: '3d-babylon',
  educationalTopics: [
    'lorentz', 'charged-particle', 'magnetic-field', 'електромагнетизм',
    'сила лоренца', 'циклотрон', 'циклоїда',
  ],
  difficulty: 'university',
  formulas: [
    {
      id: 'lorentz',
      label: { uk: 'Сила Лоренца', en: 'Lorentz force' },
      latex: String.raw`\vec{F}=q(\vec{E}+\vec{v}\times\vec{B})`,
    },
    {
      id: 'radius',
      label: { uk: 'Радіус циклотрону', en: 'Cyclotron radius' },
      latex: String.raw`r=\frac{mv_\perp}{|q|B}=\frac{v_\perp}{(q/m)B}`,
    },
    {
      id: 'period',
      label: { uk: 'Циклотронний період', en: 'Cyclotron period' },
      latex: String.raw`T=\frac{2\pi m}{|q|B}=\frac{2\pi}{(q/m)B}`,
    },
    {
      id: 'drift',
      label: { uk: 'Дрейфова швидкість (E×B)', en: 'E×B drift velocity' },
      latex: String.raw`v_D=\frac{E}{B}`,
    },
  ],
};

type State4 = [number, number, number, number]; // [x, y, vx, vy]

function derivatives(s: State4, p: LorentzParams): State4 {
  const [, , vx, vy] = s;
  const { bField: B, eField: E, qOverM } = p;
  // F/m = qOverM * (E_y ĵ + (v × B)): v×B with B=Bẑ gives (vy*B, -vx*B, 0)
  const ax = qOverM * (vy * B);
  const ay = qOverM * (E - vx * B);
  return [vx, vy, ax, ay];
}

function rk4Step(s: State4, dt: number, p: LorentzParams): State4 {
  const k1 = derivatives(s, p);
  const s2 = s.map((v, i) => v + 0.5 * dt * k1[i]) as State4;
  const k2 = derivatives(s2, p);
  const s3 = s.map((v, i) => v + 0.5 * dt * k2[i]) as State4;
  const k3 = derivatives(s3, p);
  const s4 = s.map((v, i) => v + dt * k3[i]) as State4;
  const k4 = derivatives(s4, p);
  return s.map((v, i) => v + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])) as State4;
}

export class LorentzParticleModule
  implements PhysicsModule<LorentzParams, LorentzState>, BabylonRenderable
{
  readonly meta: ModuleMetadata = META;

  private params: LorentzParams = {
    bField: 1.0, eField: 0, qOverM: 1.0,
    initialVx: 20, initialVy: 0,
  };

  private state: State4 = [0, 0, 0, 0];
  private time = 0;
  private accumulator = 0;
  private maxSpeed = 0;
  private distanceTravelled = 0;

  private readonly history = {
    speed: [] as number[],
    time: [] as number[],
    x: [] as number[],
  };

  private meshes: LorentzMeshes | null = null;

  init(params: LorentzParams): void {
    this.params = params;
    this.state = [0, 0, params.initialVx, params.initialVy];
    this.time = 0;
    this.accumulator = 0;
    this.maxSpeed = Math.sqrt(params.initialVx ** 2 + params.initialVy ** 2);
    this.distanceTravelled = 0;
    this.history.speed = [this.maxSpeed];
    this.history.time = [0];
    this.history.x = [0];
  }

  step(dt: number): void {
    this.accumulator += Math.min(dt, MAX_ACCUMULATOR);

    while (this.accumulator >= FIXED_DT) {
      const prev = this.state;
      this.state = rk4Step(this.state, FIXED_DT, this.params);
      const dx = this.state[0] - prev[0];
      const dy = this.state[1] - prev[1];
      this.distanceTravelled += Math.sqrt(dx * dx + dy * dy);
      this.time += FIXED_DT;
      this.accumulator -= FIXED_DT;

      // Safety: escape detection (particle left interesting region)
      const r = Math.sqrt(this.state[0] ** 2 + this.state[1] ** 2);
      if (r > MAX_POS) {
        this.state = [0, 0, this.params.initialVx, this.params.initialVy];
        this.distanceTravelled = 0;
      }
    }

    const speed = Math.sqrt(this.state[2] ** 2 + this.state[3] ** 2);
    if (speed > this.maxSpeed) this.maxSpeed = speed;
    this.history.speed.push(speed);
    this.history.time.push(this.time);
    this.history.x.push(this.state[0]);
  }

  getState(): LorentzState {
    return { x: this.state[0], y: this.state[1], vx: this.state[2], vy: this.state[3] };
  }

  getMetrics(): Metrics {
    const [x, y, vx, vy] = this.state;
    const speed = Math.sqrt(vx ** 2 + vy ** 2);
    const { bField: B, qOverM } = this.params;

    const cyclotronRadius = B > 0 ? speed / (qOverM * B) : Infinity;
    const cyclotronPeriod = B > 0 ? (2 * Math.PI) / (qOverM * B) : Infinity;
    const driftV = this.params.eField !== 0 && B > 0
      ? this.params.eField / B
      : 0;

    return {
      scalars: {
        'x (м)': x,
        'y (м)': y,
        '|v| (м/с)': speed,
        'r циклотрону (м)': isFinite(cyclotronRadius) ? cyclotronRadius : 0,
        'T циклотрону (с)': isFinite(cyclotronPeriod) ? cyclotronPeriod : 0,
        'v дрейфу (м/с)': driftV,
        't (с)': this.time,
      },
      timeSeries: {
        speed: this.history.speed,
        x: this.history.x,
        time: this.history.time,
      },
    };
  }

  getPredictionTargets(): PredictionTarget[] {
    const { bField: B, qOverM, initialVx, initialVy, eField } = this.params;
    const v0 = Math.sqrt(initialVx ** 2 + initialVy ** 2);
    const rMax = B > 0 ? v0 / (qOverM * B) * 2 : 100;

    return [
      {
        metricKey: 'r циклотрону (м)',
        label: { uk: 'Радіус циклотронного кола', en: 'Cyclotron radius' },
        unit: 'м',
        slider: {
          min: 0,
          max: Math.max(rMax, 5),
          labelLow: { uk: 'Маленький радіус (тугий виток)', en: 'Tight loop' },
          labelHigh: { uk: 'Великий радіус (майже пряма)', en: 'Near-straight path' },
        },
      },
    ];
  }

  getExplanation(predictions: Record<string, number>, locale = 'uk'): string {
    const { bField: B, qOverM, eField: E, initialVx, initialVy } = this.params;
    const v0 = Math.sqrt(initialVx ** 2 + initialVy ** 2);
    const r = B > 0 ? (v0 / (qOverM * B)).toFixed(3) : '∞';
    const T = B > 0 ? ((2 * Math.PI) / (qOverM * B)).toFixed(3) : '∞';
    const predR = predictions['r циклотрону (м)'] ?? 0;
    const actualR = B > 0 ? v0 / (qOverM * B) : 0;
    const err = actualR > 0 ? Math.abs(((predR - actualR) / actualR) * 100).toFixed(1) : '—';

    if (locale === 'uk') {
      return (
        `Для чистого магнітного поля ($E=0$): радіус $r=v/(q/m\\cdot B)=${r}\\,\\text{м}$, ` +
        `циклотронний період $T=2\\pi/(q/m\\cdot B)=${T}\\,\\text{с}$. ` +
        `Передбачено: $r=${predR.toFixed(3)}\\,\\text{м}$, похибка: ${err}%. ` +
        (E !== 0 && B > 0
          ? `При ненульовому $E$: дрейфова швидкість $v_D=E/B=${(E / B).toFixed(2)}\\,\\text{м/с}$ вздовж X.`
          : `Магнітна сила не виконує роботу: $|\\vec{v}|=\\text{const}$.`)
      );
    }
    return (
      `For pure magnetic field ($E=0$): radius $r=${r}\\,\\text{m}$, ` +
      `cyclotron period $T=${T}\\,\\text{s}$. ` +
      `Predicted: $r=${predR.toFixed(3)}\\,\\text{m}$, error: ${err}%. ` +
      (E !== 0 && B > 0
        ? `With non-zero $E$: drift velocity $v_D=E/B=${(E / B).toFixed(2)}\\,\\text{m/s}$ along X.`
        : `The magnetic force does no work: $|\\vec{v}|=\\text{const}$.`)
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
      camera.radius = 8;
      camera.beta = Math.PI * 0.35;
    }
    this.meshes = setupLorentzScene(scene);
    updateLorentzScene(this.getState(), this.meshes);
  }

  babylonFrame(scene: Scene): void {
    void scene;
    if (this.meshes) {
      updateLorentzScene(this.getState(), this.meshes);
    }
  }
}
