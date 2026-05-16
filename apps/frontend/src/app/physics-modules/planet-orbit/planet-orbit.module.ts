import type { Scene } from '@babylonjs/core';
import type { Metrics, ModuleMetadata, PhysicsModule, PredictionTarget } from '@physis/sdk';
import type { BabylonRenderable } from '../../rendering/babylon/babylon-renderable';
import {
  setupOrbitScene,
  updateOrbitScene,
  updateOrbitEllipse,
  type OrbitMeshes,
} from './planet-orbit.renderer';
import type { PlanetOrbitParams, PlanetOrbitState } from './planet-orbit.types';

const G = 1;
const FIXED_DT = 0.002;
const MAX_ACCUMULATOR = 0.05;
const MAX_HISTORY = 800;

const META: ModuleMetadata = {
  id: 'planet-orbit',
  name: { uk: 'Рух планети навколо зірки', en: 'Planet Orbiting a Star' },
  category: 'gravity',
  description: {
    uk: 'Гравітаційна двотільна задача. Закони Кеплера, збереження енергії та кутового моменту.',
    en: 'Gravitational two-body problem. Kepler\'s laws, conservation of energy and angular momentum.',
  },
  defaultParams: {
    starMass: {
      type: 'number',
      label: { uk: 'Маса зірки', en: 'Star mass' },
      unit: 'M☉',
      default: 1000,
      min: 100,
      max: 5000,
      step: 100,
    },
    initialRadius: {
      type: 'number',
      label: { uk: 'Початкова відстань', en: 'Initial distance' },
      unit: 'AU',
      default: 10,
      min: 2,
      max: 24,
      step: 0.5,
    },
    velocityFactor: {
      type: 'number',
      label: { uk: 'v / v_кол (1 = кругова)', en: 'v / v_circ (1 = circular)' },
      default: 1.0,
      min: 0.1,
      max: 1.39,
      step: 0.01,
    },
    timeScale: {
      type: 'number',
      label: { uk: 'Швидкість симуляції', en: 'Simulation speed' },
      default: 3,
      min: 0.5,
      max: 10,
      step: 0.5,
    },
  },
  renderer: '3d-babylon',
  educationalTopics: [
    'Kepler', 'orbit', 'gravity', 'gravitation', 'planet', 'гравітація', 'планета', 'орбіта',
    'angular momentum', 'energy conservation', 'two-body problem',
  ],
  difficulty: 'university',
  formulas: [
    {
      id: 'newton-gravity',
      label: { uk: 'Закон всесвітнього тяжіння', en: 'Law of gravitation' },
      latex: String.raw`\vec{F}=-\frac{GMm}{r^{2}}\hat{r}`,
    },
    {
      id: 'kepler3',
      label: { uk: 'Третій закон Кеплера', en: 'Kepler\'s third law' },
      latex: String.raw`T^{2}=\frac{4\pi^{2}}{GM}a^{3}`,
      variables: { T: 'period', a: 'semiMajorAxis' },
    },
    {
      id: 'energy',
      label: { uk: 'Питома механічна енергія', en: 'Specific mechanical energy' },
      latex: String.raw`\varepsilon=\tfrac{1}{2}v^{2}-\frac{GM}{r}=-\frac{GM}{2a}`,
      variables: { a: 'semiMajorAxis' },
    },
    {
      id: 'eccentricity',
      label: { uk: 'Ексцентриситет орбіти', en: 'Orbital eccentricity' },
      latex: String.raw`e=\sqrt{1+\frac{2\varepsilon h^{2}}{(GM)^{2}}}`,
      variables: { e: 'eccentricity' },
    },
  ],
};

interface EllipseParams {
  a: number;
  b: number;
  cx: number;
  periX: number;
  apoX: number;
}

function computeEllipse(starMass: number, r0: number, vFactor: number): EllipseParams {
  const gm = G * starMass;
  const vCirc = Math.sqrt(gm / r0);
  const v0 = vFactor * vCirc;
  const E = 0.5 * v0 * v0 - gm / r0;
  const L = r0 * v0;

  if (E >= 0) return { a: 0, b: 0, cx: 0, periX: 0, apoX: 0 };

  const a = -gm / (2 * E);
  const disc = 1 + (2 * E * L * L) / (gm * gm);
  const e = disc > 0 ? Math.sqrt(disc) : 0;
  const b = a * Math.sqrt(Math.max(0, 1 - e * e));
  const isPeriStart = v0 >= vCirc;
  const cx = isPeriStart ? -a * e : a * e;

  // periX = closest approach (perihelion); apoX = farthest point (aphelion).
  // When planet starts at perihelion (v >= v_circ): right vertex (+a from centre) is peri.
  // When planet starts at aphelion  (v <  v_circ): right vertex (+a from centre) is apo.
  const periX = isPeriStart ? cx + a : cx - a;
  const apoX  = isPeriStart ? cx - a : cx + a;

  return { a, b, cx, periX, apoX };
}

function rk4Step(
  x: number, z: number, vx: number, vz: number,
  gm: number, dt: number,
): [number, number, number, number] {
  function deriv(px: number, pz: number, pvx: number, pvz: number): [number, number, number, number] {
    const r2 = px * px + pz * pz;
    const r3 = r2 * Math.sqrt(r2);
    return [pvx, pvz, -gm * px / r3, -gm * pz / r3];
  }

  const [k1x, k1z, k1vx, k1vz] = deriv(x, z, vx, vz);
  const [k2x, k2z, k2vx, k2vz] = deriv(
    x + 0.5 * dt * k1x, z + 0.5 * dt * k1z,
    vx + 0.5 * dt * k1vx, vz + 0.5 * dt * k1vz,
  );
  const [k3x, k3z, k3vx, k3vz] = deriv(
    x + 0.5 * dt * k2x, z + 0.5 * dt * k2z,
    vx + 0.5 * dt * k2vx, vz + 0.5 * dt * k2vz,
  );
  const [k4x, k4z, k4vx, k4vz] = deriv(
    x + dt * k3x, z + dt * k3z,
    vx + dt * k3vx, vz + dt * k3vz,
  );

  const c = dt / 6;
  return [
    x + c * (k1x + 2 * k2x + 2 * k3x + k4x),
    z + c * (k1z + 2 * k2z + 2 * k3z + k4z),
    vx + c * (k1vx + 2 * k2vx + 2 * k3vx + k4vx),
    vz + c * (k1vz + 2 * k2vz + 2 * k3vz + k4vz),
  ];
}

export class PlanetOrbitModule
  implements PhysicsModule<PlanetOrbitParams, PlanetOrbitState>, BabylonRenderable
{
  readonly meta: ModuleMetadata = META;

  private params: PlanetOrbitParams = {
    starMass: 1000,
    initialRadius: 10,
    velocityFactor: 1.0,
    timeScale: 3,
  };

  private x = 0;
  private z = 0;
  private vx = 0;
  private vz = 0;
  private time = 0;
  private accumulator = 0;

  private readonly history = {
    r: [] as number[],
    totalEnergy: [] as number[],
    time: [] as number[],
  };

  private ellipse: EllipseParams = { a: 0, b: 0, cx: 0, periX: 0, apoX: 0 };
  private ellipseDirty = false;
  private meshes: OrbitMeshes | null = null;

  init(params: PlanetOrbitParams): void {
    this.params = params;
    const gm = G * params.starMass;
    const r0 = params.initialRadius;
    const vCirc = Math.sqrt(gm / r0);

    this.x = r0;
    this.z = 0;
    this.vx = 0;
    this.vz = params.velocityFactor * vCirc;

    this.time = 0;
    this.accumulator = 0;
    this.history.r = [];
    this.history.totalEnergy = [];
    this.history.time = [];

    this.ellipse = computeEllipse(params.starMass, r0, params.velocityFactor);
    this.ellipseDirty = true;
  }

  step(dt: number): void {
    const { starMass, timeScale } = this.params;
    const gm = G * starMass;

    this.accumulator += Math.min(dt * timeScale, MAX_ACCUMULATOR);

    while (this.accumulator >= FIXED_DT) {
      const [nx, nz, nvx, nvz] = rk4Step(this.x, this.z, this.vx, this.vz, gm, FIXED_DT);
      this.x = nx;
      this.z = nz;
      this.vx = nvx;
      this.vz = nvz;
      this.time += FIXED_DT;
      this.accumulator -= FIXED_DT;
    }

    const r = Math.sqrt(this.x * this.x + this.z * this.z);
    const v2 = this.vx * this.vx + this.vz * this.vz;
    const totalEnergy = 0.5 * v2 - gm / r;

    if (this.history.r.length >= MAX_HISTORY) {
      this.history.r.shift();
      this.history.totalEnergy.shift();
      this.history.time.shift();
    }
    this.history.r.push(r);
    this.history.totalEnergy.push(totalEnergy);
    this.history.time.push(this.time);
  }

  getState(): PlanetOrbitState {
    const r = Math.sqrt(this.x * this.x + this.z * this.z);
    const speed = Math.sqrt(this.vx * this.vx + this.vz * this.vz);
    return { x: this.x, z: this.z, vx: this.vx, vz: this.vz, r, speed };
  }

  getMetrics(): Metrics {
    const gm = G * this.params.starMass;
    const r = Math.sqrt(this.x * this.x + this.z * this.z);
    const v2 = this.vx * this.vx + this.vz * this.vz;
    const speed = Math.sqrt(v2);
    const ke = 0.5 * v2;
    const pe = -gm / r;
    const totalEnergy = ke + pe;
    const angularMomentum = Math.abs(this.x * this.vz - this.z * this.vx);

    let eccentricity = 0;
    let period = 0;
    let semiMajorAxis = 0;

    if (totalEnergy < 0) {
      semiMajorAxis = -gm / (2 * totalEnergy);
      period = 2 * Math.PI * Math.sqrt(semiMajorAxis ** 3 / gm);
      const disc = 1 + (2 * totalEnergy * angularMomentum * angularMomentum) / (gm * gm);
      eccentricity = disc > 0 ? Math.sqrt(disc) : 0;
    }

    return {
      scalars: {
        'r (AU)': r,
        'v (швидкість)': speed,
        'E кінет.': ke,
        'E потенц.': pe,
        'E повна': totalEnergy,
        'L (кут. момент)': angularMomentum,
        'e (ексцентр.)': eccentricity,
        'T (період)': period,
        'a (п/велика вісь)': semiMajorAxis,
        't (час)': this.time,
      },
      timeSeries: {
        r: this.history.r,
        totalEnergy: this.history.totalEnergy,
        time: this.history.time,
      },
    };
  }

  getPredictionTargets(): PredictionTarget[] {
    return [
      {
        metricKey: 'T (період)',
        label: { uk: 'Тривалість орбіти', en: 'Orbital duration' },
        unit: 'sim-t',
        slider: {
          min: 0,
          max: 50,
          labelLow: { uk: 'Дуже коротка', en: 'Very short' },
          labelHigh: { uk: 'Дуже довга', en: 'Very long' },
        },
      },
      {
        metricKey: 'e (ексцентр.)',
        label: { uk: 'Форма орбіти', en: 'Orbit shape' },
        slider: {
          min: 0,
          max: 0.99,
          labelLow: { uk: 'Кругла', en: 'Circular' },
          labelHigh: { uk: 'Витягнута', en: 'Elongated' },
        },
      },
    ];
  }

  getExplanation(predictions: Record<string, number>, locale = 'uk'): string {
    const { starMass, initialRadius, velocityFactor } = this.params;
    const gm = G * starMass;
    const r0 = initialRadius;
    const vCirc = Math.sqrt(gm / r0);
    const v0 = velocityFactor * vCirc;
    const E0 = 0.5 * v0 * v0 - gm / r0;
    const L0 = r0 * v0;

    let actualPeriod = 0;
    let actualEcc = 0;
    if (E0 < 0) {
      const a = -gm / (2 * E0);
      actualPeriod = 2 * Math.PI * Math.sqrt(a ** 3 / gm);
      const disc = 1 + (2 * E0 * L0 * L0) / (gm * gm);
      actualEcc = disc > 0 ? Math.sqrt(disc) : 0;
    }

    const predPeriod = predictions['T (період)'] ?? 0;
    const predEcc = predictions['e (ексцентр.)'] ?? 0;
    const periodErr = actualPeriod > 0
      ? Math.abs(((predPeriod - actualPeriod) / actualPeriod) * 100).toFixed(1)
      : '—';
    const eccErr = actualEcc > 0
      ? Math.abs(((predEcc - actualEcc) / actualEcc) * 100).toFixed(1)
      : '—';

    const orbitType = actualEcc < 0.01 ? (locale === 'uk' ? 'кругова' : 'circular')
      : actualEcc < 1 ? (locale === 'uk' ? 'еліптична' : 'elliptical')
      : (locale === 'uk' ? 'гіперболічна' : 'hyperbolic');

    if (locale === 'uk') {
      return (
        `Орбіта є ${orbitType} ($e\\approx${actualEcc.toFixed(3)}$). ` +
        `Третій закон Кеплера $T^{2}=\\frac{4\\pi^{2}}{GM}a^{3}$ дає ` +
        `$T\\approx${actualPeriod.toFixed(2)}$ одиниць часу. ` +
        `Ваше передбачення: $${predPeriod.toFixed(2)}$ — похибка ${periodErr}%. ` +
        `Ексцентриситет: виміряно $${actualEcc.toFixed(3)}$, передбачено $${predEcc.toFixed(3)}$ — похибка ${eccErr}%. ` +
        `Кутовий момент $h=r_{0}v_{0}=${L0.toFixed(1)}$ та повна енергія ` +
        `$\\varepsilon=${E0.toFixed(2)}$ зберігаються впродовж усієї симуляції.`
      );
    }

    return (
      `The orbit is ${orbitType} ($e\\approx${actualEcc.toFixed(3)}$). ` +
      `Kepler's third law $T^{2}=\\frac{4\\pi^{2}}{GM}a^{3}$ gives ` +
      `$T\\approx${actualPeriod.toFixed(2)}$ time units. ` +
      `Your prediction: $${predPeriod.toFixed(2)}$ — error ${periodErr}%. ` +
      `Eccentricity: measured $${actualEcc.toFixed(3)}$, predicted $${predEcc.toFixed(3)}$ — error ${eccErr}%. ` +
      `Angular momentum $h=r_{0}v_{0}=${L0.toFixed(1)}$ and specific energy ` +
      `$\\varepsilon=${E0.toFixed(2)}$ are conserved throughout the simulation.`
    );
  }

  reset(): void {
    this.init(this.params);
  }

  dispose(): void {
    this.meshes?.glow.dispose();
    this.meshes = null;
  }

  babylonSetup(scene: Scene): void {
    this.meshes = setupOrbitScene(scene, this.params.initialRadius);
    const { a, b, cx, periX, apoX } = this.ellipse;
    updateOrbitEllipse(scene, this.meshes, cx, a, b, periX, apoX);
    updateOrbitScene(this.getState(), this.meshes);
    this.ellipseDirty = false;
  }

  babylonFrame(scene: Scene): void {
    if (!this.meshes) return;

    if (this.ellipseDirty) {
      const { a, b, cx, periX, apoX } = this.ellipse;
      updateOrbitEllipse(scene, this.meshes, cx, a, b, periX, apoX);
      this.ellipseDirty = false;
    }

    updateOrbitScene(this.getState(), this.meshes);
  }
}
