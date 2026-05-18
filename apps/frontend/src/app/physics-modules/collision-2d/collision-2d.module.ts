// Physics: 2D collision with coefficient of restitution e ∈ [0,1].
// Ball radii scale as cube-root of mass for visual clarity.
// Integration: Euler (linear uniform motion between collisions).
// Collision response: impulse-based, single contact point.

import { type Scene, ArcRotateCamera, Vector3 } from '@babylonjs/core';
import type { Metrics, ModuleMetadata, PhysicsModule, PredictionTarget } from '@physis/sdk';
import type { BabylonRenderable } from '../../rendering/babylon/babylon-renderable';
import {
  setupCollisionScene,
  updateCollisionScene,
  type CollisionMeshes,
} from './collision-2d.renderer';
import type { Collision2DParams, Collision2DState } from './collision-2d.types';

const META: ModuleMetadata = {
  id: 'collision-2d',
  name: { uk: 'Пружне та непружне зіткнення', en: 'Elastic and Inelastic Collision' },
  category: 'mechanics',
  description: {
    uk: 'Зіткнення двох тіл у 2D з налаштуванням мас, швидкостей і коефіцієнта відновлення. Закон збереження імпульсу та енергії.',
    en: 'Collision of two bodies in 2D with adjustable masses, velocities and restitution coefficient. Conservation of momentum and energy.',
  },
  defaultParams: {
    mass1: {
      type: 'number',
      label: { uk: 'Маса тіла 1', en: 'Mass 1' },
      unit: 'кг',
      default: 2,
      min: 0.5,
      max: 10,
      step: 0.5,
    },
    mass2: {
      type: 'number',
      label: { uk: 'Маса тіла 2', en: 'Mass 2' },
      unit: 'кг',
      default: 1,
      min: 0.5,
      max: 10,
      step: 0.5,
    },
    velocity1: {
      type: 'number',
      label: { uk: 'Швидкість тіла 1', en: 'Velocity 1' },
      unit: 'м/с',
      default: 4,
      min: 0,
      max: 15,
      step: 0.5,
    },
    velocity2: {
      type: 'number',
      label: { uk: 'Швидкість тіла 2 (←)', en: 'Velocity 2 (←)' },
      unit: 'м/с',
      default: 0,
      min: 0,
      max: 10,
      step: 0.5,
    },
    impactParameter: {
      type: 'number',
      label: { uk: 'Зміщення по Y', en: 'Impact parameter' },
      unit: 'м',
      default: 0,
      min: -2,
      max: 2,
      step: 0.1,
    },
    restitution: {
      type: 'number',
      label: { uk: 'Коефіцієнт відновлення e', en: 'Restitution e' },
      default: 1,
      min: 0,
      max: 1,
      step: 0.05,
    },
  },
  renderer: '3d-babylon',
  educationalTopics: [
    'momentum', 'collision', 'conservation', 'зіткнення', 'імпульс', 'збереження енергії',
  ],
  difficulty: 'school',
  formulas: [
    {
      id: 'momentum',
      label: { uk: 'Закон збереження імпульсу', en: 'Conservation of momentum' },
      latex: String.raw`m_1\vec{v}_1+m_2\vec{v}_2=m_1\vec{v}_1'+m_2\vec{v}_2'`,
    },
    {
      id: 'restitution',
      label: { uk: 'Коефіцієнт відновлення', en: 'Coefficient of restitution' },
      latex: String.raw`e=\frac{v_{2n}'-v_{1n}'}{v_{1n}-v_{2n}}\in[0,1]`,
    },
    {
      id: 'ke',
      label: { uk: 'Кінетична енергія', en: 'Kinetic energy' },
      latex: String.raw`E_k=\tfrac{1}{2}m_1v_1^2+\tfrac{1}{2}m_2v_2^2`,
    },
  ],
};

// Radius scaled as cube-root of mass (visual only)
function radiusOf(mass: number): number {
  return 0.35 * Math.cbrt(mass);
}

export class Collision2DModule
  implements PhysicsModule<Collision2DParams, Collision2DState>, BabylonRenderable
{
  readonly meta: ModuleMetadata = META;

  private params: Collision2DParams = {
    mass1: 2, mass2: 1,
    velocity1: 4, velocity2: 0,
    impactParameter: 0,
    restitution: 1,
  };

  private pos1: [number, number] = [-5, 0];
  private pos2: [number, number] = [5, 0];
  private vel1: [number, number] = [4, 0];
  private vel2: [number, number] = [0, 0];
  private collided = false;
  private postCollisionTime = 0;
  private frozen = false;
  private frozenTimer = 0;
  private time = 0;

  // Snapshot of pre-collision values for metrics display
  private pBefore = 0;
  private keBefore = 0;
  private pAfter: number | null = null;
  private keAfter: number | null = null;

  private readonly history = {
    ke: [] as number[],
    time: [] as number[],
  };

  private meshes: CollisionMeshes | null = null;

  init(params: Collision2DParams): void {
    this.params = params;
    const { mass1, mass2, velocity1, velocity2, impactParameter } = params;
    const r1 = radiusOf(mass1);
    const r2 = radiusOf(mass2);
    const gap = r1 + r2 + 0.5;

    this.pos1 = [-(gap + 4), 0];
    this.pos2 = [gap + 1, impactParameter];
    this.vel1 = [velocity1, 0];
    this.vel2 = [-velocity2, 0];
    this.collided = false;
    this.time = 0;

    this.pBefore = mass1 * velocity1 + mass2 * (-velocity2);
    this.keBefore = 0.5 * mass1 * velocity1 ** 2 + 0.5 * mass2 * velocity2 ** 2;
    this.pAfter = null;
    this.keAfter = null;
    this.postCollisionTime = 0;
    this.frozen = false;
    this.frozenTimer = 0;

    this.history.ke = [this.keBefore];
    this.history.time = [0];
  }

  step(dt: number): void {
    if (this.frozen) {
      this.frozenTimer += dt;
      if (this.frozenTimer >= 1.5) {
        this.init(this.params);
      }
      return;
    }
    if (!this.collided) {
      this.pos1[0] += this.vel1[0] * dt;
      this.pos1[1] += this.vel1[1] * dt;
      this.pos2[0] += this.vel2[0] * dt;
      this.pos2[1] += this.vel2[1] * dt;

      const dx = this.pos2[0] - this.pos1[0];
      const dy = this.pos2[1] - this.pos1[1];
      const dist = Math.sqrt(dx * dx + dy * dy);
      const { mass1, mass2, restitution } = this.params;
      const r1 = radiusOf(mass1);
      const r2 = radiusOf(mass2);

      if (dist <= r1 + r2 + 1e-6) {
        this.collided = true;

        // Normal direction (from ball1 to ball2)
        const nx = dx / dist;
        const ny = dy / dist;

        // Relative velocity along normal
        const vRelN =
          (this.vel1[0] - this.vel2[0]) * nx +
          (this.vel1[1] - this.vel2[1]) * ny;

        if (vRelN > 0) {
          // Impulse
          const j = (-(1 + restitution) * vRelN) / (1 / mass1 + 1 / mass2);

          this.vel1[0] += (j / mass1) * nx;
          this.vel1[1] += (j / mass1) * ny;
          this.vel2[0] -= (j / mass2) * nx;
          this.vel2[1] -= (j / mass2) * ny;

          // Separate overlapping balls
          const overlap = r1 + r2 - dist;
          this.pos1[0] -= (overlap / 2) * nx;
          this.pos1[1] -= (overlap / 2) * ny;
          this.pos2[0] += (overlap / 2) * nx;
          this.pos2[1] += (overlap / 2) * ny;

          this.pAfter = mass1 * this.vel1[0] + mass2 * this.vel2[0];
          this.keAfter =
            0.5 * mass1 * (this.vel1[0] ** 2 + this.vel1[1] ** 2) +
            0.5 * mass2 * (this.vel2[0] ** 2 + this.vel2[1] ** 2);
        }
      }
    } else {
      // Post-collision free motion — freeze after 2 s so balls stay visible
      this.postCollisionTime += dt;
      if (this.postCollisionTime >= 0.8) {
        this.frozen = true;
        return;
      }
      this.pos1[0] += this.vel1[0] * dt;
      this.pos1[1] += this.vel1[1] * dt;
      this.pos2[0] += this.vel2[0] * dt;
      this.pos2[1] += this.vel2[1] * dt;
    }

    this.time += dt;
    const ke =
      0.5 * this.params.mass1 * (this.vel1[0] ** 2 + this.vel1[1] ** 2) +
      0.5 * this.params.mass2 * (this.vel2[0] ** 2 + this.vel2[1] ** 2);
    this.history.ke.push(ke);
    this.history.time.push(this.time);
  }

  getState(): Collision2DState {
    const { mass1, mass2 } = this.params;
    return {
      pos1: [...this.pos1] as [number, number],
      pos2: [...this.pos2] as [number, number],
      vel1: [...this.vel1] as [number, number],
      vel2: [...this.vel2] as [number, number],
      radius1: radiusOf(mass1),
      radius2: radiusOf(mass2),
      collided: this.collided,
    };
  }

  getMetrics(): Metrics {
    const { mass1, mass2 } = this.params;
    const ke =
      0.5 * mass1 * (this.vel1[0] ** 2 + this.vel1[1] ** 2) +
      0.5 * mass2 * (this.vel2[0] ** 2 + this.vel2[1] ** 2);
    const p = mass1 * this.vel1[0] + mass2 * this.vel2[0];

    return {
      scalars: {
        'p до (кг·м/с)': this.pBefore,
        'p після (кг·м/с)': this.pAfter ?? p,
        'Ek до (Дж)': this.keBefore,
        'Ek після (Дж)': this.keAfter ?? ke,
        'ΔEk (Дж)': this.keAfter != null ? this.keAfter - this.keBefore : 0,
        't (с)': this.time,
      },
      timeSeries: {
        kineticEnergy: this.history.ke,
        time: this.history.time,
      },
    };
  }

  getPredictionTargets(): PredictionTarget[] {
    const { mass1, mass2, velocity1, velocity2, restitution } = this.params;
    const pBefore = mass1 * velocity1 - mass2 * velocity2;
    return [
      {
        metricKey: 'Ek після (Дж)',
        label: { uk: 'Кінетична енергія після зіткнення', en: 'Kinetic energy after collision' },
        unit: 'Дж',
        slider: {
          min: 0,
          max: Math.max(this.keBefore * 1.2, 10),
          labelLow: { uk: 'Повністю непружне (вся енергія втрачена)', en: 'Perfectly inelastic (all energy lost)' },
          labelHigh: { uk: 'Повністю пружне (енергія збереглась)', en: 'Perfectly elastic (energy conserved)' },
        },
      },
      {
        metricKey: 'p після (кг·м/с)',
        label: { uk: 'Імпульс системи після зіткнення', en: 'System momentum after collision' },
        unit: 'кг·м/с',
        slider: {
          min: pBefore - Math.abs(pBefore) * 2,
          max: pBefore + Math.abs(pBefore) * 2,
          labelLow: { uk: 'Менший імпульс', en: 'Lower momentum' },
          labelHigh: { uk: 'Більший імпульс', en: 'Higher momentum' },
        },
      },
    ];
  }

  getExplanation(predictions: Record<string, number>, locale = 'uk'): string {
    const kePred = predictions['Ek після (Дж)'] ?? 0;
    const ke = this.keAfter ?? this.keBefore;
    const keErr = this.keBefore > 0
      ? Math.abs(((kePred - ke) / ke) * 100).toFixed(1)
      : '—';
    const { restitution } = this.params;

    if (locale === 'uk') {
      return (
        `Після зіткнення ($e=${restitution.toFixed(2)}$): $E_k=${ke.toFixed(2)}\\,\\text{Дж}$ ` +
        `(передбачено ${kePred.toFixed(2)} Дж, похибка ${keErr}%). ` +
        `При $e=1$ — абсолютно пружний удар, $E_k$ зберігається. ` +
        `При $e=0$ — абсолютно непружний (тіла зливаються), $\\Delta E_k$ максимальна. ` +
        `Імпульс системи зберігається завжди: $p=${this.pBefore.toFixed(2)}\\,\\text{кг}\\cdot\\text{м/с}$.`
      );
    }
    return (
      `After collision ($e=${restitution.toFixed(2)}$): $E_k=${ke.toFixed(2)}\\,\\text{J}$ ` +
      `(predicted ${kePred.toFixed(2)} J, error ${keErr}%). ` +
      `At $e=1$ (elastic) kinetic energy is conserved. ` +
      `At $e=0$ (perfectly inelastic) energy loss is maximum. ` +
      `Momentum is always conserved: $p=${this.pBefore.toFixed(2)}\\,\\text{kg·m/s}$.`
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
      camera.radius = 24;
      camera.beta = Math.PI * 0.35;
    }
    this.meshes = setupCollisionScene(scene);
    updateCollisionScene(this.getState(), this.meshes);
  }

  babylonFrame(scene: Scene): void {
    void scene;
    if (this.meshes) {
      updateCollisionScene(this.getState(), this.meshes);
    }
  }
}
