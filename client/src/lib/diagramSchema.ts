export interface CoordinateSystem {
  type: "cartesian" | "polar";
  xRange: [number, number];
  yRange: [number, number];
  zRange?: [number, number];
  showGrid: boolean;
  showAxes: boolean;
}

export type DiagramObject =
  | PointObject
  | VectorObject
  | LineObject
  | CircleObject
  | ArcObject
  | EquationObject
  | PlaneObject
  | CurveObject
  | FieldObject
  | AngleObject
  | AxisObject;

export interface PointObject {
  type: "point";
  position: [number, number, number?];
  label?: string;
  color?: string;
}

export interface VectorObject {
  type: "vector";
  from: [number, number, number?];
  to: [number, number, number?];
  label?: string;
  color?: string;
}

export interface LineObject {
  type: "line";
  from: [number, number, number?];
  to: [number, number, number?];
  label?: string;
  color?: string;
  dashed?: boolean;
}

export interface CircleObject {
  type: "circle";
  center: [number, number, number?];
  radius: number;
  label?: string;
  color?: string;
}

export interface ArcObject {
  type: "arc";
  center: [number, number, number?];
  radius: number;
  startAngle: number;
  endAngle: number;
  label?: string;
  color?: string;
}

export interface EquationObject {
  type: "equation";
  position: [number, number, number?];
  latex: string;
  fontSize?: number;
}

export interface PlaneObject {
  type: "plane";
  normal: [number, number, number];
  point: [number, number, number];
  size: number;
  color?: string;
  opacity?: number;
}

export interface CurveObject {
  type: "curve";
  points: [number, number, number?][];
  label?: string;
  color?: string;
}

export interface FieldObject {
  type: "field";
  fieldType: "vector" | "force";
  vectors: { from: [number, number, number?]; to: [number, number, number?] }[];
}

export interface AngleObject {
  type: "angle";
  vertex: [number, number];
  ray1End: [number, number];
  ray2End: [number, number];
  label?: string;
}

export interface AxisObject {
  type: "axis";
  direction: "x" | "y" | "z";
  label?: string;
  range: [number, number];
}

export interface DiagramSpec {
  title?: string;
  coordinateSystem?: CoordinateSystem;
  objects: DiagramObject[];
}

export function pos3(p: [number, number, number?]): [number, number, number] {
  return [p[0], p[1], p[2] ?? 0];
}
