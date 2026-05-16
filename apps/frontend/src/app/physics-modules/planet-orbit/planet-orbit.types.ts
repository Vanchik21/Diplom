export interface PlanetOrbitParams {
  starMass: number;
  initialRadius: number;
  velocityFactor: number;
  timeScale: number;
}

export interface PlanetOrbitState {
  x: number;
  z: number;
  vx: number;
  vz: number;
  r: number;
  speed: number;
}
