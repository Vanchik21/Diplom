import type { LocalizedString } from './localization.js';

export type ParamSpec =
  | NumberParamSpec
  | Vector3ParamSpec
  | BooleanParamSpec
  | EnumParamSpec;

export interface NumberParamSpec {
  type: 'number';
  label: LocalizedString;
  unit?: string;
  default: number;
  min?: number;
  max?: number;
  step?: number;
}

export interface Vector3ParamSpec {
  type: 'vector3';
  label: LocalizedString;
  unit?: string;
  default: [number, number, number];
}

export interface BooleanParamSpec {
  type: 'boolean';
  label: LocalizedString;
  default: boolean;
}

export interface EnumParamSpec {
  type: 'enum';
  label: LocalizedString;
  default: unknown;
  options: Array<{ value: unknown; label: LocalizedString }>;
}
