import { Canvas, useThree } from "@react-three/fiber";
import { Environment, Html, Lightformer, OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { usePlanner } from "@/lib/planner/store";
import { WALL, sizeOf, statusMap } from "@/lib/planner/geometry";
import type { Cabinet, Space } from "@/lib/planner/types";

const WOOD = "#c19a6b";
const WOOD_DARK = "#a87f52";
const BAD = "#e05252";

type Bridge = { toSpace: (clientX: number, clientY: number) => { x: number; z: number } | null };

function DropBridge({
  bridge,
  floorYcm,
}: {
  bridge: React.MutableRefObject<Bridge | null>;
  floorYcm: number;
}) {
  const { camera, gl, raycaster } = useThree();
  useEffect(() => {
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -floorYcm / 100);
    bridge.current = {
      toSpace: (clientX, clientY) => {
        const rect = gl.domElement.getBoundingClientRect();
        const ndc = new THREE.Vector2(
          ((clientX - rect.left) / rect.width) * 2 - 1,
          -((clientY - rect.top) / rect.height) * 2 + 1,
        );
        raycaster.setFromCamera(ndc, camera);
        const hit = new THREE.Vector3();
        if (!raycaster.ray.intersectPlane(plane, hit)) return null;
        return { x: hit.x * 100, z: hit.z * 100 };
      },
    };
    return () => {
      bridge.current = null;
    };
  }, [bridge, camera, gl, raycaster, floorYcm]);
  return null;
}

function CameraRig({ cabinet }: { cabinet: Cabinet }) {
  const { camera } = useThree();
  useEffect(() => {
    const m = Math.max(cabinet.w, cabinet.h, cabinet.d) / 100;
    camera.position.set(m * 0.9, (cabinet.h / 100) * 0.9, m * 1.5);
    camera.lookAt(0, cabinet.h / 200, 0);
  }, [camera, cabinet.id, cabinet.w, cabinet.h, cabinet.d]);
  return null;
}

function CabinetMesh({ cabinet, onSelect }: { cabinet: Cabinet; onSelect: () => void }) {
  const { w, d, h } = cabinet;
  const panels: { size: [number, number, number]; pos: [number, number, number] }[] = [
    { size: [w, WALL, d], pos: [0, WALL / 2, 0] },
    { size: [w, WALL, d], pos: [0, h - WALL / 2, 0] },
    { size: [WALL, h - 2 * WALL, d], pos: [-w / 2 + WALL / 2, h / 2, 0] },
    { size: [WALL, h - 2 * WALL, d], pos: [w / 2 - WALL / 2, h / 2, 0] },
    { size: [w - 2 * WALL, h - 2 * WALL, WALL], pos: [0, h / 2, -d / 2 + WALL / 2] },
  ];
  return (
    <group
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {panels.map((p, i) => (
        <mesh key={i} position={p.pos} castShadow receiveShadow>
          <boxGeometry args={p.size} />
          <meshStandardMaterial color={i === 4 ? WOOD_DARK : WOOD} roughness={0.75} />
        </mesh>
      ))}
    </group>
  );
}

export function Scene3D() {
  const planner = usePlanner();
  const {
    activeCabinet: cabinet,
    activeSpace: space,
    activeLayout: layout,
    organizerMap,
    selection,
    setSelection,
    movePlacement,
    placeOrganizer,
  } = planner;

  const bridge = useRef<Bridge | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [orbitEnabled, setOrbitEnabled] = useState(true);

  const origin = useMemo(() => {
    if (!cabinet || !space) return new THREE.Vector3();
    return new THREE.Vector3(
      -cabinet.w / 2 + WALL + space.x,
      WALL + space.y,
      -cabinet.d / 2 + WALL + space.z,
    );
  }, [cabinet, space]);

  const statuses = useMemo(
    () => (layout && space ? statusMap(layout.placements, organizerMap, space) : {}),
    [layout, space, organizerMap],
  );

  // dragging an already placed organizer
  useEffect(() => {
    if (!dragId) return;
    const move = (ev: PointerEvent) => {
      const p = layout?.placements.find((it) => it.id === dragId);
      const o = p ? organizerMap[p.organizerId] : null;
      const hit = bridge.current?.toSpace(ev.clientX, ev.clientY);
      if (!p || !o || !hit) return;
      const s = sizeOf(o, p.rotation);
      movePlacement(dragId, hit.x - origin.x - s.w / 2, hit.z - origin.z - s.d / 2);
    };
    const up = () => {
      setDragId(null);
      setOrbitEnabled(true);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [dragId, layout, organizerMap, movePlacement, origin]);

  if (!cabinet || !space) {
    return (
      <div className="flex h-full items-center justify-center bg-viewport text-muted-foreground">
        <p className="text-sm">Create a cabinet to start planning.</p>
      </div>
    );
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const organizerId = e.dataTransfer.getData("text/organizer-id");
    const o = organizerMap[organizerId];
    if (!o) return;
    const hit = bridge.current?.toSpace(e.clientX, e.clientY);
    const cx = hit ? hit.x - origin.x : space.w / 2;
    const cz = hit ? hit.z - origin.z : space.d / 2;
    placeOrganizer(organizerId, cx - o.w / 2, cz - o.d / 2);
  };

  return (
    <div
      className="relative h-full w-full bg-viewport"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <Canvas shadows camera={{ position: [0.9, 0.9, 1.5], fov: 50 }}>
        <color attach="background" args={["#efe9e0"]} />
        <ambientLight intensity={0.55} />
        <directionalLight
          position={[2, 4, 3]}
          intensity={1.6}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <Environment>
          <Lightformer intensity={1.6} position={[0, 4, 1]} scale={[8, 8, 1]} />
          <Lightformer
            intensity={0.8}
            color="#cfe3ef"
            position={[-4, 1, 0]}
            rotation-y={Math.PI / 2}
            scale={[12, 3, 1]}
          />
        </Environment>

        <CameraRig cabinet={cabinet} />
        <DropBridge bridge={bridge} floorYcm={origin.y} />

        <mesh rotation-x={-Math.PI / 2} position={[0, -0.002, 0]} receiveShadow>
          <planeGeometry args={[8, 8]} />
          <meshStandardMaterial color="#e3dacb" roughness={1} />
        </mesh>
        <gridHelper args={[8, 40, "#d3c7b5", "#dfd5c6"]} />

        <group scale={0.01} onPointerMissed={() => setSelection(null)}>
          <CabinetMesh
            cabinet={cabinet}
            onSelect={() => setSelection({ kind: "cabinet", id: cabinet.id })}
          />

          {/* usable interior volume outline */}
          <mesh position={[origin.x + space.w / 2, origin.y + space.h / 2, origin.z + space.d / 2]}>
            <boxGeometry args={[space.w, space.h, space.d]} />
            <meshBasicMaterial color="#6b8fa3" wireframe transparent opacity={0.25} />
          </mesh>

          {(layout?.placements ?? []).map((p) => {
            const o = organizerMap[p.organizerId];
            if (!o) return null;
            const s = sizeOf(o, p.rotation);
            const st = statuses[p.id];
            const bad = st ? !st.fits || st.collides : false;
            const selected = selection?.kind === "placement" && selection.id === p.id;
            return (
              <group
                key={p.id}
                position={[
                  origin.x + p.x + s.w / 2,
                  origin.y + p.y + s.h / 2,
                  origin.z + p.z + s.d / 2,
                ]}
              >
                <mesh
                  castShadow
                  receiveShadow
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setSelection({ kind: "placement", id: p.id });
                    setDragId(p.id);
                    setOrbitEnabled(false);
                  }}
                >
                  <boxGeometry args={[s.w, s.h, s.d]} />
                  <meshStandardMaterial
                    color={bad ? BAD : o.color}
                    roughness={0.4}
                    metalness={0.05}
                    transparent
                    opacity={bad ? 0.85 : 1}
                    emissive={selected ? "#ffffff" : "#000000"}
                    emissiveIntensity={selected ? 0.18 : 0}
                  />
                </mesh>
                <lineSegments>
                  <edgesGeometry args={[new THREE.BoxGeometry(s.w, s.h, s.d)]} />
                  <lineBasicMaterial color={selected ? "#1f2937" : "#6b7280"} />
                </lineSegments>
                {selected && (
                  <Html center distanceFactor={1.4} position={[0, s.h / 2 + 4, 0]}>
                    <div className="pointer-events-none whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background shadow">
                      {o.name} · {s.w}×{s.d}×{s.h} cm
                    </div>
                  </Html>
                )}
              </group>
            );
          })}
        </group>

        <OrbitControls
          enabled={orbitEnabled}
          enablePan
          makeDefault
          target={[0, cabinet.h / 200, 0]}
          minDistance={0.3}
          maxDistance={8}
          maxPolarAngle={Math.PI / 2.05}
        />
      </Canvas>

      <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-card/90 px-3 py-2 text-xs text-muted-foreground shadow">
        Drag an organizer card into the cabinet · drag a box to move it · right-drag to pan ·
        scroll to zoom
      </div>
    </div>
  );
}
