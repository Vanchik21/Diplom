export interface Collision2DParams {
  mass1: number;
  mass2: number;
  velocity1: number;
  velocity2: number;
  impactParameter: number;
  restitution: number;
}

export interface Collision2DState {
  pos1: [number, number];
  pos2: [number, number];
  vel1: [number, number];
  vel2: [number, number];
  radius1: number;
  radius2: number;
  collided: boolean;
}
