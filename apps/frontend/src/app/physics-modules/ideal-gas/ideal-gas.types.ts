export interface IdealGasParams {
  particleCount: number; // N
  temperature: number;   // T (normalized: kT/m units → sets v_rms = sqrt(2T))
  boxWidth: number;      // W (physics units)
  boxHeight: number;     // H (physics units)
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface IdealGasState {
  particles: Particle[];
  pressure: number;
  avgSpeed: number;
  temperature: number;
}
