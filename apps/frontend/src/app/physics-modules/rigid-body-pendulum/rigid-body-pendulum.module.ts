import type { Scene } from '@babylonjs/core';
import type { Metrics, ModuleMetadata, PhysicsModule, PredictionTarget } from '@physis/sdk';
import type { BabylonRenderable } from '../../rendering/babylon/babylon-renderable';
import {
  setupPendulumScene,
  updatePendulumScene,
  type PendulumMeshes,
} from './rigid-body-pendulum.renderer';
import type { PendulumParams, PendulumState } from './rigid-body-pendulum.types';

const FIXED_DT = 0.001;
const MAX_ACCUMULATOR = 0.1;

const META: ModuleMetadata = {
  id: 'rigid-body-pendulum',
  name: { uk: 'Маятник (жорстке тіло)', en: 'Rigid-Body Pendulum' },
  category: 'mechanics',
  description: {
    uk: 'Фізичний маятник з урахуванням загасання. Нелінійна динаміка та закон збереження енергії.',
    en: 'Physical pendulum with damping. Nonlinear dynamics and energy conservation.',
  },
  defaultParams: {
    length: {
      type: 'number',
      label: { uk: 'Довжина', en: 'Length' },
      unit: 'm',
      default: 1,
      min: 0.1,
      max: 5,
      step: 0.1,
    },
    mass: {
      type: 'number',
      label: { uk: 'Маса', en: 'Mass' },
      unit: 'kg',
      default: 1,
      min: 0.1,
      max: 10,
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
    initialAngle: {
      type: 'number',
      label: { uk: 'Початковий кут', en: 'Initial angle' },
      unit: '°',
      default: 30,
      min: 0,
      max: 90,
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
    'pendulum', 'маятник', 'oscillation', 'damping', 'energy conservation', 'SHM',
  ],
  difficulty: 'school',
  formulas: [
    {
      id: 'eom',
      label: { uk: 'Рівняння руху', en: 'Equation of motion' },
      latex: String.raw`\ddot{\theta}+\frac{b}{m}\dot{\theta}+\frac{g}{L}\sin\theta=0`,
    },
    {
      id: 'period',
      label: { uk: 'Період (малі кути)', en: 'Period (small angles)' },
      latex: String.raw`T=2\pi\sqrt{\dfrac{L}{g}}`,
      variables: { T: 'period', L: 'length', g: 'gravity' },
    },
    {
      id: 'energy',
      label: { uk: 'Повна енергія', en: 'Total energy' },
      latex: String.raw`E=\tfrac{1}{2}mL^{2}\dot{\theta}^{2}+mgL(1-\cos\theta)`,
      variables: { E: 'totalEnergy' },
    },
  ],
};

export class RigidBodyPendulumModule
  implements PhysicsModule<PendulumParams, PendulumState>, BabylonRenderable
{
  readonly meta: ModuleMetadata = META;

  private params: PendulumParams = {
    length: 1,
    mass: 1,
    gravity: 9.81,
    initialAngle: 30,
    damping: 0,
  };

  private theta = 0;
  private thetaDot = 0;
  private time = 0;
  private accumulator = 0;
  private maxThetaDot = 0;

  private readonly history = {
    theta: [] as number[],
    totalEnergy: [] as number[],
    time: [] as number[],
  };

  private meshes: PendulumMeshes | null = null;

  init(params: PendulumParams): void {
    this.params = params;
    this.theta = params.initialAngle * (Math.PI / 180);
    this.thetaDot = 0;
    this.time = 0;
    this.accumulator = 0;
    this.maxThetaDot = 0;
    this.history.theta = [];
    this.history.totalEnergy = [];
    this.history.time = [];
  }

  step(dt: number): void {
    const { length, mass, gravity, damping } = this.params;
    this.accumulator += Math.min(dt, MAX_ACCUMULATOR);

    while (this.accumulator >= FIXED_DT) {
      const accel =
        -(gravity / length) * Math.sin(this.theta) -
        (damping / mass) * this.thetaDot;
      this.thetaDot += accel * FIXED_DT;
      this.theta += this.thetaDot * FIXED_DT;
      this.time += FIXED_DT;
      this.accumulator -= FIXED_DT;
    }

    if (Math.abs(this.thetaDot) > this.maxThetaDot) {
      this.maxThetaDot = Math.abs(this.thetaDot);
    }

    const ke = this.kineticEnergy();
    const pe = this.potentialEnergy();
    this.history.theta.push(this.theta * (180 / Math.PI));
    this.history.totalEnergy.push(ke + pe);
    this.history.time.push(this.time);
  }

  getState(): PendulumState {
    const { length } = this.params;
    const x = length * Math.sin(this.theta);
    const y = -length * Math.cos(this.theta);
    return {
      theta: this.theta,
      thetaDot: this.thetaDot,
      length,
      pivotWorld: [0, 0, 0],
      bobWorld: [x, y, 0],
      velocity: [
        length * this.thetaDot * Math.cos(this.theta),
        length * this.thetaDot * Math.sin(this.theta),
        0,
      ],
    };
  }

  getMetrics(): Metrics {
    const ke = this.kineticEnergy();
    const pe = this.potentialEnergy();
    const period =
      2 * Math.PI * Math.sqrt(this.params.length / this.params.gravity);

    return {
      scalars: {
        theta: this.theta * (180 / Math.PI),
        thetaDot: this.thetaDot,
        kineticEnergy: ke,
        potentialEnergy: pe,
        totalEnergy: ke + pe,
        period,
        maxAngularVelocity: this.maxThetaDot,
        time: this.time,
      },
      timeSeries: {
        theta: this.history.theta,
        totalEnergy: this.history.totalEnergy,
        time: this.history.time,
      },
    };
  }

  getPredictionTargets(): PredictionTarget[] {
    return [
      {
        metricKey: 'period',
        label: { uk: 'Період T', en: 'Period T' },
        unit: 's',
      },
      {
        metricKey: 'maxAngularVelocity',
        label: { uk: 'Макс. кутова швидкість', en: 'Max angular velocity' },
        unit: 'rad/s',
      },
    ];
  }

  getExplanation(predictions: Record<string, number>, locale = 'uk'): string {
    const { length, gravity } = this.params;
    const actualPeriod = 2 * Math.PI * Math.sqrt(length / gravity);
    const predictedPeriod = predictions['period'] ?? 0;
    const periodErr = Math.abs(
      ((predictedPeriod - actualPeriod) / actualPeriod) * 100,
    ).toFixed(1);

    const actualOmega = this.maxThetaDot;
    const predictedOmega = predictions['maxAngularVelocity'] ?? 0;
    const omegaErr = actualOmega > 0
      ? Math.abs(((predictedOmega - actualOmega) / actualOmega) * 100).toFixed(1)
      : '—';

    if (locale === 'uk') {
      return (
        `Формула малих кутів $T=2\\pi\\sqrt{L/g}$ дає ` +
        `$T\\approx${actualPeriod.toFixed(3)}\\,\\text{с}$. ` +
        `Ваше передбачення: $${predictedPeriod.toFixed(3)}\\,\\text{с}$ — ` +
        `похибка ${periodErr}%. ` +
        `Максимальна кутова швидкість: $${actualOmega.toFixed(3)}\\,\\text{рад/с}$ ` +
        `(передбачено: $${predictedOmega.toFixed(3)}\\,\\text{рад/с}$, похибка: ${omegaErr}%). ` +
        `При нульовому загасанні механічна енергія зберігається; будь-яке її зменшення ` +
        `$E=\\tfrac{1}{2}mL^{2}\\dot{\\theta}^{2}+mgL(1-\\cos\\theta)$ ` +
        `зумовлене доданком загасання $\\frac{b}{m}\\dot{\\theta}$.`
      );
    }

    return (
      `The small-angle period formula $T=2\\pi\\sqrt{L/g}$ gives ` +
      `$T\\approx${actualPeriod.toFixed(3)}\\,\\text{s}$. ` +
      `Your prediction was $${predictedPeriod.toFixed(3)}\\,\\text{s}$ — ` +
      `an error of ${periodErr}%. ` +
      `The maximum angular velocity reached was $${actualOmega.toFixed(3)}\\,\\text{rad/s}$ ` +
      `(predicted: $${predictedOmega.toFixed(3)}\\,\\text{rad/s}$, error: ${omegaErr}%). ` +
      `Energy is conserved when damping is zero; any decrease in total mechanical ` +
      `energy $E=\\tfrac{1}{2}mL^{2}\\dot{\\theta}^{2}+mgL(1-\\cos\\theta)$ ` +
      `is due to the damping term $\\frac{b}{m}\\dot{\\theta}$.`
    );
  }

  reset(): void {
    this.init(this.params);
  }

  dispose(): void {
    this.meshes = null;
  }

  babylonSetup(scene: Scene): void {
    this.meshes = setupPendulumScene(scene);
    updatePendulumScene(this.getState(), this.meshes);
  }

  babylonFrame(scene: Scene): void {
    void scene;
    if (this.meshes) {
      updatePendulumScene(this.getState(), this.meshes);
    }
  }

  private kineticEnergy(): number {
    const { mass, length } = this.params;
    const v = length * this.thetaDot;
    return 0.5 * mass * v * v;
  }

  private potentialEnergy(): number {
    const { mass, gravity, length } = this.params;
    return mass * gravity * length * (1 - Math.cos(this.theta));
  }
}
