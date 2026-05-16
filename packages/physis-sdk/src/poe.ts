import type { LocalizedString } from './localization.js';

export interface SliderConfig {
  min: number;
  max: number;
  labelLow: LocalizedString;
  labelHigh: LocalizedString;
}

export interface PredictionTarget {
  metricKey: string;
  label: LocalizedString;
  unit?: string;
  slider?: SliderConfig;
}
