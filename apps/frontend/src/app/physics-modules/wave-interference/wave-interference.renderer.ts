import {
  Color3,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Mesh,
  DynamicTexture,
} from '@babylonjs/core';

const TEX_SIZE = 256;  // texture resolution (square)
const WORLD_SIZE = 5.0; // world units for the plane

export interface WaveInterferenceMeshes {
  plane: Mesh;
  texture: DynamicTexture;
  imageData: ImageData;
  source1: Mesh;
  source2: Mesh;
}

export function setupWaveInterferenceScene(scene: Scene): WaveInterferenceMeshes {
  const texture = new DynamicTexture('wi_tex', { width: TEX_SIZE, height: TEX_SIZE }, scene, false);
  texture.hasAlpha = false;

  const mat = new StandardMaterial('wi_planeMat', scene);
  mat.diffuseTexture = texture;
  mat.emissiveColor = Color3.White();
  mat.disableLighting = true;
  mat.backFaceCulling = false;

  const plane = MeshBuilder.CreatePlane('wi_plane', { size: WORLD_SIZE }, scene);
  plane.material = mat;
  plane.position.set(0, 0, -0.01);

  // Source markers
  const srcMat = new StandardMaterial('wi_srcMat', scene);
  srcMat.diffuseColor = new Color3(1.0, 0.9, 0.1);
  srcMat.emissiveColor = new Color3(0.5, 0.4, 0.0);

  const source1 = MeshBuilder.CreateSphere('wi_src1', { diameter: 0.14, segments: 6 }, scene);
  source1.material = srcMat;

  const source2 = MeshBuilder.CreateSphere('wi_src2', { diameter: 0.14, segments: 6 }, scene);
  source2.material = srcMat.clone('wi_srcMat2');

  // Pre-allocate ImageData for zero-alloc per-frame updates.
  // Cast to native CanvasRenderingContext2D — safe in browser environment.
  const ctx = texture.getContext() as unknown as CanvasRenderingContext2D;
  const imageData = ctx.createImageData(TEX_SIZE, TEX_SIZE);

  return { plane, texture, imageData, source1, source2 };
}

export function updateWaveInterferenceScene(
  meshes: WaveInterferenceMeshes,
  sourceDistanceWorld: number, // world units
  kWave: number,               // physical k (rad/m) — but we map to world units below
  phaseDiffRad: number,
  time: number,
  omega: number,
): void {
  const { imageData, source1, source2 } = meshes;
  const data = imageData.data;

  // Source positions in world space
  const sx1 = -sourceDistanceWorld / 2;
  const sx2 = sourceDistanceWorld / 2;

  // Map world coords to texture coords:
  // pixel (px, py) → world (wx, wy)
  const half = WORLD_SIZE / 2;
  const scale = WORLD_SIZE / TEX_SIZE;

  // k in world units: if physical world = PHYS_SCALE m/world_unit, then k_world = k_phys / PHYS_SCALE
  // We treat 1 world unit = 1 m for simplicity here (parameters already scaled)
  const omegaT = omega * time;

  for (let py = 0; py < TEX_SIZE; py++) {
    const wy = half - py * scale; // flip Y so +y is up
    for (let px = 0; px < TEX_SIZE; px++) {
      const wx = -half + px * scale;

      const r1 = Math.sqrt((wx - sx1) ** 2 + wy ** 2);
      const r2 = Math.sqrt((wx - sx2) ** 2 + wy ** 2);

      // Instantaneous superposition (1/sqrt(r) amplitude falloff, clamped)
      const a1 = 1 / Math.max(Math.sqrt(r1), 0.3);
      const a2 = 1 / Math.max(Math.sqrt(r2), 0.3);

      const u = a1 * Math.cos(kWave * r1 - omegaT)
              + a2 * Math.cos(kWave * r2 - omegaT + phaseDiffRad);

      // Map u → color: blue (positive), red (negative), dark (zero)
      const idx = (py * TEX_SIZE + px) * 4;
      const norm = Math.max(-1, Math.min(1, u * 0.6)); // soft clamp
      if (norm >= 0) {
        data[idx]     = Math.round(20 * (1 - norm));       // R
        data[idx + 1] = Math.round(60 * (1 - norm) + 30 * norm); // G
        data[idx + 2] = Math.round(180 * norm + 15);       // B
      } else {
        const n = -norm;
        data[idx]     = Math.round(200 * n + 15);          // R
        data[idx + 1] = Math.round(20 * (1 - n));          // G
        data[idx + 2] = Math.round(20 * (1 - n));          // B
      }
      data[idx + 3] = 255;
    }
  }

  const ctx = meshes.texture.getContext() as unknown as CanvasRenderingContext2D;
  ctx.putImageData(imageData, 0, 0);
  meshes.texture.update();

  // Update source markers
  source1.position.set(sx1, 0, 0.05);
  source2.position.set(sx2, 0, 0.05);
}
