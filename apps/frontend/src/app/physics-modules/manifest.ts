import type { PhysicsModule } from '@physis/sdk';
import { RigidBodyPendulumModule } from './rigid-body-pendulum/rigid-body-pendulum.module';
import { PlanetOrbitModule } from './planet-orbit/planet-orbit.module';
import { DoublePendulumModule } from './double-pendulum/double-pendulum.module';
import { Collision2DModule } from './collision-2d/collision-2d.module';
import { LorentzParticleModule } from './lorentz-particle/lorentz-particle.module';
import { RcCircuitModule } from './rc-circuit/rc-circuit.module';
import { StandingWaveModule } from './standing-wave/standing-wave.module';
import { WaveInterferenceModule } from './wave-interference/wave-interference.module';
import { IdealGasModule } from './ideal-gas/ideal-gas.module';
import { GasDiffusionModule } from './gas-diffusion/gas-diffusion.module';
import { ThreeBodyModule } from './three-body/three-body.module';

export type ModuleFactory = new () => PhysicsModule;

export const MODULES: readonly ModuleFactory[] = [
  RigidBodyPendulumModule,
  DoublePendulumModule,
  Collision2DModule,
  LorentzParticleModule,
  RcCircuitModule,
  StandingWaveModule,
  WaveInterferenceModule,
  IdealGasModule,
  GasDiffusionModule,
  PlanetOrbitModule,
  ThreeBodyModule,
];
