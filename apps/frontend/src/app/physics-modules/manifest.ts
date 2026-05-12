import type { PhysicsModule } from '@physis/sdk';

export type ModuleFactory = new () => PhysicsModule;

export const MODULES: readonly ModuleFactory[] = [];
