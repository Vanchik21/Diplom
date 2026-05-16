import type { PhysicsModule } from '@physis/sdk';
import { RigidBodyPendulumModule } from './rigid-body-pendulum/rigid-body-pendulum.module';
import { PlanetOrbitModule } from './planet-orbit/planet-orbit.module';

export type ModuleFactory = new () => PhysicsModule;

export const MODULES: readonly ModuleFactory[] = [
  RigidBodyPendulumModule,
  PlanetOrbitModule,
];
