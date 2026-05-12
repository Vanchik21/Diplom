import type { Scene } from '@babylonjs/core';

export interface BabylonRenderable {
  babylonSetup(scene: Scene): void;
  babylonFrame(scene: Scene): void;
}

export function isBabylonRenderable(value: unknown): value is BabylonRenderable {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as BabylonRenderable).babylonSetup === 'function' &&
    typeof (value as BabylonRenderable).babylonFrame === 'function'
  );
}
