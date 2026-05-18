import {
  Color3,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Mesh,
  TrailMesh,
  Vector3,
  Texture,
  DynamicTexture,
} from '@babylonjs/core';
import type { LorentzState } from './lorentz-particle.types';

export interface LorentzMeshes {
  particle: Mesh;
  trail: TrailMesh;
  fieldArrows: Mesh[];
}

const SCALE = 0.08; // world units per m/s or per physics unit

export function toWorld(v: number): number {
  return v * SCALE;
}

export function setupLorentzScene(scene: Scene): LorentzMeshes {
  // Particle
  const pMat = new StandardMaterial('lor_pMat', scene);
  pMat.diffuseColor = new Color3(0.25, 0.85, 0.35);
  pMat.emissiveColor = new Color3(0.1, 0.5, 0.15);
  pMat.specularColor = Color3.Black();

  const particle = MeshBuilder.CreateSphere('lor_particle', { diameter: 0.18, segments: 8 }, scene);
  particle.material = pMat;
  particle.position = Vector3.Zero();

  // Trail
  const trail = new TrailMesh('lor_trail', particle, scene, 0.06, 600, true);
  const trailMat = new StandardMaterial('lor_trailMat', scene);
  trailMat.emissiveColor = new Color3(0.2, 0.8, 0.3);
  trail.material = trailMat;

  // Grid dots for reference
  const gridMat = new StandardMaterial('lor_gridMat', scene);
  gridMat.diffuseColor = new Color3(0.2, 0.22, 0.28);
  gridMat.specularColor = Color3.Black();

  const fieldArrows: Mesh[] = [];
  const step = 1.5;
  const range = 4;
  for (let xi = -range; xi <= range; xi++) {
    for (let yi = -range; yi <= range; yi++) {
      const dot = MeshBuilder.CreateSphere(`lor_dot_${xi}_${yi}`, { diameter: 0.04, segments: 4 }, scene);
      dot.material = gridMat;
      dot.position.set(xi * step, yi * step, 0);
      fieldArrows.push(dot);
    }
  }

  return { particle, trail, fieldArrows };
}

export function updateLorentzScene(
  state: LorentzState,
  meshes: LorentzMeshes,
): void {
  meshes.particle.position.set(toWorld(state.x), toWorld(state.y), 0);
}
