export interface WaveInterferenceParams {
  wavelength: number;    // λ (cm) → converted to m in physics
  sourceDistance: number; // d between sources (cm)
  phaseDiff: number;     // Δφ (degrees)
  amplitude: number;     // A (relative, 1..3)
}

export interface WaveInterferenceState {
  time: number;
  frequency: number;     // f (Hz) — for display, set by wave speed assumption
  omega: number;
  kWave: number;         // k = 2π/λ
}
