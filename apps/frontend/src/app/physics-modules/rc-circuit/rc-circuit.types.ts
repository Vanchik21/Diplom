export interface RcCircuitParams {
  resistance: number;   // R (Ω)
  capacitance: number;  // C (mF → stored as mF, converted in physics)
  emf: number;          // EMF (V)
  mode: number;         // 0 = charge, 1 = discharge
}

export interface RcCircuitState {
  voltage: number;      // U_C (V)
  current: number;      // I (mA)
  charge: number;       // Q (μC)
  tau: number;          // τ = RC (s)
  fillFraction: number; // 0..1 for visual
  time: number;         // simulation time (s) for particle animation
}
