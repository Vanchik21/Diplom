export interface PendulumParams {
  length: number;
  mass: number;
  gravity: number;
  initialAngle: number;
  damping: number;
}

export interface PendulumState {
  theta: number;
  thetaDot: number;
  length: number;
  pivotWorld: [number, number, number];
  bobWorld: [number, number, number];
  velocity: [number, number, number];
}
