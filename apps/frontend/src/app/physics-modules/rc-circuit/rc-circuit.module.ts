// Physics: RC circuit — charging and discharging a capacitor through a resistor.
// Charging:   U_C(t) = EMF * (1 - exp(-t/τ)),  I(t) = (EMF/R) * exp(-t/τ)
// Discharging: U_C(t) = U0  * exp(-t/τ),        I(t) = -(U0/R) * exp(-t/τ)
// where τ = R * C (time constant).
// Analytic solution — no numerical ODE integration needed.

import { type Scene, ArcRotateCamera, Vector3 } from '@babylonjs/core';
import type { Metrics, ModuleMetadata, PhysicsModule, PredictionTarget } from '@physis/sdk';
import type { BabylonRenderable } from '../../rendering/babylon/babylon-renderable';
import {
  setupRcScene,
  updateRcScene,
  type RcMeshes,
} from './rc-circuit.renderer';
import type { RcCircuitParams, RcCircuitState } from './rc-circuit.types';

const META: ModuleMetadata = {
  id: 'rc-circuit',
  name: { uk: 'RC-коло (заряд та розряд конденсатора)', en: 'RC Circuit (Capacitor Charge/Discharge)' },
  category: 'em',
  description: {
    uk: 'Зарядка та розрядка конденсатора через резистор. Експоненційні залежності напруги і струму від часу, стала часу τ = RC.',
    en: 'Charging and discharging a capacitor through a resistor. Exponential voltage and current vs time, time constant τ = RC.',
  },
  defaultParams: {
    resistance: {
      type: 'number',
      label: { uk: 'Опір R', en: 'Resistance R' },
      unit: 'кОм',
      default: 10,
      min: 1,
      max: 100,
      step: 1,
    },
    capacitance: {
      type: 'number',
      label: { uk: 'Ємність C', en: 'Capacitance C' },
      unit: 'мкФ',
      default: 100,
      min: 1,
      max: 1000,
      step: 10,
    },
    emf: {
      type: 'number',
      label: { uk: 'ЕРС джерела', en: 'EMF source' },
      unit: 'В',
      default: 12,
      min: 1,
      max: 50,
      step: 0.5,
    },
    mode: {
      type: 'number',
      label: { uk: 'Режим (0=зарядка, 1=розрядка)', en: 'Mode (0=charge, 1=discharge)' },
      default: 0,
      min: 0,
      max: 1,
      step: 1,
    },
  },
  renderer: '3d-babylon',
  educationalTopics: [
    'rc-circuit', 'capacitor', 'exponential', 'конденсатор', 'резистор', 'стала часу', 'електромагнетизм',
  ],
  difficulty: 'school',
  formulas: [
    {
      id: 'tau',
      label: { uk: 'Стала часу', en: 'Time constant' },
      latex: String.raw`\tau = RC`,
    },
    {
      id: 'charge',
      label: { uk: 'Напруга при зарядці', en: 'Voltage (charging)' },
      latex: String.raw`U_C(t)=\mathcal{E}\!\left(1-e^{-t/\tau}\right)`,
    },
    {
      id: 'discharge',
      label: { uk: 'Напруга при розрядці', en: 'Voltage (discharging)' },
      latex: String.raw`U_C(t)=U_0\,e^{-t/\tau}`,
    },
    {
      id: 'current',
      label: { uk: 'Струм', en: 'Current' },
      latex: String.raw`I(t)=\frac{\mathcal{E}}{R}\,e^{-t/\tau}`,
    },
  ],
};

export class RcCircuitModule
  implements PhysicsModule<RcCircuitParams, RcCircuitState>, BabylonRenderable
{
  readonly meta: ModuleMetadata = META;

  private params: RcCircuitParams = {
    resistance: 10,
    capacitance: 100,
    emf: 12,
    mode: 0,
  };

  private time = 0;
  // tau in seconds: R(kΩ)*1e3 * C(μF)*1e-6 = R*C*1e-3
  private tau = 1;
  private u0 = 0; // initial voltage for discharge

  private readonly history = {
    voltage: [] as number[],
    current: [] as number[],
    time: [] as number[],
  };

  private meshes: RcMeshes | null = null;

  private get tauSeconds(): number {
    const { resistance, capacitance } = this.params;
    // resistance in kΩ → Ω: *1e3; capacitance in μF → F: *1e-6; τ = RC(s)
    return resistance * 1e3 * capacitance * 1e-6;
  }

  private voltage(t: number): number {
    const { emf, mode } = this.params;
    if (mode === 0) {
      // charging from 0
      return emf * (1 - Math.exp(-t / this.tau));
    } else {
      // discharging from u0
      return this.u0 * Math.exp(-t / this.tau);
    }
  }

  private current(t: number): number {
    const { emf, resistance, mode } = this.params;
    const R = resistance * 1e3; // Ω
    if (mode === 0) {
      return (emf / R) * Math.exp(-t / this.tau);
    } else {
      return -(this.u0 / R) * Math.exp(-t / this.tau);
    }
  }

  init(params: RcCircuitParams): void {
    this.params = params;
    this.tau = this.tauSeconds;
    this.u0 = params.mode === 1 ? params.emf : 0;
    this.time = 0;
    this.history.voltage = [this.voltage(0)];
    this.history.current = [this.current(0)];
    this.history.time = [0];
  }

  step(dt: number): void {
    // Advance time — simulate up to 6τ max, then hold
    const maxTime = 6 * this.tau;
    if (this.time < maxTime) {
      this.time += dt;
      if (this.time > maxTime) this.time = maxTime;
    }

    this.history.voltage.push(this.voltage(this.time));
    this.history.current.push(this.current(this.time));
    this.history.time.push(this.time);
  }

  getState(): RcCircuitState {
    const u = this.voltage(this.time);
    const i = this.current(this.time);
    const fillFraction = Math.abs(u) / Math.max(this.params.emf, 0.001);
    return {
      voltage: u,
      current: i,
      charge: u * this.params.capacitance * 1e-6 * 1e6, // μC
      tau: this.tau,
      fillFraction: Math.min(fillFraction, 1),
      time: this.time,
    };
  }

  getMetrics(): Metrics {
    const state = this.getState();
    return {
      scalars: {
        'U_C (В)': state.voltage,
        'I (А)': state.current,
        'Q (мкКл)': state.charge,
        'τ = RC (с)': state.tau,
        'U_EMF (В)': this.params.emf,
        't (с)': this.time,
      },
      timeSeries: {
        voltage: this.history.voltage,
        current: this.history.current,
        time: this.history.time,
      },
    };
  }

  getPredictionTargets(): PredictionTarget[] {
    const { emf, mode } = this.params;
    return [
      {
        metricKey: 'τ = RC (с)',
        label: { uk: 'Стала часу τ = RC', en: 'Time constant τ = RC' },
        unit: 'с',
        slider: {
          min: 0,
          max: Math.max(this.tauSeconds * 3, 5),
          labelLow: { uk: 'Дуже швидкий процес', en: 'Very fast process' },
          labelHigh: { uk: 'Дуже повільний процес', en: 'Very slow process' },
        },
      },
      {
        metricKey: 'U_C (В)',
        label: {
          uk: mode === 0 ? 'Напруга на конденсаторі за t=τ' : 'Напруга на конденсаторі за t=τ',
          en: mode === 0 ? 'Capacitor voltage at t=τ' : 'Capacitor voltage at t=τ',
        },
        unit: 'В',
        slider: {
          min: 0,
          max: emf,
          labelLow: { uk: 'Майже нуль', en: 'Near zero' },
          labelHigh: { uk: mode === 0 ? 'Майже ЕРС' : 'Початкова напруга', en: mode === 0 ? 'Near EMF' : 'Initial voltage' },
        },
      },
    ];
  }

  getExplanation(predictions: Record<string, number>, locale = 'uk'): string {
    const tau = this.tau;
    const predTau = predictions['τ = RC (с)'] ?? 0;
    const errTau = tau > 0 ? Math.abs(((predTau - tau) / tau) * 100).toFixed(1) : '—';
    const uAtTau = this.voltage(tau);
    const { emf, mode } = this.params;

    if (locale === 'uk') {
      return (
        `Стала часу $\\tau=RC=${tau.toFixed(3)}\\,\\text{с}$ (передбачено: ${predTau.toFixed(3)} с, похибка: ${errTau}%). ` +
        `За час $t=\\tau$ конденсатор ` +
        (mode === 0
          ? `заряджається до $U_C(\\tau)=\\mathcal{E}(1-e^{-1})\\approx0.632\\,\\mathcal{E}=${uAtTau.toFixed(2)}\\,\\text{В}$.`
          : `розряджається до $U_C(\\tau)=U_0\\,e^{-1}\\approx0.368\\,U_0=${uAtTau.toFixed(2)}\\,\\text{В}$.`) +
        ` Практично повний ${mode === 0 ? 'заряд' : 'розряд'} відбувається за $5\\tau=${(5 * tau).toFixed(2)}\\,\\text{с}$.`
      );
    }
    return (
      `Time constant $\\tau=RC=${tau.toFixed(3)}\\,\\text{s}$ (predicted: ${predTau.toFixed(3)} s, error: ${errTau}%). ` +
      `After $t=\\tau$ the capacitor ` +
      (mode === 0
        ? `charges to $U_C(\\tau)\\approx0.632\\,\\mathcal{E}=${uAtTau.toFixed(2)}\\,\\text{V}$.`
        : `discharges to $U_C(\\tau)\\approx0.368\\,U_0=${uAtTau.toFixed(2)}\\,\\text{V}$.`) +
      ` Practically complete ${mode === 0 ? 'charge' : 'discharge'} occurs at $5\\tau=${(5 * tau).toFixed(2)}\\,\\text{s}$.`
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
      camera.target = new Vector3(0, -0.6, 0);
      camera.radius = 9;
      camera.beta = Math.PI * 0.38;
    }
    this.meshes = setupRcScene(scene);
    updateRcScene(this.getState(), this.meshes, 0);
  }

  babylonFrame(scene: Scene): void {
    void scene;
    if (this.meshes) {
      updateRcScene(this.getState(), this.meshes, 0);
    }
  }
}
