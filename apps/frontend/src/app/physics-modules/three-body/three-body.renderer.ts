import {
  Color3,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Mesh,
  TrailMesh,
  Vector3,
} from '@babylonjs/core';
import type { ThreeBodyRenderState } from './three-body.types';

const COLORS: [Color3, Color3, Color3] = [
  new Color3(0.3, 0.6, 1.0),   // body 1 — blue
  new Color3(1.0, 0.5, 0.15),  // body 2 — orange
  new Color3(0.25, 0.9, 0.4),  // body 3 — green
];

const WORLD_SCALE = 1.0; // physics units → world units (1:1)

export interface ThreeBodyMeshes {
  bodies: [Mesh, Mesh, Mesh];
  trails: [TrailMesh, TrailMesh, TrailMesh];
}

export function setupThreeBodyScene(scene: Scene): ThreeBodyMeshes {
  const bodies = COLORS.map((col, i) => {
    const mat = new StandardMaterial(`tb_mat${i}`, scene);
    mat.diffuseColor = col;
    mat.emissiveColor = col.scale(0.3);
    mat.specularColor = new Color3(0.3, 0.3, 0.3);

    const body = MeshBuilder.CreateSphere(`tb_body${i}`, { diameter: 0.22, segments: 8 }, scene);
    body.material = mat;
    return body;
  }) as [Mesh, Mesh, Mesh];

  const trails = bodies.map((body, i) => {
    const trail = new TrailMesh(`tb_trail${i}`, body, scene, 0.04, 400, true);
    const tMat = new StandardMaterial(`tb_trailMat${i}`, scene);
    tMat.emissiveColor = COLORS[i].scale(0.7);
    trail.material = tMat;
    return trail;
  }) as [TrailMesh, TrailMesh, TrailMesh];

  return { bodies, trails };
}

export function updateThreeBodyScene(
  state: ThreeBodyRenderState,
  meshes: ThreeBodyMeshes,
  masses: [number, number, number],
): void {
  for (let i = 0; i < 3; i++) {
    const [x, y] = state.pos[i];
    meshes.bodies[i].position.set(x * WORLD_SCALE, y * WORLD_SCALE, 0);

    // Scale body size with mass (cube-root)
    const r = 0.1 + 0.08 * Math.cbrt(masses[i]);
    meshes.bodies[i].scaling = new Vector3(r * 2, r * 2, r * 2);
  }
}
