import type { LocalizedString } from './localization.js';

export interface PredictionTarget {
  metricKey: string;
  label: LocalizedString;
  unit?: string;
}
