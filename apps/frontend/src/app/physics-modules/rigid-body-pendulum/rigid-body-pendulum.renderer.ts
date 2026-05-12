import {
  Color3,
  MeshBuilder,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
  Mesh,
  TrailMesh,
} from '@babylonjs/core';
import {
  createCoordinateAxes,
  createGroundGrid,
  createVectorArrow,
} from '../../rendering/babylon/babylon-primitives';
import type { PendulumState } from './rigid-body-pendulum.types';

export interface PendulumMeshes {
  pivot: Mesh;
  bob: Mesh;
  rod: Mesh;
  velocityArrow: TransformNode;
  trail: TrailMesh;
}

export function setupPendulumScene(scene: Scene): PendulumMeshes {
  const pivotMat = new StandardMaterial('pivotMat', scene);
  pivotMat.diffuseColor = new Color3(0.6, 0.6, 0.7);
  pivotMat.specularColor = Color3.Black();

  const pivot = MeshBuilder.CreateSphere('pivot', { diameter: 0.12 }, scene);
  pivot.material = pivotMat;
  pivot.position = Vector3.Zero();

  const bobMat = new StandardMaterial('bobMat', scene);
  bobMat.diffuseColor = new Color3(0.3, 0.5, 1.0);
  bobMat.specularColor = new Color3(0.5, 0.5, 0.5);

  const bob = MeshBuilder.CreateSphere('bob', { diameter: 0.3 }, scene);
  bob.material = bobMat;

  const rodMat = new StandardMaterial('rodMat', scene);
  rodMat.diffuseColor = new Color3(0.7, 0.72, 0.78);
  rodMat.specularColor = Color3.Black();

  const rod = MeshBuilder.CreateCylinder('rod', {
    height: 1,
    diameter: 0.04,
    tessellation: 8,
  }, scene);
  rod.material = rodMat;

  const velocityArrow = createVectorArrow(scene, {
    name: 'velocityArrow',
    color: new Color3(0.2, 1.0, 0.4),
    shaftDiameter: 0.025,
    headDiameter: 0.07,
  });

  const trail = new TrailMesh('trail', bob, scene, 0.035, 180, true);
  const trailMat = new StandardMaterial('trailMat', scene);
  trailMat.emissiveColor = new Color3(0.35, 0.45, 0.9);
  trail.material = trailMat;

  createCoordinateAxes(scene, { size: 0.5 });
  createGroundGrid(scene, { size: 12 });

  return { pivot, bob, rod, velocityArrow, trail };
}

export function updatePendulumScene(state: PendulumState, meshes: PendulumMeshes): void {
  const { theta, thetaDot, length, bobWorld, velocity } = state;

  meshes.bob.position.set(bobWorld[0], bobWorld[1], bobWorld[2]);

  meshes.rod.scaling.y = length;
  meshes.rod.position.set(bobWorld[0] / 2, bobWorld[1] / 2, 0);
  meshes.rod.rotation.z = Math.PI - theta;

  const speed = Math.sqrt(velocity[0] ** 2 + velocity[1] ** 2);
  if (speed < 0.01) {
    meshes.velocityArrow.setEnabled(false);
  } else {
    meshes.velocityArrow.setEnabled(true);
    meshes.velocityArrow.position.set(bobWorld[0], bobWorld[1], bobWorld[2]);
    meshes.velocityArrow.scaling.y = speed * 0.25;
    meshes.velocityArrow.rotation.z = Math.atan2(velocity[0], velocity[1]);
  }

  void thetaDot;
}
