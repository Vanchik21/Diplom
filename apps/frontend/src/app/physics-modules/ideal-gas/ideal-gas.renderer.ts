import {
  Color3,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Mesh,
  DynamicTexture,
} from '@babylonjs/core';
import type { IdealGasState } from './ideal-gas.types';

const TEX_W = 480;
const TEX_H = 320;
const HIST_H = 80;        // histogram height in px
const BOX_PAD = 4;        // pixels padding for box border

export interface IdealGasMeshes {
  plane: Mesh;
  texture: DynamicTexture;
  pixelBuf: Uint8ClampedArray;
}

export function setupIdealGasScene(scene: Scene): IdealGasMeshes {
  const texture = new DynamicTexture('ig_tex', { width: TEX_W, height: TEX_H }, scene, false);

  const mat = new StandardMaterial('ig_planeMat', scene);
  mat.diffuseTexture = texture;
  mat.emissiveColor = Color3.White();
  mat.disableLighting = true;
  mat.backFaceCulling = false;

  const aspect = TEX_W / TEX_H;
  const plane = MeshBuilder.CreatePlane('ig_plane', { width: 5.0 * aspect, height: 5.0 }, scene);
  plane.material = mat;

  const pixelBuf = new Uint8ClampedArray(TEX_W * TEX_H * 4);

  return { plane, texture, pixelBuf };
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: return [v * 255, t * 255, p * 255];
    case 1: return [q * 255, v * 255, p * 255];
    case 2: return [p * 255, v * 255, t * 255];
    case 3: return [p * 255, q * 255, v * 255];
    case 4: return [t * 255, p * 255, v * 255];
    default: return [v * 255, p * 255, q * 255];
  }
}

export function updateIdealGasScene(
  meshes: IdealGasMeshes,
  state: IdealGasState,
  boxW: number,
  boxH: number,
  speedHistogram: number[], // normalized bin counts [0..1]
  maxSpeed: number,
  mbPeak: number,           // Maxwell-Boltzmann peak speed for overlay line
): void {
  const { pixelBuf } = meshes;
  const simH = TEX_H - HIST_H; // pixel rows for simulation area

  // Clear background
  for (let i = 0; i < pixelBuf.length; i += 4) {
    pixelBuf[i]     = 14;
    pixelBuf[i + 1] = 16;
    pixelBuf[i + 2] = 22;
    pixelBuf[i + 3] = 255;
  }

  // Box border (dim grey)
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

  // Particles — color by speed (blue=slow, red=fast)
  const scaleX = (TEX_W - 2 * BOX_PAD) / boxW;
  const scaleY = (simH - 2 * BOX_PAD) / boxH;

  for (const p of state.particles) {
    const px = Math.round(BOX_PAD + p.x * scaleX);
    const py = Math.round(BOX_PAD + p.y * scaleY);
    if (px < BOX_PAD || px >= TEX_W - BOX_PAD || py < BOX_PAD || py >= simH - BOX_PAD) continue;

    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    const t = Math.min(speed / (maxSpeed * 0.6 + 0.001), 1);
    // Hue: 0.66 (blue) → 0.0 (red)
    const hue = 0.66 * (1 - t);
    const [r, g, b] = hsvToRgb(hue, 0.9, 0.95);

    // 3×3 dot
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = px + dx; const ny = py + dy;
        if (nx < 0 || nx >= TEX_W || ny < 0 || ny >= simH) continue;
        const idx = (ny * TEX_W + nx) * 4;
        pixelBuf[idx] = r; pixelBuf[idx + 1] = g; pixelBuf[idx + 2] = b;
      }
    }
  }

  // Histogram background (slightly lighter strip at bottom)
  for (let py = simH; py < TEX_H; py++) {
    for (let px = 0; px < TEX_W; px++) {
      const idx = (py * TEX_W + px) * 4;
      pixelBuf[idx] = 18; pixelBuf[idx + 1] = 20; pixelBuf[idx + 2] = 30;
    }
  }

  // Histogram bars
  const bins = speedHistogram.length;
  const binW = Math.max(1, Math.floor((TEX_W - 8) / bins));
  for (let b = 0; b < bins; b++) {
    const barH = Math.round(speedHistogram[b] * (HIST_H - 8));
    const bx = 4 + b * binW;
    for (let dy = 0; dy < barH; dy++) {
      const py = TEX_H - 4 - dy;
      for (let dx = 0; dx < binW - 1; dx++) {
        const px = bx + dx;
        if (px >= TEX_W) break;
        const idx = (py * TEX_W + px) * 4;
        const t = b / bins;
        const hue = 0.66 * (1 - t);
        const [r, g, bl] = hsvToRgb(hue, 0.8, 0.9);
        pixelBuf[idx] = r; pixelBuf[idx + 1] = g; pixelBuf[idx + 2] = bl;
      }
    }
  }

  // MB peak line (green vertical line)
  if (mbPeak > 0 && maxSpeed > 0) {
    const peakBin = Math.round((mbPeak / maxSpeed) * bins);
    if (peakBin >= 0 && peakBin < TEX_W) {
      const px = 4 + peakBin * binW;
      for (let py = simH; py < TEX_H - 4; py++) {
        const idx = (py * TEX_W + Math.min(px, TEX_W - 1)) * 4;
        pixelBuf[idx] = 80; pixelBuf[idx + 1] = 255; pixelBuf[idx + 2] = 120;
      }
    }
  }

  // Write to texture
  const ctx = meshes.texture.getContext() as unknown as CanvasRenderingContext2D;
  const imageData = ctx.createImageData(TEX_W, TEX_H);
  imageData.data.set(pixelBuf);
  ctx.putImageData(imageData, 0, 0);
  meshes.texture.update();
}
