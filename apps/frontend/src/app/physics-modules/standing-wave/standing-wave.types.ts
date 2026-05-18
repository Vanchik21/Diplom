export interface StandingWaveParams {
  tension: number;       // T (N)
  linearDensity: number; // μ (g/m) → converted to kg/m in physics
  harmonic: number;      // n = 1..6
  amplitude: number;     // A (cm) → converted to m in physics
}

export interface StandingWaveState {
  waveSpeed: number;     // v = √(T/μ) (m/s)
  frequency: number;     // f_n (Hz)
  wavelength: number;    // λ_n (m)
  omega: number;         // ω = 2πf (rad/s)
  time: number;
}
