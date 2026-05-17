import type { PhysicsModule } from '@physis/sdk';
import { RigidBodyPendulumModule } from './rigid-body-pendulum/rigid-body-pendulum.module';
import { PlanetOrbitModule } from './planet-orbit/planet-orbit.module';
import { DoublePendulumModule } from './double-pendulum/double-pendulum.module';
import { Collision2DModule } from './collision-2d/collision-2d.module';

export type ModuleFactory = new () => PhysicsModule;

export const MODULES: readonly ModuleFactory[] = [
  RigidBodyPendulumModule,
  DoublePendulumModule,
  Collision2DModule,
  PlanetOrbitModule,
];
