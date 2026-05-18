import {
  Color3,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Mesh,
  Vector3,
  DynamicTexture,
} from '@babylonjs/core';
import type { RcCircuitState } from './rc-circuit.types';

export interface RcMeshes {
  plate1: Mesh;
  plate2: Mesh;
  chargeFill: Mesh;
  labelPlane: Mesh;
  labelTexture: DynamicTexture;
  wireTop: Mesh;
  wireBottom: Mesh;
  wireLeft: Mesh;
  wireRight: Mesh;
  batteryBody: Mesh;
  batteryPlus: Mesh;
  resistorBody: Mesh;
  currentParticles: Mesh[];
  particlePhases: number[];
}

const PLATE_W = 1.8;
const PLATE_H = 2.4;
const PLATE_DEPTH = 0.08;
const GAP = 1.2;

const CIRCUIT_W = 5.0;
const CIRCUIT_H = 4.5;

// Clockwise path around the outer rectangle: BL → TL → TR → BR → BL
// Segments: left-up (4.5), top-right (5.0), right-down (4.5), bottom-left (5.0) = 19.0 total
const PATH_TOTAL = CIRCUIT_H + CIRCUIT_W + CIRCUIT_H + CIRCUIT_W; // 19.0

function pathPosition(phase: number): Vector3 {
  const halfW = CIRCUIT_W / 2;
  const halfH = CIRCUIT_H / 2;
  const dist = ((phase % 1) + 1) % 1 * PATH_TOTAL;

  const seg0 = CIRCUIT_H;          // left wire up
  const seg1 = seg0 + CIRCUIT_W;   // top wire right
  const seg2 = seg1 + CIRCUIT_H;   // right wire down
  // seg3 = bottom wire left (back to start)

  if (dist < seg0) {
    // Left wire: from (-halfW, -halfH) going up
    return new Vector3(-halfW, -halfH + dist, 0);
  } else if (dist < seg1) {
    // Top wire: from (-halfW, +halfH) going right
    return new Vector3(-halfW + (dist - seg0), halfH, 0);
  } else if (dist < seg2) {
    // Right wire: from (+halfW, +halfH) going down
    return new Vector3(halfW, halfH - (dist - seg1), 0);
  } else {
    // Bottom wire: from (+halfW, -halfH) going left
    return new Vector3(halfW - (dist - seg2), -halfH, 0);
  }
}

export function setupRcScene(scene: Scene): RcMeshes {
  const plateMat = new StandardMaterial('rc_plateMat', scene);
  plateMat.diffuseColor = new Color3(0.55, 0.6, 0.7);
  plateMat.specularColor = new Color3(0.3, 0.3, 0.3);

  const plate1 = MeshBuilder.CreateBox('rc_plate1', { width: PLATE_W, height: PLATE_H, depth: PLATE_DEPTH }, scene);
  plate1.material = plateMat;
  plate1.position.set(-GAP / 2, 0, 0);

  const plate2 = MeshBuilder.CreateBox('rc_plate2', { width: PLATE_W, height: PLATE_H, depth: PLATE_DEPTH }, scene);
  plate2.material = plateMat.clone('rc_plateMat2');
  plate2.position.set(GAP / 2, 0, 0);

  // Charge fill between plates
  const fillMat = new StandardMaterial('rc_fillMat', scene);
  fillMat.diffuseColor = new Color3(0.25, 0.55, 1.0);
  fillMat.emissiveColor = new Color3(0.08, 0.2, 0.5);
  fillMat.alpha = 0.7;

  const chargeFill = MeshBuilder.CreateBox('rc_fill', {
    width: GAP - PLATE_DEPTH,
    height: 0.01,
    depth: 0.5,
  }, scene);
  chargeFill.material = fillMat;
  chargeFill.position.set(0, -PLATE_H / 2, 0);

  // Wires (thin boxes forming a circuit loop)
  const wireMat = new StandardMaterial('rc_wireMat', scene);
  wireMat.diffuseColor = new Color3(0.75, 0.78, 0.82);
  wireMat.specularColor = Color3.Black();

  const wireThick = 0.06;

  const wireTop = MeshBuilder.CreateBox('rc_wt', { width: CIRCUIT_W, height: wireThick, depth: wireThick }, scene);
  wireTop.material = wireMat;
  wireTop.position.set(0, CIRCUIT_H / 2, 0);

  const wireBottom = MeshBuilder.CreateBox('rc_wb', { width: CIRCUIT_W, height: wireThick, depth: wireThick }, scene);
  wireBottom.material = wireMat.clone('rc_wireMat2');
  wireBottom.position.set(0, -CIRCUIT_H / 2, 0);

  const wireLeft = MeshBuilder.CreateBox('rc_wl', { width: wireThick, height: CIRCUIT_H, depth: wireThick }, scene);
  wireLeft.material = wireMat.clone('rc_wireMat3');
  wireLeft.position.set(-CIRCUIT_W / 2, 0, 0);

  const wireRight = MeshBuilder.CreateBox('rc_wr', { width: wireThick, height: CIRCUIT_H, depth: wireThick }, scene);
  wireRight.material = wireMat.clone('rc_wireMat4');
  wireRight.position.set(CIRCUIT_W / 2, 0, 0);

  // Battery on left wire
  const batMat = new StandardMaterial('rc_batMat', scene);
  batMat.diffuseColor = new Color3(0.3, 0.85, 0.35);
  batMat.emissiveColor = new Color3(0.05, 0.2, 0.05);

  const batteryBody = MeshBuilder.CreateBox('rc_bat', { width: 0.12, height: 0.8, depth: 0.25 }, scene);
  batteryBody.material = batMat;
  batteryBody.position.set(-CIRCUIT_W / 2, 0.5, 0);

  const batPlusMat = new StandardMaterial('rc_batPlusMat', scene);
  batPlusMat.diffuseColor = new Color3(1.0, 0.9, 0.2);
  batPlusMat.emissiveColor = new Color3(0.4, 0.3, 0.0);

  const batteryPlus = MeshBuilder.CreateBox('rc_batPlus', { width: 0.12, height: 0.35, depth: 0.25 }, scene);
  batteryPlus.material = batPlusMat;
  batteryPlus.position.set(-CIRCUIT_W / 2, -0.1, 0);

  // Resistor on top wire
  const resMat = new StandardMaterial('rc_resMat', scene);
  resMat.diffuseColor = new Color3(0.85, 0.5, 0.2);
  resMat.specularColor = new Color3(0.3, 0.15, 0.05);

  const resistorBody = MeshBuilder.CreateBox('rc_res', { width: 1.2, height: 0.3, depth: 0.3 }, scene);
  resistorBody.material = resMat;
  resistorBody.position.set(CIRCUIT_W / 2 - 1.5, CIRCUIT_H / 2, 0);

  // Current flow particles — 7 small glowing spheres that travel around the loop
  const particleMat = new StandardMaterial('rc_particleMat', scene);
  particleMat.diffuseColor = new Color3(1.0, 0.85, 0.1);
  particleMat.emissiveColor = new Color3(1.0, 0.7, 0.0);
  particleMat.specularColor = Color3.Black();

  const NUM_PARTICLES = 7;
  const currentParticles: Mesh[] = [];
  const particlePhases: number[] = [];

  for (let i = 0; i < NUM_PARTICLES; i++) {
    const p = MeshBuilder.CreateSphere(`rc_cur_${i}`, { diameter: 0.14, segments: 5 }, scene);
    p.material = particleMat;
    p.isVisible = false;
    currentParticles.push(p);
    particlePhases.push(i / NUM_PARTICLES);
  }

  // Voltage/current label — placed below the circuit with clearance
  const labelTexture = new DynamicTexture('rc_labelTex', { width: 768, height: 128 }, scene);
  const labelMat = new StandardMaterial('rc_labelMat', scene);
  labelMat.diffuseTexture = labelTexture;
  labelMat.emissiveColor = Color3.White();
  labelMat.disableLighting = true;
  labelMat.backFaceCulling = false;

  // Place label well below the circuit (circuit bottom is at y = -2.25)
  const labelPlane = MeshBuilder.CreatePlane('rc_label', { width: 5.5, height: 0.92 }, scene);
  labelPlane.material = labelMat;
  labelPlane.position.set(0, -CIRCUIT_H / 2 - 1.4, 0.01);

  return {
    plate1, plate2, chargeFill,
    labelPlane, labelTexture,
    wireTop, wireBottom, wireLeft, wireRight,
    batteryBody, batteryPlus, resistorBody,
    currentParticles, particlePhases,
  };
}

const VISUAL_SPEED = 1.8;  // world units per second at full-speed current
const MAX_I_REF = 0.003;   // reference current (A) that gives full visual speed
const MIN_I_VISIBLE = 1e-5; // below this, hide particles

export function updateRcScene(state: RcCircuitState, meshes: RcMeshes, _dt: number): void {
  const { fillFraction, voltage, current, time } = state;

  // Animate charge fill height
  const fillH = Math.max(fillFraction * PLATE_H, 0.01);
  meshes.chargeFill.scaling.y = fillFraction > 0.001 ? fillFraction * PLATE_H / 0.01 : 0.001;
  meshes.chargeFill.position.y = -PLATE_H / 2 + fillH / 2;

  // Tint plates based on charge
  const intensity = fillFraction;
  (meshes.plate1.material as StandardMaterial).emissiveColor = new Color3(0, 0, intensity * 0.4);
  (meshes.plate2.material as StandardMaterial).emissiveColor = new Color3(intensity * 0.4, 0, 0);

  // Animate current flow particles using simulation time (avoids dt=0 issue)
  const absI = Math.abs(current);
  const flowing = absI > MIN_I_VISIBLE;

  if (flowing) {
    const speedFraction = Math.min(absI / MAX_I_REF, 1.0);
    const speed = VISUAL_SPEED * (0.15 + 0.85 * speedFraction); // world units/s
    const direction = current >= 0 ? 1 : -1;
    const NUM = meshes.currentParticles.length;

    for (let i = 0; i < NUM; i++) {
      // Phase computed analytically from simulation time → no accumulation needed
      const basePhase = i / NUM;
      const phase = ((basePhase + direction * speed * time / PATH_TOTAL) % 1 + 1) % 1;
      const pos = pathPosition(phase);
      meshes.currentParticles[i].position.copyFrom(pos);
      meshes.currentParticles[i].isVisible = true;

      // Subtle pulse to make each particle visually distinct
      const pulse = 0.55 + 0.45 * Math.sin(phase * Math.PI * 14);
      const mat = meshes.currentParticles[i].material as StandardMaterial;
      mat.emissiveColor = new Color3(pulse, pulse * 0.65, 0);
    }
  } else {
    for (const p of meshes.currentParticles) p.isVisible = false;
  }

  // Label — wide plane placed well below the circuit (circuit bottom = y −2.25)
  const ctx = meshes.labelTexture.getContext();
  meshes.labelTexture.clear();
  ctx.fillStyle = '#0d1020';
  ctx.fillRect(0, 0, 768, 128);

  ctx.font = 'bold 26px monospace';
  ctx.fillStyle = '#7ab8ff';
  ctx.fillText(`U = ${voltage.toFixed(2)} В`, 16, 46);

  ctx.fillStyle = '#ffd060';
  ctx.fillText(`I = ${(current * 1000).toFixed(2)} мА`, 272, 46);

  ctx.fillStyle = '#88ff88';
  ctx.fillText(`τ = ${state.tau.toFixed(3)} с`, 532, 46);

  ctx.strokeStyle = '#2a3050';
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, 764, 124);

  meshes.labelTexture.update();
}
