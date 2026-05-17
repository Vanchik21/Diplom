import {
  Color3,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Mesh,
  TrailMesh,
  Vector3,
} from '@babylonjs/core';
import type { DoublePendulumState } from './double-pendulum.types';

export interface DoublePendulumMeshes {
  pivot: Mesh;
  bob1: Mesh;
  bob2: Mesh;
  rod1: Mesh;
  rod2: Mesh;
  trail: TrailMesh;
}

export function setupDoublePendulumScene(scene: Scene): DoublePendulumMeshes {
  const pivotMat = new StandardMaterial('dp_pivotMat', scene);
  pivotMat.diffuseColor = new Color3(0.6, 0.6, 0.7);
  pivotMat.specularColor = Color3.Black();

  const pivot = MeshBuilder.CreateSphere('dp_pivot', { diameter: 0.14 }, scene);
  pivot.material = pivotMat;
  pivot.position = Vector3.Zero();

  const bob1Mat = new StandardMaterial('dp_bob1Mat', scene);
  bob1Mat.diffuseColor = new Color3(0.3, 0.6, 1.0);
  bob1Mat.specularColor = new Color3(0.4, 0.4, 0.4);

  const bob1 = MeshBuilder.CreateSphere('dp_bob1', { diameter: 0.28 }, scene);
  bob1.material = bob1Mat;

  const bob2Mat = new StandardMaterial('dp_bob2Mat', scene);
  bob2Mat.diffuseColor = new Color3(1.0, 0.45, 0.2);
  bob2Mat.specularColor = new Color3(0.4, 0.4, 0.4);

  const bob2 = MeshBuilder.CreateSphere('dp_bob2', { diameter: 0.24 }, scene);
  bob2.material = bob2Mat;

  const rodMat = new StandardMaterial('dp_rodMat', scene);
  rodMat.diffuseColor = new Color3(0.7, 0.72, 0.78);
  rodMat.specularColor = Color3.Black();

  const rod1 = MeshBuilder.CreateCylinder('dp_rod1', {
    height: 1,
    diameter: 0.04,
    tessellation: 8,
  }, scene);
  rod1.material = rodMat;

  const rod2 = MeshBuilder.CreateCylinder('dp_rod2', {
    height: 1,
    diameter: 0.04,
    tessellation: 8,
  }, scene);
  rod2.material = rodMat.clone('dp_rodMat2');

  const trail = new TrailMesh('dp_trail', bob2, scene, 0.025, 300, true);
  const trailMat = new StandardMaterial('dp_trailMat', scene);
  trailMat.emissiveColor = new Color3(1.0, 0.5, 0.2);
  trail.material = trailMat;

  return { pivot, bob1, bob2, rod1, rod2, trail };
}

export function updateDoublePendulumScene(
  state: DoublePendulumState,
  meshes: DoublePendulumMeshes,
): void {
  const { bob1World, bob2World } = state;

  meshes.bob1.position.set(bob1World[0], bob1World[1], 0);
  meshes.bob2.position.set(bob2World[0], bob2World[1], 0);

  const midX1 = bob1World[0] / 2;
  const midY1 = bob1World[1] / 2;
  const len1 = Math.sqrt(bob1World[0] ** 2 + bob1World[1] ** 2);
  meshes.rod1.scaling.y = Math.max(len1, 0.01);
  meshes.rod1.position.set(midX1, midY1, 0);
  meshes.rod1.rotation.z = Math.atan2(-bob1World[0], bob1World[1]);

  const dx = bob2World[0] - bob1World[0];
  const dy = bob2World[1] - bob1World[1];
  const len2 = Math.sqrt(dx ** 2 + dy ** 2);
  meshes.rod2.scaling.y = Math.max(len2, 0.01);
  meshes.rod2.position.set(bob1World[0] + dx / 2, bob1World[1] + dy / 2, 0);
  meshes.rod2.rotation.z = Math.atan2(-dx, dy);
}
