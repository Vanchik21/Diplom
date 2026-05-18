import {
  Color3,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Mesh,
  DynamicTexture,
} from '@babylonjs/core';
import type { GasDiffusionState } from './gas-diffusion.types';

const TEX_W = 480;
const TEX_H = 320;
const CHART_H = 70;   // bottom strip for concentration chart
const BOX_PAD = 4;

export interface GasDiffusionMeshes {
  plane: Mesh;
  texture: DynamicTexture;
  pixelBuf: Uint8ClampedArray;
}

export function setupGasDiffusionScene(scene: Scene): GasDiffusionMeshes {
  const texture = new DynamicTexture('gd_tex', { width: TEX_W, height: TEX_H }, scene, false);

  const mat = new StandardMaterial('gd_planeMat', scene);
  mat.diffuseTexture = texture;
  mat.emissiveColor = Color3.White();
  mat.disableLighting = true;
  mat.backFaceCulling = false;

  const aspect = TEX_W / TEX_H;
  const plane = MeshBuilder.CreatePlane('gd_plane', { width: 5.0 * aspect, height: 5.0 }, scene);
  plane.material = mat;

  const pixelBuf = new Uint8ClampedArray(TEX_W * TEX_H * 4);

  return { plane, texture, pixelBuf };
}

export function updateGasDiffusionScene(
  meshes: GasDiffusionMeshes,
  state: GasDiffusionState,
  boxW: number,
  boxH: number,
  // Concentration history: arrays of [blueLeft, redRight] per frame
  blueLeftHistory: number[],
  redRightHistory: number[],
): void {
  const { pixelBuf } = meshes;
  const simH = TEX_H - CHART_H;
  const midX = TEX_W / 2;

  // Clear
  for (let i = 0; i < pixelBuf.length; i += 4) {
    pixelBuf[i] = 14; pixelBuf[i + 1] = 16; pixelBuf[i + 2] = 22; pixelBuf[i + 3] = 255;
  }

  // Faint background tint: left half slightly blue, right half slightly red
  for (let py = BOX_PAD; py < simH - BOX_PAD; py++) {
    for (let px = BOX_PAD; px < TEX_W - BOX_PAD; px++) {
      const idx = (py * TEX_W + px) * 4;
      if (px < midX) {
        pixelBuf[idx + 2] = 30; // blue tint on left
      } else {
        pixelBuf[idx] = 30; // red tint on right
      }
    }
  }

  // Divider line (faint)
  for (let py = BOX_PAD; py < simH - BOX_PAD; py++) {
    const idx = (py * TEX_W + Math.round(midX)) * 4;
    pixelBuf[idx] = pixelBuf[idx + 1] = pixelBuf[idx + 2] = 45;
  }

  // Box border
  const drawHLine = (py: number) => {
    for (let px = 0; px < TEX_W; px++) {
      const idx = (py * TEX_W + px) * 4;
      pixelBuf[idx] = pixelBuf[idx + 1] = pixelBuf[idx + 2] = 55;
    }
  };
  const drawVLine = (px: number) => {
    for (let py = BOX_PAD; py < simH - BOX_PAD; py++) {
      const idx = (py * TEX_W + px) * 4;
      pixelBuf[idx] = pixelBuf[idx + 1] = pixelBuf[idx + 2] = 55;
    }
  };
  drawHLine(BOX_PAD); drawHLine(simH - BOX_PAD - 1);
  drawVLine(BOX_PAD); drawVLine(TEX_W - BOX_PAD - 1);

  // Particles
  const scaleX = (TEX_W - 2 * BOX_PAD) / boxW;
  const scaleY = (simH - 2 * BOX_PAD) / boxH;

  for (const p of state.particles) {
    const px = Math.round(BOX_PAD + p.x * scaleX);
    const py = Math.round(BOX_PAD + p.y * scaleY);
    if (px < BOX_PAD || px >= TEX_W - BOX_PAD || py < BOX_PAD || py >= simH - BOX_PAD) continue;

    // Blue species = (60, 130, 255), Red species = (255, 80, 60)
    const r = p.species === 0 ? 60  : 255;
    const g = p.species === 0 ? 130 : 80;
    const b = p.species === 0 ? 255 : 60;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = px + dx; const ny = py + dy;
        if (nx < 0 || nx >= TEX_W || ny < 0 || ny >= simH) continue;
        const idx = (ny * TEX_W + nx) * 4;
        pixelBuf[idx] = r; pixelBuf[idx + 1] = g; pixelBuf[idx + 2] = b;
      }
    }
  }

  // Chart background
  for (let py = simH; py < TEX_H; py++) {
    for (let px = 0; px < TEX_W; px++) {
      const idx = (py * TEX_W + px) * 4;
      pixelBuf[idx] = 18; pixelBuf[idx + 1] = 20; pixelBuf[idx + 2] = 30;
    }
  }

  // Draw concentration lines in chart area
  const chartTop = simH + 4;
  const chartBot = TEX_H - 4;
  const chartHeight = chartBot - chartTop;
  const len = Math.min(blueLeftHistory.length, TEX_W - 8);
  const startIdx = Math.max(0, blueLeftHistory.length - len);

  for (let i = 1; i < len; i++) {
    const x0 = 4 + i - 1;
    const x1 = 4 + i;

    // Blue left concentration
    const bl0 = blueLeftHistory[startIdx + i - 1];
    const bl1 = blueLeftHistory[startIdx + i];
    const by0 = Math.round(chartBot - bl0 * chartHeight);
    const by1 = Math.round(chartBot - bl1 * chartHeight);

    // Red right concentration
    const rr0 = redRightHistory[startIdx + i - 1];
    const rr1 = redRightHistory[startIdx + i];
    const ry0 = Math.round(chartBot - rr0 * chartHeight);
    const ry1 = Math.round(chartBot - rr1 * chartHeight);

    // Draw line segments (simple 1-px)
    if (by0 >= chartTop && by0 < TEX_H && x0 >= 0 && x0 < TEX_W) {
      const idx = (by0 * TEX_W + x0) * 4;
      pixelBuf[idx] = 80; pixelBuf[idx + 1] = 140; pixelBuf[idx + 2] = 255;
    }
    if (ry0 >= chartTop && ry0 < TEX_H && x0 >= 0 && x0 < TEX_W) {
      const idx = (ry0 * TEX_W + x0) * 4;
      pixelBuf[idx] = 255; pixelBuf[idx + 1] = 90; pixelBuf[idx + 2] = 70;
    }
    void bl1; void rr1; void by1; void ry1; void x1;
  }

  // 50% equilibrium line (white dashed)
  const eqY = Math.round(chartBot - 0.5 * chartHeight);
  for (let px = 4; px < TEX_W - 4; px += 4) {
    if (eqY >= chartTop && eqY < TEX_H) {
      const idx = (eqY * TEX_W + px) * 4;
      pixelBuf[idx] = pixelBuf[idx + 1] = pixelBuf[idx + 2] = 80;
    }
  }

  // Write to canvas
  const ctx = meshes.texture.getContext() as unknown as CanvasRenderingContext2D;
  const imageData = ctx.createImageData(TEX_W, TEX_H);
  imageData.data.set(pixelBuf);
  ctx.putImageData(imageData, 0, 0);
  meshes.texture.update();
}
