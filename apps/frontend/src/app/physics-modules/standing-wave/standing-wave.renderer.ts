import {
  Color3,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Mesh,
  Vector3,
  DynamicTexture,
} from '@babylonjs/core';

export const STRING_LENGTH = 4.0; // world units (= L metres in physics)
const BEAD_COUNT = 80;
const BEAD_DIAMETER = 0.07;

export interface StandingWaveMeshes {
  beads: Mesh[];
  anchorLeft: Mesh;
  anchorRight: Mesh;
  axisLine: Mesh;
  nodeMarkers: Mesh[];
  labelPlane: Mesh;
  labelTexture: DynamicTexture;
}

export function setupStandingWaveScene(scene: Scene): StandingWaveMeshes {
  // String beads
  const beadMat = new StandardMaterial('sw_beadMat', scene);
  beadMat.diffuseColor = new Color3(0.3, 0.6, 1.0);
  beadMat.emissiveColor = new Color3(0.05, 0.15, 0.4);
  beadMat.specularColor = new Color3(0.5, 0.5, 0.5);

  const beads: Mesh[] = [];
  for (let i = 0; i < BEAD_COUNT; i++) {
    const bead = MeshBuilder.CreateSphere(`sw_bead_${i}`, { diameter: BEAD_DIAMETER, segments: 5 }, scene);
    bead.material = beadMat;
    const x = -STRING_LENGTH / 2 + (i / (BEAD_COUNT - 1)) * STRING_LENGTH;
    bead.position.set(x, 0, 0);
    beads.push(bead);
  }

  // Anchor points (fixed ends)
  const anchorMat = new StandardMaterial('sw_anchorMat', scene);
  anchorMat.diffuseColor = new Color3(0.55, 0.58, 0.65);
  anchorMat.specularColor = Color3.Black();

  const anchorLeft = MeshBuilder.CreateBox('sw_anchorL', { width: 0.15, height: 0.5, depth: 0.15 }, scene);
  anchorLeft.material = anchorMat;
  anchorLeft.position.set(-STRING_LENGTH / 2, 0, 0);

  const anchorRight = MeshBuilder.CreateBox('sw_anchorR', { width: 0.15, height: 0.5, depth: 0.15 }, scene);
  anchorRight.material = anchorMat.clone('sw_anchorMat2');
  anchorRight.position.set(STRING_LENGTH / 2, 0, 0);

  // Axis (equilibrium line)
  const axisMat = new StandardMaterial('sw_axisMat', scene);
  axisMat.diffuseColor = new Color3(0.22, 0.24, 0.3);
  axisMat.specularColor = Color3.Black();

  const axisLine = MeshBuilder.CreateBox('sw_axis', {
    width: STRING_LENGTH,
    height: 0.015,
    depth: 0.015,
  }, scene);
  axisLine.material = axisMat;
  axisLine.position.set(0, 0, 0);

  // Node markers (updated per harmonic)
  const nodeMarkers: Mesh[] = [];
  const nodeMat = new StandardMaterial('sw_nodeMat', scene);
  nodeMat.diffuseColor = new Color3(1.0, 0.8, 0.1);
  nodeMat.emissiveColor = new Color3(0.3, 0.2, 0.0);
  for (let i = 0; i <= 6; i++) {
    const marker = MeshBuilder.CreateSphere(`sw_node_${i}`, { diameter: 0.12, segments: 6 }, scene);
    marker.material = nodeMat;
    marker.setEnabled(false);
    nodeMarkers.push(marker);
  }

  // Label with f, λ, v
  const labelTexture = new DynamicTexture('sw_labelTex', { width: 320, height: 96 }, scene);
  const labelMat = new StandardMaterial('sw_labelMat', scene);
  labelMat.diffuseTexture = labelTexture;
  labelMat.emissiveColor = Color3.White();
  labelMat.disableLighting = true;

  const labelPlane = MeshBuilder.CreatePlane('sw_label', { width: 3.0, height: 0.9 }, scene);
  labelPlane.material = labelMat;
  labelPlane.position.set(0, -1.6, 0.01);

  return { beads, anchorLeft, anchorRight, axisLine, nodeMarkers, labelPlane, labelTexture };
}

export function updateStandingWaveScene(
  meshes: StandingWaveMeshes,
  harmonic: number,
  amplitude: number,  // in world units
  omega: number,
  time: number,
  waveSpeed: number,
  frequency: number,
  wavelength: number,
): void {
  const L = STRING_LENGTH;
  const k = (harmonic * Math.PI) / L;
  const cosOmegaT = Math.cos(omega * time);

  // Update bead positions
  for (let i = 0; i < meshes.beads.length; i++) {
    const x = -L / 2 + (i / (meshes.beads.length - 1)) * L;
    const xLocal = x + L / 2; // 0..L
    const y = amplitude * Math.sin(k * xLocal) * cosOmegaT;
    meshes.beads[i].position.set(x, y, 0);
  }

  // Update node markers (nodes at x = j*L/n, j=0..n)
  for (let i = 0; i < meshes.nodeMarkers.length; i++) {
    if (i <= harmonic) {
      const xLocal = (i / harmonic) * L;
      meshes.nodeMarkers[i].position.set(-L / 2 + xLocal, 0, 0);
      meshes.nodeMarkers[i].setEnabled(true);
    } else {
      meshes.nodeMarkers[i].setEnabled(false);
    }
  }

  // Update label
  const ctx = meshes.labelTexture.getContext();
  meshes.labelTexture.clear();
  ctx.fillStyle = '#0f1117';
  ctx.fillRect(0, 0, 320, 96);
  ctx.font = 'bold 18px monospace';
  ctx.fillStyle = '#e0e8ff';
  ctx.fillText(`f = ${frequency.toFixed(2)} Гц`, 10, 28);
  ctx.fillStyle = '#ffd060';
  ctx.fillText(`λ = ${wavelength.toFixed(3)} м`, 10, 56);
  ctx.fillStyle = '#88ff88';
  ctx.fillText(`v = ${waveSpeed.toFixed(2)} м/с`, 10, 84);
  meshes.labelTexture.update();
}
