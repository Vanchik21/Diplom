import {
  Scene,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  DynamicTexture,
  Color3,
  Vector3,
  TransformNode,
  AxesViewer,
  TrailMesh,
  AbstractMesh,
} from '@babylonjs/core';

export interface VectorArrowOptions {
  color?: Color3;
  shaftDiameter?: number;
  headDiameter?: number;
  name?: string;
}

export function createVectorArrow(scene: Scene, options: VectorArrowOptions = {}): TransformNode {
  const {
    color = Color3.Red(),
    shaftDiameter = 0.03,
    headDiameter = 0.08,
    name = 'arrow',
  } = options;

  const root = new TransformNode(name, scene);

  const mat = new StandardMaterial(`${name}Mat`, scene);
  mat.diffuseColor = color;
  mat.emissiveColor = color.scale(0.6);

  const shaft = MeshBuilder.CreateCylinder(`${name}Shaft`, {
    height: 1,
    diameter: shaftDiameter,
    tessellation: 8,
  }, scene);
  shaft.position.y = 0.5;
  shaft.material = mat;
  shaft.parent = root;

  const head = MeshBuilder.CreateCylinder(`${name}Head`, {
    height: 0.2,
    diameterBottom: headDiameter,
    diameterTop: 0,
    tessellation: 8,
  }, scene);
  head.position.y = 1.1;
  head.material = mat;
  head.parent = root;

  return root;
}

export interface TrailOptions {
  diameter?: number;
  length?: number;
}

export function createTrail(target: AbstractMesh, scene: Scene, options: TrailOptions = {}): TrailMesh {
  const { diameter = 0.04, length = 150 } = options;
  const trail = new TrailMesh('trail', target, scene, diameter, length, true);

  const mat = new StandardMaterial('trailMat', scene);
  mat.emissiveColor = new Color3(0.4, 0.5, 1);
  trail.material = mat;

  return trail;
}

export interface LabelOptions {
  fontSize?: number;
  color?: string;
  width?: number;
  height?: number;
}

export function createLabel(scene: Scene, text: string, position: Vector3, options: LabelOptions = {}): Mesh {
  const { fontSize = 28, color = '#e8eaf6', width = 2, height = 0.5 } = options;

  const plane = MeshBuilder.CreatePlane('label', { width, height }, scene);
  plane.position = position.clone();
  plane.billboardMode = Mesh.BILLBOARDMODE_ALL;

  const texWidth = 512;
  const texHeight = 128;
  const texture = new DynamicTexture('labelTex', { width: texWidth, height: texHeight }, scene, false);
  texture.drawText(text, null, null, `${fontSize}px sans-serif`, color, 'transparent', true);

  const mat = new StandardMaterial('labelMat', scene);
  mat.diffuseTexture = texture;
  mat.emissiveColor = Color3.White();
  mat.disableLighting = true;
  mat.useAlphaFromDiffuseTexture = true;
  plane.material = mat;

  return plane;
}

export interface CoordinateAxesOptions {
  size?: number;
}

export function createCoordinateAxes(scene: Scene, options: CoordinateAxesOptions = {}): AxesViewer {
  const { size = 1 } = options;
  return new AxesViewer(scene, size);
}

export interface GroundGridOptions {
  size?: number;
  subdivisions?: number;
}

export function createGroundGrid(scene: Scene, options: GroundGridOptions = {}): Mesh {
  const { size = 10, subdivisions = 10 } = options;

  const ground = MeshBuilder.CreateGround('ground', { width: size, height: size, subdivisions }, scene);

  const mat = new StandardMaterial('groundMat', scene);
  mat.diffuseColor = new Color3(0.12, 0.13, 0.18);
  mat.specularColor = Color3.Black();
  mat.wireframe = true;
  ground.material = mat;
  ground.isPickable = false;

  return ground;
}
