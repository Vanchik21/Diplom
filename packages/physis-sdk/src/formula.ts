import type { LocalizedString } from './localization.js';

export interface FormulaSpec {
  id: string;
  label: LocalizedString;
  latex: string;
  variables?: Record<string, string>;
}
