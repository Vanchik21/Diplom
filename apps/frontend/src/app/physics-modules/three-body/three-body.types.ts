export interface ThreeBodyParams {
  mass1: number;
  mass2: number;
  mass3: number;
  preset: number;      // 0 = figure-eight, 1 = hierarchical, 2 = chaotic
  timeScale: number;   // simulation speed multiplier
  softening: number;   // ε for gravitational softening
}

// Full 12-component state: [x1,y1,vx1,vy1, x2,y2,vx2,vy2, x3,y3,vx3,vy3]
export type ThreeBodyState12 = [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
];

export interface ThreeBodyRenderState {
  pos: [[number, number], [number, number], [number, number]];
  time: number;
}
