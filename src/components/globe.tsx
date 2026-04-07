"use client";

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

// Pastel rainbow colors for the point cloud
const PASTEL_COLORS = [
  new THREE.Color("#FFB3BA"), // pastel red
  new THREE.Color("#FFDFBA"), // pastel orange
  new THREE.Color("#FFFFBA"), // pastel yellow
  new THREE.Color("#BAFFC9"), // pastel green
  new THREE.Color("#BAE1FF"), // pastel blue
  new THREE.Color("#D4BAFF"), // pastel purple
  new THREE.Color("#FFB3E6"), // pastel pink
];

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

interface GlobePoint {
  lat: number;
  lng: number;
  type: "server" | "device";
  label?: string;
}

function PointCloud({ pointCount = 2000 }: { pointCount?: number }) {
  const ref = useRef<THREE.Points>(null);

  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(pointCount * 3);
    const col = new Float32Array(pointCount * 3);
    const radius = 2;

    for (let i = 0; i < pointCount; i++) {
      // Fibonacci sphere for even distribution
      const y = 1 - (i / (pointCount - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = ((Math.sqrt(5) - 1) / 2) * i * Math.PI * 2;

      pos[i * 3] = Math.cos(theta) * radiusAtY * radius;
      pos[i * 3 + 1] = y * radius;
      pos[i * 3 + 2] = Math.sin(theta) * radiusAtY * radius;

      // Assign pastel rainbow color based on position
      const colorIndex = Math.floor(((y + 1) / 2) * (PASTEL_COLORS.length - 1));
      const nextIndex = Math.min(colorIndex + 1, PASTEL_COLORS.length - 1);
      const t = ((y + 1) / 2) * (PASTEL_COLORS.length - 1) - colorIndex;
      const color = PASTEL_COLORS[colorIndex].clone().lerp(PASTEL_COLORS[nextIndex], t);

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
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
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

function GlowingDot({
  position,
  color,
  size = 0.08,
}: {
  position: THREE.Vector3;
  color: string;
  size?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (glowRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.3;
      glowRef.current.scale.setScalar(scale);
    }
  });

  // Rotate with the globe
  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.08;
    }
  });

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
    </group>
  );
}

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

        {points.map((point, i) => {
          const pos = latLngToVector3(point.lat, point.lng, 2.05);
          const color = point.type === "server" ? "#BAE1FF" : "#BAFFC9";
          return (
            <GlowingDot
              key={`${point.type}-${i}`}
              position={pos}
              color={color}
              size={point.type === "server" ? 0.07 : 0.09}
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
