import {
  Color3,
  Color4,
  DynamicTexture,
  Mesh,
  MeshBuilder,
  PointLight,
  PointerDragBehavior,
  Scene,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';
import { ELEMENTS } from './build-atom.types';

// ── Layout constants ────────────────────────────────────────────────────────
const NUCLEUS_SNAP_R = 1.5;   // snap radius for protons/neutrons
const SHELL1_R       = 2.4;   // first electron shell radius
const SHELL2_R       = 3.8;   // second electron shell radius
const SHELL_SNAP_W   = 0.65;  // snap band half-width around shell
const TRAY_P_X       = -5.8;  // proton tray X
const TRAY_N_X       = -4.6;  // neutron tray X
const TRAY_E_X       =  5.8;  // electron tray X
const TRAY_Y_START   =  2.6;
const TRAY_Y_STEP    =  0.58;
const MAX_P          = 10;
const MAX_N          = 12;
const MAX_E          = 10;

// Nucleus cluster slot positions (up to 22 particles)
const NUCLEUS_SLOTS: Array<[number, number]> = [
  [0, 0], [0.48, 0.12], [-0.44, 0.16], [0.08, -0.52], [-0.12, 0.54],
  [0.52, -0.44], [-0.52, -0.36], [0.92, 0.08], [-0.88, 0.12], [0.20, 0.92],
  [-0.24, -0.88], [0.88, 0.56], [-0.84, 0.52], [0.56, -0.84], [-0.52, -0.80],
  [0.0, -0.96], [0.96, -0.20], [-0.96, -0.16], [0.36, 1.02], [-0.40, 1.0],
  [0.64, 0.84], [-0.60, -0.88],
];

// Electron orbital slot positions
function orbitalSlots(r: number, n: number): Array<[number, number]> {
  return Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n;
    return [r * Math.cos(a), r * Math.sin(a)] as [number, number];
  });
}
const SHELL1_SLOTS = orbitalSlots(SHELL1_R, 2);
const SHELL2_SLOTS = orbitalSlots(SHELL2_R, 8);

export interface AtomCount {
  protons:   number;
  neutrons:  number;
  electrons: number;
}

export interface BuildAtomMeshes {
  count:          AtomCount;
  labelTexture:   DynamicTexture;
  labelPlane:     Mesh;
  protonMeshes:   Mesh[];
  neutronMeshes:  Mesh[];
  electronMeshes: Mesh[];
}

// ── Materials ────────────────────────────────────────────────────────────────
function makeMat(name: string, color: Color3, emissive: Color3, scene: Scene): StandardMaterial {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor  = color;
  m.emissiveColor = emissive;
  m.specularColor = new Color3(0.3, 0.3, 0.3);
  return m;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function dist2(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

function nextFreeNucleusSlot(meshes: BuildAtomMeshes): [number, number] | null {
  const occupied = new Set<number>();
  [...meshes.protonMeshes, ...meshes.neutronMeshes].forEach(m => {
    if (!isTray(m)) {
      const best = closestSlotIndex(m.position.x, m.position.y, NUCLEUS_SLOTS);
      occupied.add(best);
    }
  });
  for (let i = 0; i < NUCLEUS_SLOTS.length; i++) {
    if (!occupied.has(i)) return NUCLEUS_SLOTS[i];
  }
  return null;
}

function closestSlotIndex(x: number, y: number, slots: Array<[number, number]>): number {
  let best = 0, bd = Infinity;
  slots.forEach(([sx, sy], i) => {
    const d = dist2(x, y, sx, sy);
    if (d < bd) { bd = d; best = i; }
  });
  return best;
}

function isTray(mesh: Mesh): boolean {
  return (mesh.metadata as { inTray: boolean }).inTray;
}

function getOccupiedElectronSlots(meshes: BuildAtomMeshes): Set<string> {
  const occ = new Set<string>();
  meshes.electronMeshes.forEach(m => {
    if (!isTray(m)) {
      const allSlots = [...SHELL1_SLOTS, ...SHELL2_SLOTS];
      const bi = closestSlotIndex(m.position.x, m.position.y, allSlots);
      occ.add(`${bi}`);
    }
  });
  return occ;
}

function nextFreeElectronSlot(meshes: BuildAtomMeshes): [number, number] | null {
  const occ = getOccupiedElectronSlots(meshes);
  const allSlots = [...SHELL1_SLOTS, ...SHELL2_SLOTS];
  for (let i = 0; i < allSlots.length; i++) {
    if (!occ.has(`${i}`)) return allSlots[i];
  }
  return null;
}

// ── Scene setup ──────────────────────────────────────────────────────────────
export function setupBuildAtomScene(scene: Scene): BuildAtomMeshes {
  scene.clearColor = new Color4(0.05, 0.06, 0.10, 1);

  const frontLight = new PointLight('ba_frontLight', new Vector3(0, 0, 14), scene);
  frontLight.intensity = 1.8;
  frontLight.diffuse   = new Color3(1, 1, 1);
  frontLight.specular  = new Color3(0.4, 0.4, 0.4);

  const protonMat   = makeMat('ba_pMat', new Color3(0.95, 0.25, 0.2),  new Color3(0.72, 0.08, 0.05), scene);
  const neutronMat  = makeMat('ba_nMat', new Color3(0.65, 0.68, 0.72), new Color3(0.48, 0.50, 0.54), scene);
  const electronMat = makeMat('ba_eMat', new Color3(0.25, 0.55, 1.0),  new Color3(0.12, 0.38, 0.88), scene);

  // Nucleus zone ring
  const nucRingMat = new StandardMaterial('ba_nucRing', scene);
  nucRingMat.diffuseColor  = new Color3(0.4, 0.4, 0.5);
  nucRingMat.emissiveColor = new Color3(0.22, 0.22, 0.32);
  nucRingMat.wireframe = false;
  nucRingMat.alpha = 0.35;
  const nucZone = MeshBuilder.CreateDisc('ba_nucZone', { radius: NUCLEUS_SNAP_R, tessellation: 48 }, scene);
  nucZone.material = nucRingMat;
  nucZone.position.z = 0.02;
  nucZone.isPickable = false;

  // Orbital rings
  function makeRing(r: number, name: string) {
    const mat = new StandardMaterial(name, scene);
    mat.diffuseColor  = new Color3(0.3, 0.55, 0.8);
    mat.emissiveColor = new Color3(0.08, 0.22, 0.48);
    mat.alpha = 0.5;
    const ring = MeshBuilder.CreateTorus(name + '_mesh', { diameter: r * 2, thickness: 0.06, tessellation: 64 }, scene);
    ring.material = mat;
    ring.rotation.x = Math.PI / 2;
    ring.isPickable = false;
    return ring;
  }
  makeRing(SHELL1_R, 'ba_s1');
  makeRing(SHELL2_R, 'ba_s2');

  // Tray labels
  function makeTrayLabel(text: string, x: number, scene: Scene) {
    const tex = new DynamicTexture(`ba_tl_${text}`, { width: 128, height: 48 }, scene);
    const mat = new StandardMaterial(`ba_tlm_${text}`, scene);
    mat.diffuseTexture = tex; mat.emissiveColor = Color3.White(); mat.disableLighting = true; mat.backFaceCulling = false;
    const plane = MeshBuilder.CreatePlane(`ba_tlp_${text}`, { width: 1.5, height: 0.55 }, scene);
    plane.material = mat; plane.position.set(x, TRAY_Y_START + 0.75, 0);
    const ctx = tex.getContext();
    ctx.fillStyle = 'transparent'; tex.clear();
    ctx.font = 'bold 22px sans-serif'; ctx.fillStyle = '#aabbcc';
    ctx.fillText(text, 10, 34); tex.update();
    plane.isPickable = false;
  }
  makeTrayLabel('Протони', TRAY_P_X + 0.5, scene);
  makeTrayLabel('Нейтрони', TRAY_N_X + 0.6, scene);
  makeTrayLabel('Електрони', TRAY_E_X - 0.5, scene);

  const meshes: BuildAtomMeshes = {
    count: { protons: 0, neutrons: 0, electrons: 0 },
    labelTexture: null!,
    labelPlane: null!,
    protonMeshes: [],
    neutronMeshes: [],
    electronMeshes: [],
  };

  // ── Create draggable particles ────────────────────────────────────────────
  function makeDraggable(
    mesh: Mesh,
    trayPos: Vector3,
    type: 'proton' | 'neutron' | 'electron',
  ) {
    mesh.metadata = { inTray: true };
    mesh.position.copyFrom(trayPos);

    const drag = new PointerDragBehavior({ dragPlaneNormal: Vector3.Forward() });
    drag.useObjectOrientationForDragging = false;
    mesh.addBehavior(drag);

    drag.onDragEndObservable.add(() => {
      const x = mesh.position.x, y = mesh.position.y;
      mesh.position.z = 0;

      if (type === 'proton' || type === 'neutron') {
        const d = dist2(x, y, 0, 0);
        if (d < NUCLEUS_SNAP_R) {
          // snap into nucleus
          const slot = nextFreeNucleusSlot(meshes);
          if (slot) {
            mesh.position.set(slot[0], slot[1], 0);
            (mesh.metadata as { inTray: boolean }).inTray = false;
          } else {
            mesh.position.copyFrom(trayPos); // full
            (mesh.metadata as { inTray: boolean }).inTray = true;
          }
        } else {
          mesh.position.copyFrom(trayPos);
          (mesh.metadata as { inTray: boolean }).inTray = true;
        }
      } else {
        // electron: check shells
        const d = dist2(x, y, 0, 0);
        const onShell1 = Math.abs(d - SHELL1_R) < SHELL_SNAP_W;
        const onShell2 = Math.abs(d - SHELL2_R) < SHELL_SNAP_W;
        if (onShell1 || onShell2) {
          const candidates = onShell1 ? SHELL1_SLOTS : SHELL2_SLOTS;
          const allSlots = [...SHELL1_SLOTS, ...SHELL2_SLOTS];
          const occ = getOccupiedElectronSlots(meshes);
          // find nearest free slot on the target shell
          let bestSlot: [number, number] | null = null;
          let bestDist = Infinity;
          candidates.forEach((s, li) => {
            const gi = onShell1 ? li : SHELL1_SLOTS.length + li;
            if (!occ.has(`${gi}`)) {
              const dd = dist2(x, y, s[0], s[1]);
              if (dd < bestDist) { bestDist = dd; bestSlot = s; }
            }
          });
          void allSlots;
          if (bestSlot) {
            mesh.position.set((bestSlot as [number,number])[0], (bestSlot as [number,number])[1], 0);
            (mesh.metadata as { inTray: boolean }).inTray = false;
          } else {
            mesh.position.copyFrom(trayPos);
            (mesh.metadata as { inTray: boolean }).inTray = true;
          }
        } else {
          mesh.position.copyFrom(trayPos);
          (mesh.metadata as { inTray: boolean }).inTray = true;
        }
      }
      updateCount(meshes);
      updateLabel(meshes);
    });
  }

  // Protons
  for (let i = 0; i < MAX_P; i++) {
    const m = MeshBuilder.CreateSphere(`ba_p${i}`, { diameter: 0.44, segments: 8 }, scene);
    m.material = protonMat;
    const tray = new Vector3(TRAY_P_X, TRAY_Y_START - i * TRAY_Y_STEP, 0);
    makeDraggable(m, tray, 'proton');
    meshes.protonMeshes.push(m);
  }

  // Neutrons
  for (let i = 0; i < MAX_N; i++) {
    const m = MeshBuilder.CreateSphere(`ba_n${i}`, { diameter: 0.44, segments: 8 }, scene);
    m.material = neutronMat;
    const tray = new Vector3(TRAY_N_X, TRAY_Y_START - i * TRAY_Y_STEP, 0);
    makeDraggable(m, tray, 'neutron');
    meshes.neutronMeshes.push(m);
  }

  // Electrons
  for (let i = 0; i < MAX_E; i++) {
    const m = MeshBuilder.CreateSphere(`ba_e${i}`, { diameter: 0.28, segments: 8 }, scene);
    m.material = electronMat;
    const tray = new Vector3(TRAY_E_X, TRAY_Y_START - i * TRAY_Y_STEP, 0);
    makeDraggable(m, tray, 'electron');
    meshes.electronMeshes.push(m);
  }

  // Info label panel
  const labelTex = new DynamicTexture('ba_labelTex', { width: 512, height: 256 }, scene);
  const labelMat = new StandardMaterial('ba_labelMat', scene);
  labelMat.diffuseTexture = labelTex;
  labelMat.emissiveColor  = Color3.White();
  labelMat.disableLighting = true;
  labelMat.backFaceCulling = false;

  const labelPlane = MeshBuilder.CreatePlane('ba_label', { width: 4.0, height: 2.0 }, scene);
  labelPlane.material = labelMat;
  labelPlane.position.set(0, -4.5, 0);
  labelPlane.isPickable = false;

  meshes.labelTexture = labelTex;
  meshes.labelPlane   = labelPlane;

  updateLabel(meshes);
  return meshes;
}

// ── State helpers ─────────────────────────────────────────────────────────────
function updateCount(meshes: BuildAtomMeshes): void {
  meshes.count.protons   = meshes.protonMeshes.filter(m  => !isTray(m)).length;
  meshes.count.neutrons  = meshes.neutronMeshes.filter(m => !isTray(m)).length;
  meshes.count.electrons = meshes.electronMeshes.filter(m => !isTray(m)).length;
}

export function updateLabel(meshes: BuildAtomMeshes): void {
  const { protons, neutrons, electrons } = meshes.count;
  const el = ELEMENTS[Math.min(protons, ELEMENTS.length - 1)];
  const charge = protons - electrons;
  const mass   = protons + neutrons;
  const stable = protons > 0 && el.stableNeutrons.includes(neutrons);

  const ctx = meshes.labelTexture.getContext();
  meshes.labelTexture.clear();
  ctx.fillStyle = '#0d1020';
  ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = '#2a3560';
  ctx.lineWidth = 2;
  ctx.strokeRect(3, 3, 506, 250);

  // Element symbol (big)
  ctx.font = 'bold 80px serif';
  ctx.fillStyle = protons === 0 ? '#444' : '#f0f4ff';
  ctx.fillText(el.symbol, 30, 100);

  // Name
  ctx.font = 'bold 24px sans-serif';
  ctx.fillStyle = '#8899cc';
  ctx.fillText(el.nameUk, 30, 135);

  // Stats
  ctx.font = '20px monospace';
  ctx.fillStyle = '#e05050';
  ctx.fillText(`Протони: ${protons}`, 180, 70);
  ctx.fillStyle = '#a0a8b8';
  ctx.fillText(`Нейтрони: ${neutrons}`, 180, 100);
  ctx.fillStyle = '#4488ff';
  ctx.fillText(`Електрони: ${electrons}`, 180, 130);

  ctx.fillStyle = charge === 0 ? '#55ee88' : charge > 0 ? '#ffaa33' : '#ff6677';
  const chStr = charge === 0 ? 'нейтральний' : charge > 0 ? `+${charge}` : `${charge}`;
  ctx.fillText(`Заряд: ${chStr}`, 180, 160);

  ctx.fillStyle = '#aaaaaa';
  ctx.fillText(`Маса: ${mass}`, 180, 190);

  if (protons > 0) {
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = stable ? '#44ff88' : '#ff4444';
    ctx.fillText(stable ? '✓ Стабільний ізотоп' : '✗ Нестабільний', 30, 200);
  }

  meshes.labelTexture.update();
}
