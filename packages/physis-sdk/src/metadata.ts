import type { LocalizedString } from './localization.js';
import type { ParamSpec } from './params.js';
import type { FormulaSpec } from './formula.js';

export type PhysicsCategory = 'mechanics' | 'em' | 'waves' | 'thermo' | 'gravity';

export type RendererKind = '3d-babylon' | '2d-pixi';

export interface ModuleMetadata {
  id: string;
  name: LocalizedString;
  category: PhysicsCategory;
  description: LocalizedString;
  defaultParams: Record<string, ParamSpec>;
  renderer: RendererKind;
  educationalTopics: string[];
  difficulty: 'school' | 'university';
  formulas: FormulaSpec[];
}
