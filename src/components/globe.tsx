"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Billboard } from "@react-three/drei";
import * as THREE from "three";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { Feature, FeatureCollection, Geometry, GeoJsonProperties } from "geojson";

// Pastel rainbow colors for the point cloud
const PASTEL_COLORS = [
  new THREE.Color("#FFB3BA"),
  new THREE.Color("#FFDFBA"),
  new THREE.Color("#FFFFBA"),
  new THREE.Color("#BAFFC9"),
  new THREE.Color("#BAE1FF"),
  new THREE.Color("#D4BAFF"),
  new THREE.Color("#FFB3E6"),
];

function latLngToVector3(
  lat: number,
  lng: number,
  radius: number
): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function latLngToXYZ(
  lon: number,
  lat: number,
  radius: number
): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return [
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ];
}

interface GlobePoint {
  lat: number;
  lng: number;
  type: "server" | "device";
  label?: string;
}

// --- Continent Outlines ---

function ContinentOutlines({ radius = 2.01 }: { radius?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);

  useEffect(() => {
    // Dynamically import the TopoJSON data
    import("world-atlas/land-110m.json").then((topoData) => {
      const topo = topoData.default as unknown as Topology<{
        land: GeometryCollection;
      }>;
      const landGeo = feature(topo, topo.objects.land) as
        | Feature<Geometry, GeoJsonProperties>
        | FeatureCollection<Geometry, GeoJsonProperties>;

      // Collect all line segments as pairs of vertices
      const segments: number[] = [];

      const features: Feature<Geometry, GeoJsonProperties>[] =
        landGeo.type === "FeatureCollection"
          ? landGeo.features
          : [landGeo];

      for (const f of features) {
        const geom = f.geometry;
        if (!geom) continue;

        const polygons =
          geom.type === "Polygon"
            ? [geom.coordinates]
            : geom.type === "MultiPolygon"
            ? geom.coordinates
            : [];

        for (const polygon of polygons) {
          for (const ring of polygon) {
            for (let i = 0; i < ring.length - 1; i++) {
              const [lon1, lat1] = ring[i];
              const [lon2, lat2] = ring[i + 1];

              // Skip segments that cross the antimeridian (large lon gap)
              if (Math.abs(lon2 - lon1) > 90) continue;

              const [x1, y1, z1] = latLngToXYZ(lon1, lat1, radius);
              const [x2, y2, z2] = latLngToXYZ(lon2, lat2, radius);
              segments.push(x1, y1, z1, x2, y2, z2);
            }
          }
        }
      }

      const positions = new Float32Array(segments);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3)
      );
      setGeometry(geo);
    });
  }, [radius]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.08;
    }
  });

  if (!geometry) return null;

  return (
    <group ref={groupRef}>
      <lineSegments geometry={geometry}>
        <lineBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.18}
        />
      </lineSegments>
    </group>
  );
}

// --- Point Cloud ---

function PointCloud({ pointCount = 2000 }: { pointCount?: number }) {
  const ref = useRef<THREE.Points>(null);

  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(pointCount * 3);
    const col = new Float32Array(pointCount * 3);
    const radius = 2;

    for (let i = 0; i < pointCount; i++) {
      const y = 1 - (i / (pointCount - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = ((Math.sqrt(5) - 1) / 2) * i * Math.PI * 2;

      pos[i * 3] = Math.cos(theta) * radiusAtY * radius;
      pos[i * 3 + 1] = y * radius;
      pos[i * 3 + 2] = Math.sin(theta) * radiusAtY * radius;

      const colorIndex = Math.floor(
        ((y + 1) / 2) * (PASTEL_COLORS.length - 1)
      );
      const nextIndex = Math.min(colorIndex + 1, PASTEL_COLORS.length - 1);
      const t =
        ((y + 1) / 2) * (PASTEL_COLORS.length - 1) - colorIndex;
      const color = PASTEL_COLORS[colorIndex]
        .clone()
        .lerp(PASTEL_COLORS[nextIndex], t);

      col[i * 3] = color.r;
      col[i * 3 + 1] = color.g;
      col[i * 3 + 2] = color.b;
    }

    return { positions: pos, colors: col };
  }, [pointCount]);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.08;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        vertexColors
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

// --- Wireframe ---

function WireframeGlobe() {
  const ref = useRef<THREE.LineSegments>(null);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.08;
    }
  });

  return (
    <lineSegments ref={ref}>
      <edgesGeometry args={[new THREE.SphereGeometry(1.98, 24, 16)]} />
      <lineBasicMaterial color="#ffffff" transparent opacity={0.04} />
    </lineSegments>
  );
}

// --- Glowing Dot ---

function GlowingDot({
  position,
  color,
  size = 0.08,
  label,
}: {
  position: THREE.Vector3;
  color: string;
  size?: number;
  label?: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (glowRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.3;
      glowRef.current.scale.setScalar(scale);
    }
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.08;
    }
  });

  // Compute a position slightly above the dot for the label
  const labelPosition = useMemo(() => {
    const dir = position.clone().normalize();
    return position.clone().add(dir.multiplyScalar(0.15));
  }, [position]);

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} position={position}>
        <sphereGeometry args={[size, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh ref={glowRef} position={position}>
        <sphereGeometry args={[size * 2.5, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.15} />
      </mesh>
      {label && (
        <Billboard position={labelPosition}>
          <Text
            fontSize={0.08}
            color="#ffffff"
            anchorX="center"
            anchorY="bottom"
            outlineWidth={0.004}
            outlineColor="#000000"
          >
            {label}
          </Text>
        </Billboard>
      )}
    </group>
  );
}

// --- Main Globe ---

interface GlobeProps {
  points?: GlobePoint[];
  className?: string;
}

export default function Globe({ points = [], className }: GlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className={className}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        style={{ background: "transparent" }}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.5} />
        <PointCloud />
        <WireframeGlobe />
        <ContinentOutlines />

        {points.map((point, i) => {
          const pos = latLngToVector3(point.lat, point.lng, 2.05);
          const color = point.type === "server" ? "#BAE1FF" : "#BAFFC9";
          return (
            <GlowingDot
              key={`${point.type}-${i}`}
              position={pos}
              color={color}
              size={point.type === "server" ? 0.04 : 0.05}
              label={point.label}
            />
          );
        })}

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate={false}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={(3 * Math.PI) / 4}
        />
      </Canvas>
    </div>
  );
}