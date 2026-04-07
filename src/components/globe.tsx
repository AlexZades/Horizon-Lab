"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';

const GLOBE_RADIUS = 2;
const ROTATION_SPEED = 0.08;
const RAINBOW = ['#ff4d6d', '#ff9f1c', '#ffe66d', '#2ec4b6', '#4cc9f0', '#7b61ff', '#f72585'];

export interface GlobePoint {
  id: string;
  lat: number;
  lng: number;
  type: 'server' | 'device';
  label: string;
  status?: 'online' | 'offline' | 'unknown';
  isHost?: boolean;
  activeServices?: string[];
}

export interface TrafficConnection {
  id: string;
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  kind: 'server' | 'client';
}

interface GlobeProps {
  points?: GlobePoint[];
  connections?: TrafficConnection[];
  className?: string;
}

function latLngToVector3(lat: number, lng: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function latLngToXYZ(lon: number, lat: number, radius: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  return [
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ];
}

function PointCloud({ pointCount = 2200 }: { pointCount?: number }) {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, colors } = useMemo(() => {
    const positionsArray = new Float32Array(pointCount * 3);
    const colorsArray = new Float32Array(pointCount * 3);

    for (let index = 0; index < pointCount; index += 1) {
      const y = 1 - (index / (pointCount - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = ((Math.sqrt(5) - 1) / 2) * index * Math.PI * 2;

      positionsArray[index * 3] = Math.cos(theta) * radiusAtY * GLOBE_RADIUS;
      positionsArray[index * 3 + 1] = y * GLOBE_RADIUS;
      positionsArray[index * 3 + 2] = Math.sin(theta) * radiusAtY * GLOBE_RADIUS;

      const color = new THREE.Color(RAINBOW[index % RAINBOW.length]).multiplyScalar(0.7);
      colorsArray[index * 3] = color.r;
      colorsArray[index * 3 + 1] = color.g;
      colorsArray[index * 3 + 2] = color.b;
    }

    return { positions: positionsArray, colors: colorsArray };
  }, [pointCount]);

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.018} vertexColors transparent opacity={0.55} sizeAttenuation />
    </points>
  );
}

function WireframeSphere() {
  return (
    <lineSegments>
      <edgesGeometry args={[new THREE.SphereGeometry(GLOBE_RADIUS - 0.02, 26, 18)]} />
      <lineBasicMaterial color="#ffffff" transparent opacity={0.06} />
    </lineSegments>
  );
}

function ContinentOutlines() {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);

  useEffect(() => {
    let mounted = true;

    void import('world-atlas/land-110m.json').then((topoData) => {
      if (!mounted) {
        return;
      }

      const topo = topoData.default as unknown as Topology<{ land: GeometryCollection }>;
      const landGeo = feature(topo, topo.objects.land) as
        | Feature<Geometry, GeoJsonProperties>
        | FeatureCollection<Geometry, GeoJsonProperties>;

      const segments: number[] = [];
      const features = landGeo.type === 'FeatureCollection' ? landGeo.features : [landGeo];

      for (const item of features) {
        const geometryItem = item.geometry;
        if (!geometryItem) continue;

        const polygons =
          geometryItem.type === 'Polygon'
            ? [geometryItem.coordinates]
            : geometryItem.type === 'MultiPolygon'
              ? geometryItem.coordinates
              : [];

        for (const polygon of polygons) {
          for (const ring of polygon) {
            for (let index = 0; index < ring.length - 1; index += 1) {
              const [lon1, lat1] = ring[index];
              const [lon2, lat2] = ring[index + 1];

              if (Math.abs(lon2 - lon1) > 90) continue;

              const [x1, y1, z1] = latLngToXYZ(lon1, lat1, GLOBE_RADIUS + 0.01);
              const [x2, y2, z2] = latLngToXYZ(lon2, lat2, GLOBE_RADIUS + 0.01);
              segments.push(x1, y1, z1, x2, y2, z2);
            }
          }
        }
      }

      const outlineGeometry = new THREE.BufferGeometry();
      outlineGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(segments), 3));
      setGeometry(outlineGeometry);
    });

    return () => {
      mounted = false;
    };
  }, []);

  if (!geometry) {
    return null;
  }

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#ffffff" transparent opacity={0.16} />
    </lineSegments>
  );
}

function getPointColor(point: GlobePoint) {
  if (point.type === 'device') return '#86efac';
  if (point.status === 'offline') return '#5a0f16';
  if (point.isHost) return '#b794f4';
  if (point.status === 'unknown') return '#f5c76d';
  return '#9bd2ff';
}

function GlobeMarker({
  point,
  hovered,
  setHovered,
}: {
  point: GlobePoint;
  hovered: boolean;
  setHovered: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  const pulseRef = useRef<THREE.Mesh>(null);
  const position = useMemo(() => latLngToVector3(point.lat, point.lng, GLOBE_RADIUS + 0.06), [point.lat, point.lng]);
  const tooltipPosition = position;
  const color = getPointColor(point);
  const size = point.type === 'device' ? 0.0275 : point.isHost ? 0.045 : 0.0375;

  useFrame((state) => {
    if (!pulseRef.current) {
      return;
    }

    const scale = 1 + Math.sin(state.clock.elapsedTime * 2.5) * 0.22;
    pulseRef.current.scale.setScalar(scale);
  });

  return (
    <group>
      <mesh
        position={position}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(point.id);
        }}
        onPointerOut={(event) => {
          event.stopPropagation();
          setHovered(null);
        }}
      >
        <sphereGeometry args={[size, 18, 18]} />
        <meshBasicMaterial color={color} />
      </mesh>

      <mesh ref={pulseRef} position={position}>
        <sphereGeometry args={[size * (point.isHost ? 2.8 : 2.4), 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={point.status === 'offline' ? 0.18 : 0.12} />
      </mesh>

      {hovered ? (
        <Html position={tooltipPosition} distanceFactor={8} style={{ pointerEvents: 'none', transform: 'scale(0.25) translate(40px, -50%)', transformOrigin: 'left center' }}>
          <div className="min-w-[160px] rounded-xl border border-white/10 bg-black/80 px-2.5 py-2 text-white shadow-[0_0_24px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
              <div className="text-[11px] font-semibold leading-tight">{point.label}</div>
              {point.isHost ? (
                <span className="rounded-full border border-purple-400/20 bg-purple-500/10 px-1.5 py-px text-[7px] uppercase tracking-[0.14em] text-purple-200">
                  Host
                </span>
              ) : null}
            </div>

            {point.type === 'server' ? (
              <>
                <p className="mt-1 text-[8px] uppercase tracking-[0.18em] text-muted-foreground">
                  Active services
                </p>
                {point.activeServices && point.activeServices.length > 0 ? (
                  <ul className="mt-1 space-y-0.5 text-[9px] text-slate-200">
                    {point.activeServices.map((serviceName) => (
                      <li key={serviceName} className="flex items-center gap-1.5">
                        <span className="h-1 w-1 rounded-full bg-emerald-400" />
                        <span>{serviceName}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-[9px] text-muted-foreground">No active services.</p>
                )}
              </>
            ) : (
              <p className="mt-1 text-[9px] text-muted-foreground">Client location.</p>
            )}
          </div>
        </Html>
      ) : null}
    </group>
  );
}

function createArc(from: THREE.Vector3, to: THREE.Vector3) {
  const midpoint = from.clone().add(to).multiplyScalar(0.5).normalize();
  const distance = from.distanceTo(to);
  const elevatedMidpoint = midpoint.multiplyScalar(GLOBE_RADIUS + 0.25 + distance * 0.12);
  return new THREE.QuadraticBezierCurve3(from, elevatedMidpoint, to);
}

function TrafficStream({ connection }: { connection: TrafficConnection }) {
  const particleRefs = useRef<Array<THREE.Mesh | null>>([]);
  const particlesPerDirection = connection.kind === 'client' ? 3 : 2;
  const trailLength = 7;
  const speed = connection.kind === 'client' ? 0.09 : 0.07;
  const totalParticles = particlesPerDirection * 2;

  const curve = useMemo(() => {
    const from = latLngToVector3(connection.from.lat, connection.from.lng, GLOBE_RADIUS + 0.04);
    const to = latLngToVector3(connection.to.lat, connection.to.lng, GLOBE_RADIUS + 0.04);
    return createArc(from, to);
  }, [connection.from.lat, connection.from.lng, connection.to.lat, connection.to.lng]);

  const linePositions = useMemo(() => {
    const sampled = curve.getPoints(80);
    const flat: number[] = [];

    for (const point of sampled) {
      flat.push(point.x, point.y, point.z);
    }

    return new Float32Array(flat);
  }, [curve]);

  useFrame((state) => {
    const elapsed = state.clock.elapsedTime;

    for (let particleIndex = 0; particleIndex < totalParticles; particleIndex += 1) {
      const isReverse = particleIndex >= particlesPerDirection;
      const dirIndex = isReverse ? particleIndex - particlesPerDirection : particleIndex;

      for (let trailIndex = 0; trailIndex < trailLength; trailIndex += 1) {
        const refIndex = particleIndex * trailLength + trailIndex;
        const mesh = particleRefs.current[refIndex];
        if (!mesh) continue;

        let t = (elapsed * speed + dirIndex / particlesPerDirection - trailIndex * 0.02) % 1;
        if (t < 0) t += 1;

        // Reverse direction for the second group
        if (isReverse) t = 1 - t;

        const point = curve.getPointAt(t);
        const scale = trailIndex === 0 ? 1.1 : Math.max(0.3, 1 - trailIndex * 0.1);
        mesh.position.copy(point);
        mesh.scale.setScalar(scale);
      }
    }
  });

  return (
    <group>
      <line>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          color={connection.kind === 'client' ? '#4cc9f0' : '#8b5cf6'}
          transparent
          opacity={0.16}
        />
      </line>

      {Array.from({ length: totalParticles }).map((_, particleIndex) =>
        Array.from({ length: trailLength }).map((__, trailIndex) => {
          const refIndex = particleIndex * trailLength + trailIndex;
          const color = RAINBOW[(particleIndex + trailIndex) % RAINBOW.length];
          const opacity = trailIndex === 0 ? 0.95 : Math.max(0.16, 0.85 - trailIndex * 0.1);
          const radius = trailIndex === 0 ? 0.014 : Math.max(0.005, 0.012 - trailIndex * 0.001);

          return (
            <mesh
              key={`${connection.id}-${particleIndex}-${trailIndex}`}
              ref={(node) => {
                particleRefs.current[refIndex] = node;
              }}
            >
              <sphereGeometry args={[radius, 12, 12]} />
              <meshBasicMaterial color={color} transparent opacity={opacity} />
            </mesh>
          );
        })
      )}
    </group>
  );
}

function Scene({ points, connections }: { points: GlobePoint[]; connections: TrafficConnection[] }) {
  const rotationGroupRef = useRef<THREE.Group>(null);
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);

  useFrame((_, delta) => {
    if (!rotationGroupRef.current) {
      return;
    }

    rotationGroupRef.current.rotation.y += delta * ROTATION_SPEED;
  });

  return (
    <>
      <ambientLight intensity={0.8} />
      <pointLight position={[4, 3, 5]} intensity={1.6} color="#c084fc" />
      <pointLight position={[-4, -2, -3]} intensity={1.2} color="#38bdf8" />

      <group ref={rotationGroupRef}>
        <PointCloud />
        <WireframeSphere />
        <ContinentOutlines />
        {connections.map((connection) => (
          <TrafficStream key={connection.id} connection={connection} />
        ))}
        {points.map((point) => (
          <GlobeMarker
            key={point.id}
            point={point}
            hovered={hoveredPointId === point.id}
            setHovered={setHoveredPointId}
          />
        ))}
      </group>

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate={false}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={(3 * Math.PI) / 4}
      />
    </>
  );
}

export default function Globe({ points = [], connections = [], className }: GlobeProps) {
  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 0, 5.6], fov: 42 }} gl={{ alpha: true, antialias: true }}>
        <Scene points={points} connections={connections} />
      </Canvas>
    </div>
  );
}