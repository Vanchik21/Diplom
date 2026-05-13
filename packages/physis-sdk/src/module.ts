import type { ModuleMetadata } from './metadata.js';
import type { Metrics } from './metrics.js';
import type { PredictionTarget } from './poe.js';

export interface PhysicsModule<TParams = unknown, TState = unknown> {
  readonly meta: ModuleMetadata;
  init(params: TParams): void;
  step(dt: number): void;
  getState(): TState;
  getMetrics(): Metrics;
  getPredictionTargets(): PredictionTarget[];
  getExplanation(predictions: Record<string, number>, locale?: string): string;
  reset(): void;
  dispose(): void;
}
