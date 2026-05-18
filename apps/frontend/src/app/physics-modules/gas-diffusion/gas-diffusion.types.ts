export interface GasDiffusionParams {
  particleCount: number; // N per species (total = 2N)
  temperature: number;   // normalized kT/m
  boxWidth: number;
  boxHeight: number;
  separated: number;     // 1 = start separated, 0 = start mixed
}

export interface DiffusionParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  species: 0 | 1;        // 0 = blue (left), 1 = red (right)
}

export interface GasDiffusionState {
  particles: DiffusionParticle[];
  concBlueLeft: number;  // fraction of blue in left half [0..1]
  concRedRight: number;  // fraction of red in right half [0..1]
  mixingIndex: number;   // 0 = fully separated, 1 = fully mixed
}
