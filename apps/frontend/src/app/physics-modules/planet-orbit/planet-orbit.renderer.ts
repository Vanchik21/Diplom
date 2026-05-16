import {
  ArcRotateCamera,
  Color3,
  GlowLayer,
  MeshBuilder,
  PointLight,
  Quaternion,
  Scene,
  StandardMaterial,
  TrailMesh,
  TransformNode,
  Vector3,
  Mesh,
  LinesMesh,
} from '@babylonjs/core';
import { createVectorArrow } from '../../rendering/babylon/babylon-primitives';
import type { PlanetOrbitState } from './planet-orbit.types';

const NUM_ORBIT_POINTS = 128;

export interface OrbitMeshes {
  star: Mesh;
  planet: Mesh;
  trail: TrailMesh;
  velocityArrow: TransformNode;
  forceArrow: TransformNode;
  orbitLine: LinesMesh;
  periMarker: Mesh;
  apoMarker: Mesh;
  starLight: PointLight;
  glow: GlowLayer;
}

function arrowQuaternion(dx: number, dz: number): Quaternion | null {
  const len = Math.sqrt(dx * dx + dz * dz);
  if (len < 0.001) return null;
  const nx = dx / len;
  const nz = dz / len;
  return Quaternion.RotationAxis(new Vector3(nz, 0, -nx), Math.PI / 2);
}

function buildOrbitPoints(cx: number, a: number, b: number): Vector3[] {
  const pts: Vector3[] = [];
  for (let i = 0; i <= NUM_ORBIT_POINTS; i++) {
    const t = (i / NUM_ORBIT_POINTS) * 2 * Math.PI;
    pts.push(new Vector3(cx + a * Math.cos(t), 0.02, b * Math.sin(t)));
  }
  return pts;
}

export function setupOrbitScene(scene: Scene, initialRadius: number): OrbitMeshes {
  const cam = scene.activeCamera as ArcRotateCamera;
  if (cam) {
    cam.target = Vector3.Zero();
    cam.alpha = -Math.PI / 2;
    cam.beta = 0.18;
    cam.radius = initialRadius * 2.2;
    cam.lowerRadiusLimit = 2;
    cam.upperRadiusLimit = Math.max(80, initialRadius * 6);
  }

  const glow = new GlowLayer('starGlow', scene);
  glow.intensity = 0.9;
  glow.blurKernelSize = 64;

  const starLight = new PointLight('starLight', Vector3.Zero(), scene);
  starLight.diffuse = new Color3(1.0, 0.9, 0.72);
  starLight.specular = new Color3(1.0, 0.85, 0.6);
  starLight.intensity = 2.5;
  starLight.range = initialRadius * 10;

  const starMat = new StandardMaterial('starMat', scene);
  starMat.emissiveColor = new Color3(1.0, 0.75, 0.1);
  starMat.diffuseColor = new Color3(1.0, 0.55, 0.05);
  starMat.specularColor = Color3.Black();
  const star = MeshBuilder.CreateSphere('star', { diameter: 1.8, segments: 24 }, scene);
  star.material = starMat;
  star.position = Vector3.Zero();

  glow.addIncludedOnlyMesh(star);

  const planetMat = new StandardMaterial('planetMat', scene);
  planetMat.diffuseColor = new Color3(0.22, 0.52, 1.0);
  planetMat.specularColor = new Color3(0.35, 0.35, 0.45);
  const planet = MeshBuilder.CreateSphere('planet', { diameter: 0.5, segments: 16 }, scene);
  planet.material = planetMat;
  planet.position = new Vector3(initialRadius, 0, 0);

  const trail = new TrailMesh('orbitTrail', planet, scene, 0.05, 800, true);
  const trailMat = new StandardMaterial('trailMat', scene);
  trailMat.emissiveColor = new Color3(0.28, 0.45, 0.9);
  trailMat.disableLighting = true;
  trail.material = trailMat;

  const velocityArrow = createVectorArrow(scene, {
    name: 'velArrow',
    color: new Color3(0.15, 1.0, 0.4),
    shaftDiameter: 0.04,
    headDiameter: 0.11,
  });
  velocityArrow.setEnabled(false);

  const forceArrow = createVectorArrow(scene, {
    name: 'forceArrow',
    color: new Color3(1.0, 0.45, 0.1),
    shaftDiameter: 0.035,
    headDiameter: 0.10,
  });
  forceArrow.setEnabled(false);

  const orbitLinePts = buildOrbitPoints(0, initialRadius, initialRadius);
  const orbitLine = MeshBuilder.CreateLines('orbitLine', {
    points: orbitLinePts,
    updatable: true,
  }, scene) as LinesMesh;
  orbitLine.color = new Color3(0.35, 0.42, 0.65);
  orbitLine.alpha = 0.55;

  const markerMat = new StandardMaterial('markerMat', scene);
  markerMat.emissiveColor = new Color3(0.9, 0.85, 0.2);
  markerMat.disableLighting = true;
  const periMarker = MeshBuilder.CreateSphere('periMarker', { diameter: 0.22 }, scene);
  periMarker.material = markerMat;
  periMarker.isPickable = false;

  const apoMat = new StandardMaterial('apoMat', scene);
  apoMat.emissiveColor = new Color3(0.55, 0.65, 1.0);
  apoMat.disableLighting = true;
  const apoMarker = MeshBuilder.CreateSphere('apoMarker', { diameter: 0.22 }, scene);
  apoMarker.material = apoMat;
  apoMarker.isPickable = false;

  return { star, planet, trail, velocityArrow, forceArrow, orbitLine, periMarker, apoMarker, starLight, glow };
}

export function updateOrbitScene(state: PlanetOrbitState, meshes: OrbitMeshes): void {
  const { x, z, vx, vz, speed } = state;

  meshes.planet.position.set(x, 0, z);

  const velQ = arrowQuaternion(vx, vz);
  if (velQ && speed > 0.05) {
    meshes.velocityArrow.setEnabled(true);
    meshes.velocityArrow.position.set(x, 0, z);
    meshes.velocityArrow.rotationQuaternion = velQ;
    meshes.velocityArrow.scaling.y = Math.min(speed * 0.12, 4);
  } else {
    meshes.velocityArrow.setEnabled(false);
  }

  const fx = -x;
  const fz = -z;
  const fr = Math.sqrt(fx * fx + fz * fz);
  const forceQ = arrowQuaternion(fx, fz);
  if (forceQ && fr > 0.1) {
    meshes.forceArrow.setEnabled(true);
    meshes.forceArrow.position.set(x, 0, z);
    meshes.forceArrow.rotationQuaternion = forceQ;
    meshes.forceArrow.scaling.y = Math.min(1 / (fr * 0.08), 3.5);
  } else {
    meshes.forceArrow.setEnabled(false);
  }
}

export function updateOrbitEllipse(
  scene: Scene,
  meshes: OrbitMeshes,
  cx: number,
  a: number,
  b: number,
  periX: number,
  apoX: number,
): void {
  if (a <= 0) {
    meshes.orbitLine.setEnabled(false);
    meshes.periMarker.setEnabled(false);
    meshes.apoMarker.setEnabled(false);
    return;
  }

  meshes.orbitLine.setEnabled(true);
  const pts = buildOrbitPoints(cx, a, b);
  MeshBuilder.CreateLines('orbitLine', { points: pts, instance: meshes.orbitLine }, scene);

  meshes.periMarker.setEnabled(true);
  meshes.periMarker.position.set(periX, 0, 0);

  meshes.apoMarker.setEnabled(true);
  meshes.apoMarker.position.set(apoX, 0, 0);
}
