import {
  Color3,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Mesh,
  Vector3,
  DynamicTexture,
} from '@babylonjs/core';
import type { Collision2DState } from './collision-2d.types';

export interface CollisionMeshes {
  ball1: Mesh;
  ball2: Mesh;
  wall: Mesh;
}

export function setupCollisionScene(scene: Scene): CollisionMeshes {
  const mat1 = new StandardMaterial('col_mat1', scene);
  mat1.diffuseColor = new Color3(0.3, 0.55, 1.0);
  mat1.specularColor = new Color3(0.4, 0.4, 0.4);

  const ball1 = MeshBuilder.CreateSphere('col_ball1', { diameter: 1, segments: 12 }, scene);
  ball1.material = mat1;

  const mat2 = new StandardMaterial('col_mat2', scene);
  mat2.diffuseColor = new Color3(1.0, 0.45, 0.2);
  mat2.specularColor = new Color3(0.4, 0.4, 0.4);

  const ball2 = MeshBuilder.CreateSphere('col_ball2', { diameter: 1, segments: 12 }, scene);
  ball2.material = mat2;

  // Horizontal reference line
  const wallMat = new StandardMaterial('col_wall', scene);
  wallMat.diffuseColor = new Color3(0.25, 0.27, 0.32);
  wallMat.specularColor = Color3.Black();

  const wall = MeshBuilder.CreateBox('col_floor', { width: 24, height: 0.04, depth: 0.1 }, scene);
  wall.material = wallMat;
  wall.position.y = 0;

  return { ball1, ball2, wall };
}

export function updateCollisionScene(
  state: Collision2DState,
  meshes: CollisionMeshes,
): void {
  const { pos1, pos2, radius1, radius2 } = state;

  meshes.ball1.position.set(pos1[0], pos1[1], 0);
  meshes.ball1.scaling = new Vector3(radius1 * 2, radius1 * 2, radius1 * 2);

  meshes.ball2.position.set(pos2[0], pos2[1], 0);
  meshes.ball2.scaling = new Vector3(radius2 * 2, radius2 * 2, radius2 * 2);
}
