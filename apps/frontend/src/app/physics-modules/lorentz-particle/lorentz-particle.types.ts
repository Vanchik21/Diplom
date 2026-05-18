export interface LorentzParams {
  bField: number;      // B along Z axis (T), positive = out of screen
  eField: number;      // E along Y axis (V/m)
  qOverM: number;      // charge-to-mass ratio q/m (C/kg)
  initialVx: number;   // initial velocity x (m/s)
  initialVy: number;   // initial velocity y (m/s)
}

export interface LorentzState {
  x: number;
  y: number;
  vx: number;
  vy: number;
}
