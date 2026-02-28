import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, Html, Line } from "@react-three/drei";
import * as THREE from "three";
import katex from "katex";
import type { OrbitControls as OrbitControlsType } from "three-stdlib";
import type {
  DiagramSpec,
  DiagramObject,
  PointObject,
  VectorObject,
  LineObject,
  CircleObject,
  ArcObject,
  EquationObject,
  PlaneObject,
  CurveObject,
  FieldObject,
  AngleObject,
  AxisObject,
} from "../lib/diagramSchema";
import { pos3 } from "../lib/diagramSchema";
import { useDiagramState } from "../hooks/useDiagramState";

// -- KaTeX label component: renders any string through KaTeX if it looks like math --

function KatexLabel({
  text,
  position,
  color = "#ffffff",
  fontSize = 14,
}: {
  text: string;
  position: [number, number, number];
  color?: string;
  fontSize?: number;
}) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(text, {
        throwOnError: false,
        displayMode: false,
      });
    } catch {
      return text;
    }
  }, [text]);

  return (
    <Html position={position} style={{ userSelect: "none", pointerEvents: "none" }}>
      <div
        dangerouslySetInnerHTML={{ __html: html }}
        style={{
          color,
          fontSize,
          whiteSpace: "nowrap",
          background: "rgba(0,0,0,0.4)",
          padding: "2px 6px",
          borderRadius: 3,
        }}
      />
    </Html>
  );
}

// -- Individual object renderers --

function PointMesh({ obj }: { obj: PointObject }) {
  const p = pos3(obj.position);
  return (
    <group position={p}>
      <mesh>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color={obj.color || "#ffffff"} />
      </mesh>
      {obj.label && (
        <KatexLabel text={obj.label} position={[0.15, 0.15, 0]} color={obj.color || "#fff"} />
      )}
    </group>
  );
}

function VectorArrow({ obj }: { obj: VectorObject }) {
  const from = pos3(obj.from);
  const to = pos3(obj.to);
  const dir = new THREE.Vector3(...to).sub(new THREE.Vector3(...from));
  const length = dir.length();
  const dirNorm = dir.clone().normalize();
  const color = obj.color || "#ff4444";

  return (
    <group>
      <arrowHelper args={[dirNorm, new THREE.Vector3(...from), length, color, length * 0.15, length * 0.08]} />
      {obj.label && (
        <KatexLabel text={obj.label} position={[(from[0] + to[0]) / 2, (from[1] + to[1]) / 2 + 0.3, (from[2] + to[2]) / 2]} color={color} fontSize={13} />
      )}
    </group>
  );
}

function LineMesh({ obj }: { obj: LineObject }) {
  const from = pos3(obj.from);
  const to = pos3(obj.to);
  const color = obj.color || "#ffffff";

  return (
    <group>
      <Line
        points={[from, to]}
        color={color}
        lineWidth={2}
        dashed={obj.dashed || false}
        dashSize={0.2}
        gapSize={0.1}
      />
      {obj.label && (
        <KatexLabel text={obj.label} position={[(from[0] + to[0]) / 2, (from[1] + to[1]) / 2 + 0.2, (from[2] + to[2]) / 2]} color={color} fontSize={13} />
      )}
    </group>
  );
}

function CircleMesh({ obj }: { obj: CircleObject }) {
  const center = pos3(obj.center);
  const color = obj.color || "#ffffff";
  const segments = 64;
  const points: [number, number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    points.push([
      center[0] + Math.cos(angle) * obj.radius,
      center[1] + Math.sin(angle) * obj.radius,
      center[2],
    ]);
  }

  return (
    <group>
      <Line points={points} color={color} lineWidth={2} />
      {obj.label && (
        <KatexLabel text={obj.label} position={[center[0], center[1] + obj.radius + 0.3, center[2]]} color={color} fontSize={13} />
      )}
    </group>
  );
}

function ArcMesh({ obj }: { obj: ArcObject }) {
  const center = pos3(obj.center);
  const color = obj.color || "#ffaa00";
  const segments = 32;
  const points: [number, number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = obj.startAngle + (i / segments) * (obj.endAngle - obj.startAngle);
    points.push([
      center[0] + Math.cos(angle) * obj.radius,
      center[1] + Math.sin(angle) * obj.radius,
      center[2],
    ]);
  }

  return (
    <group>
      <Line points={points} color={color} lineWidth={2} />
      {obj.label && (
        <KatexLabel
          text={obj.label}
          position={[
            center[0] + Math.cos((obj.startAngle + obj.endAngle) / 2) * (obj.radius + 0.3),
            center[1] + Math.sin((obj.startAngle + obj.endAngle) / 2) * (obj.radius + 0.3),
            center[2],
          ]}
          color={color}
          fontSize={12}
        />
      )}
    </group>
  );
}

function EquationMesh({ obj }: { obj: EquationObject }) {
  const p = pos3(obj.position);
  return (
    <KatexLabel text={obj.latex} position={p} color="#ffffff" fontSize={obj.fontSize || 16} />
  );
}

function PlaneMesh({ obj }: { obj: PlaneObject }) {
  const color = obj.color || "#4488ff";
  const opacity = obj.opacity ?? 0.3;
  const normal = new THREE.Vector3(...obj.normal).normalize();
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);

  return (
    <mesh position={obj.point} quaternion={quat}>
      <planeGeometry args={[obj.size, obj.size]} />
      <meshStandardMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} />
    </mesh>
  );
}

function CurveMesh({ obj }: { obj: CurveObject }) {
  const color = obj.color || "#00ff88";
  const points = obj.points.map((p) => pos3(p));

  return (
    <group>
      <Line points={points} color={color} lineWidth={2} />
      {obj.label && points.length > 0 && (
        <KatexLabel text={obj.label} position={pos3(obj.points[Math.floor(obj.points.length / 2)])} color={color} fontSize={13} />
      )}
    </group>
  );
}

function FieldMesh({ obj }: { obj: FieldObject }) {
  const color = obj.fieldType === "force" ? "#ff4444" : "#4488ff";
  return (
    <group>
      {obj.vectors.map((v, i) => {
        const from = pos3(v.from);
        const to = pos3(v.to);
        const dir = new THREE.Vector3(...to).sub(new THREE.Vector3(...from));
        const length = dir.length();
        const dirNorm = dir.clone().normalize();
        return (
          <arrowHelper key={i} args={[dirNorm, new THREE.Vector3(...from), length, color, length * 0.2, length * 0.1]} />
        );
      })}
    </group>
  );
}

function AngleMesh({ obj }: { obj: AngleObject }) {
  const vertex = obj.vertex;
  const r = 0.4;
  const a1 = Math.atan2(obj.ray1End[1] - vertex[1], obj.ray1End[0] - vertex[0]);
  const a2 = Math.atan2(obj.ray2End[1] - vertex[1], obj.ray2End[0] - vertex[0]);
  const segments = 20;
  const points: [number, number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = a1 + (i / segments) * (a2 - a1);
    points.push([vertex[0] + Math.cos(angle) * r, vertex[1] + Math.sin(angle) * r, 0]);
  }

  return (
    <group>
      <Line points={[pos3([...obj.ray1End, 0] as [number, number, number]), [vertex[0], vertex[1], 0], pos3([...obj.ray2End, 0] as [number, number, number])]} color="#ffaa00" lineWidth={1.5} />
      <Line points={points} color="#ffaa00" lineWidth={1.5} />
      {obj.label && (
        <KatexLabel text={obj.label} position={[vertex[0] + Math.cos((a1 + a2) / 2) * (r + 0.3), vertex[1] + Math.sin((a1 + a2) / 2) * (r + 0.3), 0]} color="#ffaa00" fontSize={12} />
      )}
    </group>
  );
}

function AxisMesh({ obj }: { obj: AxisObject }) {
  const color = obj.direction === "x" ? "#ff4444" : obj.direction === "y" ? "#44ff44" : "#4444ff";
  const from: [number, number, number] = [0, 0, 0];
  const to: [number, number, number] = [0, 0, 0];
  const idx = obj.direction === "x" ? 0 : obj.direction === "y" ? 1 : 2;
  from[idx] = obj.range[0];
  to[idx] = obj.range[1];
  const dir = new THREE.Vector3(...to).sub(new THREE.Vector3(...from));
  const length = dir.length();
  const dirNorm = dir.clone().normalize();

  return (
    <group>
      <arrowHelper args={[dirNorm, new THREE.Vector3(...from), length, color, 0.2, 0.1]} />
      {obj.label && (
        <KatexLabel text={obj.label} position={to} color={color} fontSize={13} />
      )}
    </group>
  );
}

// -- Object dispatcher --

function DiagramObjectRenderer({ obj }: { obj: DiagramObject }) {
  switch (obj.type) {
    case "point": return <PointMesh obj={obj} />;
    case "vector": return <VectorArrow obj={obj} />;
    case "line": return <LineMesh obj={obj} />;
    case "circle": return <CircleMesh obj={obj} />;
    case "arc": return <ArcMesh obj={obj} />;
    case "equation": return <EquationMesh obj={obj} />;
    case "plane": return <PlaneMesh obj={obj} />;
    case "curve": return <CurveMesh obj={obj} />;
    case "field": return <FieldMesh obj={obj} />;
    case "angle": return <AngleMesh obj={obj} />;
    case "axis": return <AxisMesh obj={obj} />;
    default: return null;
  }
}

// -- Camera controller driven by hand gestures --

function CameraController() {
  const controlsRef = useRef<OrbitControlsType>(null);
  const handDetected = useDiagramState((s) => s.handDetected);
  const handCommand = useDiagramState((s) => s.handCommand);
  const { camera } = useThree();

  useFrame(() => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;
    controls.minDistance = 2;
    controls.maxDistance = 30;

    const gesture = handCommand.gesture;

    if (handDetected && gesture === "fist") {
      // Fist + move = pan on XZ ground plane (horizontal)
      // Camera right vector projected onto XZ for left/right
      const right = new THREE.Vector3();
      right.setFromMatrixColumn(camera.matrixWorld, 0);
      right.y = 0;
      right.normalize();

      // Camera forward projected onto XZ for forward/back
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();

      const panSpeed = 15;
      const moveRight = -handCommand.dx * panSpeed;  // negate for mirrored webcam
      const moveForward = -handCommand.dy * panSpeed; // up on screen = forward

      const offset = right.multiplyScalar(moveRight).add(forward.multiplyScalar(moveForward));
      camera.position.add(offset);
      controls.target.add(offset);
      controls.update();
    } else if (handDetected && gesture === "pinch") {
      // Pinch up/down = elevation (Y axis)
      const elevSpeed = 12;
      const elevDelta = -handCommand.dy * elevSpeed;
      const elevOffset = new THREE.Vector3(0, elevDelta, 0);
      camera.position.add(elevOffset);
      controls.target.add(elevOffset);

      // Pinch hand tilt/rotation = orbit around target
      const orbitSpeed = 3;
      const angleDelta = handCommand.dAngle * orbitSpeed;

      if (Math.abs(angleDelta) > 0.001) {
        // Rotate camera position around the target on the XZ plane
        const offset = camera.position.clone().sub(controls.target);
        const cosA = Math.cos(angleDelta);
        const sinA = Math.sin(angleDelta);
        const newX = offset.x * cosA - offset.z * sinA;
        const newZ = offset.x * sinA + offset.z * cosA;
        offset.x = newX;
        offset.z = newZ;
        camera.position.copy(controls.target).add(offset);
      }

      controls.update();
    }
    // Open hand or no hand = OrbitControls via mouse/trackpad
  });

  return <OrbitControls ref={controlsRef} enableDamping dampingFactor={0.1} />;
}

// -- Coordinate system grid + axes --

function CoordinateSystemGrid({ spec }: { spec: DiagramSpec }) {
  const cs = spec.coordinateSystem;
  if (!cs) return null;

  const xSize = cs.xRange[1] - cs.xRange[0];
  const ySize = cs.yRange[1] - cs.yRange[0];
  const gridSize = Math.max(xSize, ySize);

  return (
    <group>
      {cs.showGrid && (
        <Grid
          args={[gridSize, gridSize]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#555555"
          sectionSize={5}
          sectionThickness={1.5}
          sectionColor="#888888"
          fadeDistance={50}
          infiniteGrid
        />
      )}
    </group>
  );
}

// -- Scene content --

function SceneContent() {
  const diagram = useDiagramState((s) => s.diagram);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} />
      <CameraController />
      {diagram && <CoordinateSystemGrid spec={diagram} />}
      {diagram?.objects.map((obj, i) => (
        <DiagramObjectRenderer key={`${obj.type}-${i}`} obj={obj} />
      ))}
      {!diagram && (
        <Grid
          args={[20, 20]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#555555"
          sectionSize={5}
          sectionThickness={1.5}
          sectionColor="#888888"
          fadeDistance={50}
          infiniteGrid
        />
      )}
    </>
  );
}

// -- Main canvas --

export default function DiagramCanvas() {
  return (
    <Canvas
      camera={{ position: [6, 6, 6], fov: 50 }}
      style={{ width: "100%", height: "100%" }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={["#0a0a0f"]} />
      <SceneContent />
    </Canvas>
  );
}
