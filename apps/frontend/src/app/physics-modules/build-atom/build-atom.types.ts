export interface BuildAtomParams {
  maxProtons: number;
  maxNeutrons: number;
  maxElectrons: number;
}

export interface BuildAtomState {
  protons: number;
  neutrons: number;
  electrons: number;
  massNumber: number;
  charge: number;
  elementSymbol: string;
  elementNameUk: string;
  elementNameEn: string;
  isStable: boolean;
}

export interface ElementData {
  z: number;
  symbol: string;
  nameUk: string;
  nameEn: string;
  stableNeutrons: number[];
}

export const ELEMENTS: ElementData[] = [
  { z: 0,  symbol: '?',  nameUk: 'Невідомо',   nameEn: 'Unknown',    stableNeutrons: [] },
  { z: 1,  symbol: 'H',  nameUk: 'Гідроген',   nameEn: 'Hydrogen',   stableNeutrons: [0, 1, 2] },
  { z: 2,  symbol: 'He', nameUk: 'Гелій',      nameEn: 'Helium',     stableNeutrons: [1, 2] },
  { z: 3,  symbol: 'Li', nameUk: 'Літій',      nameEn: 'Lithium',    stableNeutrons: [3, 4] },
  { z: 4,  symbol: 'Be', nameUk: 'Берилій',    nameEn: 'Beryllium',  stableNeutrons: [5] },
  { z: 5,  symbol: 'B',  nameUk: 'Бор',        nameEn: 'Boron',      stableNeutrons: [5, 6] },
  { z: 6,  symbol: 'C',  nameUk: 'Карбон',     nameEn: 'Carbon',     stableNeutrons: [6, 7] },
  { z: 7,  symbol: 'N',  nameUk: 'Нітроген',   nameEn: 'Nitrogen',   stableNeutrons: [7, 8] },
  { z: 8,  symbol: 'O',  nameUk: 'Оксиген',    nameEn: 'Oxygen',     stableNeutrons: [8, 9, 10] },
  { z: 9,  symbol: 'F',  nameUk: 'Флуор',      nameEn: 'Fluorine',   stableNeutrons: [10] },
  { z: 10, symbol: 'Ne', nameUk: 'Неон',       nameEn: 'Neon',       stableNeutrons: [10, 11, 12] },
];
