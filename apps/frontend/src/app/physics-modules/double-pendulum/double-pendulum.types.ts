export interface DoublePendulumParams {
  length1: number;
  length2: number;
  mass1: number;
  mass2: number;
  gravity: number;
  angle1: number;
  angle2: number;
  damping: number;
}

export interface DoublePendulumState {
  theta1: number;
  theta2: number;
  theta1Dot: number;
  theta2Dot: number;
  bob1World: [number, number, number];
  bob2World: [number, number, number];
}
