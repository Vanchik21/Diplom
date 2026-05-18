import { ArcRotateCamera, Scene, Vector3 } from '@babylonjs/core';
import type { Metrics, ModuleMetadata, PhysicsModule, PredictionTarget } from '@physis/sdk';
import type { BabylonRenderable } from '../../rendering/babylon/babylon-renderable';
import {
  setupBuildAtomScene,
  updateLabel,
  type BuildAtomMeshes,
} from './build-atom.renderer';
import { ELEMENTS, type BuildAtomParams, type BuildAtomState } from './build-atom.types';

const META: ModuleMetadata = {
  id: 'build-atom',
  name: { uk: 'Конструктор атома', en: 'Build an Atom' },
  category: 'quantum',
  description: {
    uk: 'Інтерактивний конструктор атома. Перетягуй протони, нейтрони та електрони щоб будувати атоми від Гідрогену до Неону. Визначай елемент, ізотоп та заряд іона.',
    en: 'Interactive atom builder. Drag protons, neutrons and electrons to build atoms from Hydrogen to Neon. Identify the element, isotope and ionic charge.',
  },
  defaultParams: {
    maxProtons: {
      type: 'number',
      label: { uk: 'Макс. протонів', en: 'Max protons' },
      default: 10, min: 1, max: 10, step: 1,
    },
    maxNeutrons: {
      type: 'number',
      label: { uk: 'Макс. нейтронів', en: 'Max neutrons' },
      default: 12, min: 1, max: 12, step: 1,
    },
    maxElectrons: {
      type: 'number',
      label: { uk: 'Макс. електронів', en: 'Max electrons' },
      default: 10, min: 1, max: 10, step: 1,
    },
  },
  renderer: '3d-babylon',
  educationalTopics: [
    'atom', 'nucleus', 'electron', 'isotope', 'ion',
    'атом', 'ядро', 'електрон', 'ізотоп', 'іон', 'протон', 'нейтрон',
  ],
  difficulty: 'school',
  formulas: [
    {
      id: 'mass',
      label: { uk: 'Масове число', en: 'Mass number' },
      latex: String.raw`A = Z + N`,
    },
    {
      id: 'charge',
      label: { uk: 'Заряд іона', en: 'Ionic charge' },
      latex: String.raw`q = Z - n_e`,
    },
    {
      id: 'isotope',
      label: { uk: 'Позначення ізотопу', en: 'Isotope notation' },
      latex: String.raw`{}^{A}_{Z}\text{X}`,
    },
  ],
};

export class BuildAtomModule
  implements PhysicsModule<BuildAtomParams, BuildAtomState>, BabylonRenderable
{
  readonly meta: ModuleMetadata = META;

  private params: BuildAtomParams = { maxProtons: 10, maxNeutrons: 12, maxElectrons: 10 };
  private meshes: BuildAtomMeshes | null = null;
  private time = 0;

  private readonly history = { time: [] as number[] };

  init(params: BuildAtomParams): void {
    this.params = params;
    this.time = 0;
    this.history.time = [];
  }

  step(dt: number): void {
    this.time += dt;
    this.history.time.push(this.time);
  }

  getState(): BuildAtomState {
    const count = this.meshes?.count ?? { protons: 0, neutrons: 0, electrons: 0 };
    const { protons, neutrons, electrons } = count;
    const el = ELEMENTS[Math.min(protons, ELEMENTS.length - 1)];
    return {
      protons,
      neutrons,
      electrons,
      massNumber: protons + neutrons,
      charge: protons - electrons,
      elementSymbol: el.symbol,
      elementNameUk: el.nameUk,
      elementNameEn: el.nameEn,
      isStable: protons > 0 && el.stableNeutrons.includes(neutrons),
    };
  }

  getMetrics(): Metrics {
    const s = this.getState();
    return {
      scalars: {
        'Z (протони)': s.protons,
        'N (нейтрони)': s.neutrons,
        'nₑ (електрони)': s.electrons,
        'A (маса)': s.massNumber,
        'q (заряд)': s.charge,
        't (с)': this.time,
      },
      timeSeries: { time: this.history.time },
    };
  }

  getPredictionTargets(): PredictionTarget[] {
    return [
      {
        metricKey: 'Z (протони)',
        label: { uk: 'Кількість протонів (атомний номер Z)', en: 'Number of protons (atomic number Z)' },
        unit: '',
        slider: {
          min: 0,
          max: 10,
          labelLow: { uk: 'Водень (Z=1)', en: 'Hydrogen (Z=1)' },
          labelHigh: { uk: 'Неон (Z=10)', en: 'Neon (Z=10)' },
        },
      },
      {
        metricKey: 'A (маса)',
        label: { uk: 'Масове число A = Z + N', en: 'Mass number A = Z + N' },
        unit: '',
        slider: {
          min: 1,
          max: 22,
          labelLow: { uk: 'Легкий ізотоп', en: 'Light isotope' },
          labelHigh: { uk: 'Важкий ізотоп', en: 'Heavy isotope' },
        },
      },
    ];
  }

  getExplanation(predictions: Record<string, number>, locale = 'uk'): string {
    const s = this.getState();
    const predZ = Math.round(predictions['Z (протони)'] ?? 0);
    const errZ  = s.protons > 0 ? Math.abs(predZ - s.protons) : '—';

    if (locale === 'uk') {
      return (
        `Ти побудував атом ${s.elementNameUk} ($Z=${s.protons}$, $N=${s.neutrons}$, $A=${s.massNumber}$). ` +
        `${s.isStable ? 'Ізотоп **стабільний**.' : 'Ізотоп **нестабільний** — нейтрони не в нормі.'} ` +
        `Заряд іона $q=${s.charge > 0 ? '+' : ''}${s.charge}$ ` +
        `(${s.charge === 0 ? 'нейтральний атом' : s.charge > 0 ? 'катіон' : 'аніон'}). ` +
        `Передбачений $Z=${predZ}$, похибка: ${errZ}.`
      );
    }
    return (
      `You built a ${s.elementNameEn} atom ($Z=${s.protons}$, $N=${s.neutrons}$, $A=${s.massNumber}$). ` +
      `${s.isStable ? 'Isotope is **stable**.' : 'Isotope is **unstable** — neutron count out of range.'} ` +
      `Ionic charge $q=${s.charge > 0 ? '+' : ''}${s.charge}$ ` +
      `(${s.charge === 0 ? 'neutral atom' : s.charge > 0 ? 'cation' : 'anion'}). ` +
      `Predicted $Z=${predZ}$, error: ${errZ}.`
    );
  }

  reset(): void {
    this.init(this.params);
    if (this.meshes) {
      // Return all particles to tray
      [...this.meshes.protonMeshes, ...this.meshes.neutronMeshes, ...this.meshes.electronMeshes]
        .forEach(m => {
          (m.metadata as { inTray: boolean }).inTray = true;
          // Restore tray position stored in mesh name index
        });
      this.meshes.count = { protons: 0, neutrons: 0, electrons: 0 };
      updateLabel(this.meshes);
    }
  }

  dispose(): void {
    this.meshes = null;
  }

  babylonSetup(scene: Scene): void {
    const camera = scene.activeCamera as ArcRotateCamera | null;
    if (camera) {
      camera.target = new Vector3(0, -0.5, 0);
      camera.alpha  = -Math.PI / 2;
      camera.beta   = Math.PI / 2;
      camera.radius = 16;
      camera.lowerRadiusLimit = 10;
      camera.upperRadiusLimit = 24;
    }
    this.meshes = setupBuildAtomScene(scene);
  }

  babylonFrame(scene: Scene): void {
    void scene;
    if (this.meshes) {
      updateLabel(this.meshes);
    }
  }
}
