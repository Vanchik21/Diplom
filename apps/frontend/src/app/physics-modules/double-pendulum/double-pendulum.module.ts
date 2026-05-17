// Physics: Lagrangian equations of motion for a double pendulum.
// Numerical integration: RK4 with fixed sub-step dt=0.002 s.

import type { Scene } from '@babylonjs/core';
import type { Metrics, ModuleMetadata, PhysicsModule, PredictionTarget } from '@physis/sdk';
import type { BabylonRenderable } from '../../rendering/babylon/babylon-renderable';
import {
  setupDoublePendulumScene,
  updateDoublePendulumScene,
  type DoublePendulumMeshes,
} from './double-pendulum.renderer';
import type { DoublePendulumParams, DoublePendulumState } from './double-pendulum.types';

const FIXED_DT = 0.002;
const MAX_ACCUMULATOR = 0.1;

const META: ModuleMetadata = {
  id: 'double-pendulum',
  name: { uk: 'Подвійний маятник', en: 'Double Pendulum' },
  category: 'mechanics',
  description: {
    uk: 'Класична хаотична система з двох звʼязаних маятників. Демонструє чутливість до початкових умов і нелінійну динаміку.',
    en: 'A classic chaotic system of two coupled pendulums. Demonstrates sensitivity to initial conditions and nonlinear dynamics.',
  },
  defaultParams: {
    length1: {
      type: 'number',
      label: { uk: 'Довжина L₁', en: 'Length L₁' },
      unit: 'm',
      default: 1.2,
      min: 0.2,
      max: 3,
      step: 0.1,
    },
    length2: {
      type: 'number',
      label: { uk: 'Довжина L₂', en: 'Length L₂' },
      unit: 'm',
      default: 1.0,
      min: 0.2,
      max: 3,
      step: 0.1,
    },
    mass1: {
      type: 'number',
      label: { uk: 'Маса m₁', en: 'Mass m₁' },
      unit: 'kg',
      default: 1.0,
      min: 0.1,
      max: 5,
      step: 0.1,
    },
    mass2: {
      type: 'number',
      label: { uk: 'Маса m₂', en: 'Mass m₂' },
      unit: 'kg',
      default: 1.0,
      min: 0.1,
      max: 5,
      step: 0.1,
    },
    gravity: {
      type: 'number',
      label: { uk: 'g (прискорення)', en: 'g (acceleration)' },
      unit: 'm/s²',
      default: 9.81,
      min: 1,
      max: 25,
      step: 0.01,
    },
    angle1: {
      type: 'number',
      label: { uk: 'Кут θ₁', en: 'Angle θ₁' },
      unit: '°',
      default: 120,
      min: 0,
      max: 180,
      step: 1,
    },
    angle2: {
      type: 'number',
      label: { uk: 'Кут θ₂', en: 'Angle θ₂' },
      unit: '°',
      default: 150,
      min: 0,
      max: 180,
      step: 1,
    },
    damping: {
      type: 'number',
      label: { uk: 'Загасання', en: 'Damping' },
      default: 0,
      min: 0,
      max: 0.5,
      step: 0.01,
    },
  },
  renderer: '3d-babylon',
  educationalTopics: [
    'chaos', 'lagrangian', 'double-pendulum', 'подвійний маятник', 'хаос', 'нелінійна динаміка',
  ],
  difficulty: 'university',
  formulas: [
    {
      id: 'alpha1',
      label: { uk: 'Кутове прискорення θ̈₁', en: 'Angular acceleration θ̈₁' },
      latex: String.raw`\ddot{\theta}_1=\frac{-g(2m_1+m_2)\sin\theta_1-m_2 g\sin(\theta_1-2\theta_2)-2m_2\sin(\theta_1-\theta_2)(\dot\theta_2^2 L_2+\dot\theta_1^2 L_1\cos(\theta_1-\theta_2))}{L_1(2m_1+m_2-m_2\cos(2\theta_1-2\theta_2))}`,
    },
    {
      id: 'energy',
      label: { uk: 'Повна енергія', en: 'Total energy' },
      latex: String.raw`E=\tfrac{1}{2}(m_1+m_2)L_1^2\dot\theta_1^2+\tfrac{1}{2}m_2 L_2^2\dot\theta_2^2+m_2 L_1 L_2\dot\theta_1\dot\theta_2\cos(\theta_1-\theta_2)+V`,
    },
  ],
};

// RK4 state: [theta1, theta1Dot, theta2, theta2Dot]
type State4 = [number, number, number, number];

function derivatives(
  s: State4,
  p: DoublePendulumParams,
): State4 {
  const [t1, t1d, t2, t2d] = s;
  const { length1: L1, length2: L2, mass1: m1, mass2: m2, gravity: g, damping: b } = p;

  const delta = t1 - t2;
  const denom1 = L1 * (2 * m1 + m2 - m2 * Math.cos(2 * delta));
  const denom2 = L2 * (2 * m1 + m2 - m2 * Math.cos(2 * delta));

  const alpha1 =
    (-g * (2 * m1 + m2) * Math.sin(t1)
      - m2 * g * Math.sin(t1 - 2 * t2)
      - 2 * Math.sin(delta) * m2 * (t2d * t2d * L2 + t1d * t1d * L1 * Math.cos(delta))
      - b * t1d)
    / denom1;

  const alpha2 =
    (2 * Math.sin(delta)
      * (t1d * t1d * L1 * (m1 + m2)
        + g * (m1 + m2) * Math.cos(t1)
        + t2d * t2d * L2 * m2 * Math.cos(delta))
      - b * t2d)
    / denom2;

  return [t1d, alpha1, t2d, alpha2];
}

function rk4Step(s: State4, dt: number, p: DoublePendulumParams): State4 {
  const k1 = derivatives(s, p);
  const s2 = s.map((v, i) => v + 0.5 * dt * k1[i]) as State4;
  const k2 = derivatives(s2, p);
  const s3 = s.map((v, i) => v + 0.5 * dt * k2[i]) as State4;
  const k3 = derivatives(s3, p);
  const s4 = s.map((v, i) => v + dt * k3[i]) as State4;
  const k4 = derivatives(s4, p);

  return s.map((v, i) => v + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])) as State4;
}

export class DoublePendulumModule
  implements PhysicsModule<DoublePendulumParams, DoublePendulumState>, BabylonRenderable
{
  readonly meta: ModuleMetadata = META;

  private params: DoublePendulumParams = {
    length1: 1.2, length2: 1.0,
    mass1: 1.0, mass2: 1.0,
    gravity: 9.81,
    angle1: 120, angle2: 150,
    damping: 0,
  };

  private state: State4 = [0, 0, 0, 0];
  private time = 0;
  private accumulator = 0;
  private maxSpeed2 = 0;

  private readonly history = {
    energy: [] as number[],
    time: [] as number[],
    theta1: [] as number[],
  };

  private meshes: DoublePendulumMeshes | null = null;

  init(params: DoublePendulumParams): void {
    this.params = params;
    this.state = [
      params.angle1 * (Math.PI / 180),
      0,
      params.angle2 * (Math.PI / 180),
      0,
    ];
    this.time = 0;
    this.accumulator = 0;
    this.maxSpeed2 = 0;
    this.history.energy = [];
    this.history.time = [];
    this.history.theta1 = [];
  }

  step(dt: number): void {
    this.accumulator += Math.min(dt, MAX_ACCUMULATOR);

    while (this.accumulator >= FIXED_DT) {
      this.state = rk4Step(this.state, FIXED_DT, this.params);
      this.time += FIXED_DT;
      this.accumulator -= FIXED_DT;
    }

    const [, t1d, , t2d] = this.state;
    const speed2 = Math.abs(t2d);
    if (speed2 > this.maxSpeed2) this.maxSpeed2 = speed2;

    this.history.energy.push(this.totalEnergy());
    this.history.time.push(this.time);
    this.history.theta1.push(this.state[0] * (180 / Math.PI));

    void t1d;
  }

  getState(): DoublePendulumState {
    const [t1, , t2] = this.state;
    const { length1: L1, length2: L2 } = this.params;
    const b1x = L1 * Math.sin(t1);
    const b1y = -L1 * Math.cos(t1);
    const b2x = b1x + L2 * Math.sin(t2);
    const b2y = b1y - L2 * Math.cos(t2);

    return {
      theta1: t1,
      theta2: t2,
      theta1Dot: this.state[1],
      theta2Dot: this.state[3],
      bob1World: [b1x, b1y, 0],
      bob2World: [b2x, b2y, 0],
    };
  }

  getMetrics(): Metrics {
    const [t1, t1d, t2, t2d] = this.state;
    return {
      scalars: {
        'θ₁ (°)': t1 * (180 / Math.PI),
        'θ₂ (°)': t2 * (180 / Math.PI),
        'θ̇₁ (рад/с)': t1d,
        'θ̇₂ (рад/с)': t2d,
        'E (Дж)': this.totalEnergy(),
        't (с)': this.time,
      },
      timeSeries: {
        energy: this.history.energy,
        theta1: this.history.theta1,
        time: this.history.time,
      },
    };
  }

  getPredictionTargets(): PredictionTarget[] {
    return [
      {
        metricKey: 'E (Дж)',
        label: { uk: 'Повна енергія системи', en: 'Total system energy' },
        unit: 'Дж',
        slider: {
          min: 0,
          max: 200,
          labelLow: { uk: 'Мала енергія (маятник ледь гойдається)', en: 'Low energy (barely swings)' },
          labelHigh: { uk: 'Велика енергія (хаотичний рух)', en: 'High energy (chaotic motion)' },
        },
      },
    ];
  }

  getExplanation(predictions: Record<string, number>, locale = 'uk'): string {
    const E = this.totalEnergy();
    const predicted = predictions['E (Дж)'] ?? 0;
    const err = E > 0 ? Math.abs(((predicted - E) / E) * 100).toFixed(1) : '—';

    if (locale === 'uk') {
      return (
        `Подвійний маятник — хаотична система: при великих кутах відхилення ` +
        `рух стає непередбачуваним. Повна механічна енергія системи ` +
        `$E\\approx${E.toFixed(2)}\\,\\text{Дж}$ (передбачено: ${predicted.toFixed(2)} Дж, ` +
        `похибка: ${err}%). При нульовому загасанні $E=\\text{const}$.`
      );
    }
    return (
      `The double pendulum is a chaotic system — at large angles the motion becomes ` +
      `unpredictable. Total mechanical energy $E\\approx${E.toFixed(2)}\\,\\text{J}$ ` +
      `(predicted: ${predicted.toFixed(2)} J, error: ${err}%). ` +
      `With zero damping energy is conserved.`
    );
  }

  reset(): void {
    this.init(this.params);
  }

  dispose(): void {
    this.meshes = null;
  }

  babylonSetup(scene: Scene): void {
    this.meshes = setupDoublePendulumScene(scene);
    updateDoublePendulumScene(this.getState(), this.meshes);
  }

  babylonFrame(scene: Scene): void {
    void scene;
    if (this.meshes) {
      updateDoublePendulumScene(this.getState(), this.meshes);
    }
  }

  private totalEnergy(): number {
    const [t1, t1d, t2, t2d] = this.state;
    const { length1: L1, length2: L2, mass1: m1, mass2: m2, gravity: g } = this.params;

    const ke1 = 0.5 * m1 * (L1 * t1d) ** 2;
    const ke2 = 0.5 * m2 * (
      (L1 * t1d) ** 2
      + (L2 * t2d) ** 2
      + 2 * L1 * L2 * t1d * t2d * Math.cos(t1 - t2)
    );

    const pe1 = -m1 * g * L1 * Math.cos(t1);
    const pe2 = -m2 * g * (L1 * Math.cos(t1) + L2 * Math.cos(t2));

    return ke1 + ke2 + pe1 + pe2;
  }
}
