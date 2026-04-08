"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';

const GLOBE_RADIUS = 2;
const ROTATION_SPEED = 0.08;
const RAINBOW = ['#ff4d6d', '#ff9f1c', '#ffe66d', '#2ec4b6', '#4cc9f0', '#7b61ff', '#f72585'];

// Zoom thresholds
const ZOOM_SHOW_SATELLITES = 3.8; // Camera distance below which satellites appear
const ZOOM_SHOW_DETAILS = 3.0;   // Camera distance below which satellite details appear
const ZOOM_MIN_DISTANCE = 2.4;
const ZOOM_MAX_DISTANCE = 8.0;
const DEFAULT_CAMERA_DISTANCE = 5.6;

// Satellite inclination categories (like satellitemap.space)
type InclinationCategory = 'equatorial' | 'low' | 'medium' | 'high' | 'retrograde';

interface SatelliteData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  altitude: number; // km
  speed: number; // km/h
  inclination: InclinationCategory;
  noradId: number;
}

const INCLINATION_COLORS: Record<InclinationCategory, string> = {
  equatorial: '#ff3333',
  low: '#ff8833',
  medium: '#cccc33',
  high: '#33cc33',
  retrograde: '#5555ff',
};

const INCLINATION_LABELS: Record<InclinationCategory, { label: string; range: string }> = {
  equatorial: { label: 'Equatorial', range: '0°-10°' },
  low: { label: 'Low', range: '10°-60°' },
  medium: { label: 'Medium', range: '60°-80°' },
  high: { label: 'High', range: '80°-100°' },
  retrograde: { label: 'Retrograde', range: '100°-180°' },
};

// Generate realistic-looking satellite data distributed around the globe
function generateSatelliteData(count: number, seed: number = 42): SatelliteData[] {
  const satellites: SatelliteData[] = [];
  const rng = createSeededRandom(seed);

  const constellations = [
    { prefix: 'Starlink', count: Math.floor(count * 0.55), inclinationBias: 'medium' as InclinationCategory, altRange: [340, 570] },
    { prefix: 'OneWeb', count: Math.floor(count * 0.12), inclinationBias: 'high' as InclinationCategory, altRange: [1200, 1250] },
    { prefix: 'GPS', count: Math.floor(count * 0.03), inclinationBias: 'medium' as InclinationCategory, altRange: [20180, 20220] },
    { prefix: 'Iridium', count: Math.floor(count * 0.02), inclinationBias: 'high' as InclinationCategory, altRange: [780, 790] },
    { prefix: 'COSMOS', count: Math.floor(count * 0.08), inclinationBias: 'low' as InclinationCategory, altRange: [400, 1500] },
    { prefix: 'SAT', count: Math.floor(count * 0.2), inclinationBias: 'equatorial' as InclinationCategory, altRange: [200, 2000] },
  ];

  let globalId = 0;
  for (const constellation of constellations) {
    for (let i = 0; i < constellation.count; i++) {
      const lat = (rng() * 2 - 1) * 80; // -80 to 80
      const lng = rng() * 360 - 180;
      const alt = constellation.altRange[0] + rng() * (constellation.altRange[1] - constellation.altRange[0]);
      const speed = 25000 + rng() * 5000;

      // Assign inclination with bias
      let inclination: InclinationCategory;
      const roll = rng();
      if (roll < 0.5) {
        inclination = constellation.inclinationBias;
      } else if (roll < 0.7) {
        inclination = 'low';
      } else if (roll < 0.85) {
        inclination = 'medium';
      } else if (roll < 0.95) {
        inclination = 'high';
      } else {
        inclination = rng() > 0.5 ? 'equatorial' : 'retrograde';
      }

      satellites.push({
        id: `sat-${globalId}`,
        name: `${constellation.prefix} ${1000 + globalId}`,
        lat,
        lng,
        altitude: Math.round(alt),
        speed: Math.round(speed),
        inclination,
        noradId: 40000 + globalId,
      });
      globalId++;
    }
  }

  return satellites;
}

function createSeededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export interface GlobePoint {
  id: string;
  lat: number;
  lng: number;
  type: 'server' | 'device';
  label: string;
  status?: 'online' | 'offline' | 'unknown';
  isHost?: boolean;
  activeServices?: string[];
  offlineServices?: string[];
  dotColorOnline?: string;
  dotColorOffline?: string;
  dotSizeMultiplier?: number;
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
  onZoomChange?: (zoomLevel: number, cameraDistance: number) => void;
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
  if (point.status === 'offline') return point.dotColorOffline ?? '#5a0f16';
  if (point.isHost) return '#b794f4';
  if (point.status === 'unknown') return '#f5c76d';
  return point.dotColorOnline ?? '#9bd2ff';
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
  const color = getPointColor(point);
  const sizeMultiplier = point.dotSizeMultiplier ?? 1;
  const size = (point.type === 'device' ? 0.0275 : point.isHost ? 0.045 : 0.0375) * sizeMultiplier;

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
        <Html
          position={position}
          distanceFactor={8}
          center
          style={{
            pointerEvents: 'none',
            transform: 'translate(0, -100%)',
          }}
        >
          <div className="min-w-[160px] max-w-[220px] rounded-xl border border-white/10 bg-black/80 px-2.5 py-2 text-white shadow-[0_0_24px_rgba(0,0,0,0.45)] backdrop-blur-xl" style={{ fontSize: '10px' }}>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
              <div className="font-semibold leading-tight" style={{ fontSize: '11px' }}>{point.label}</div>
              {point.isHost ? (
                <span className="shrink-0 rounded-full border border-purple-400/20 bg-purple-500/10 px-1.5 py-px uppercase tracking-[0.14em] text-purple-200" style={{ fontSize: '7px' }}>
                  Host
                </span>
              ) : null}
            </div>

            {point.type === 'server' ? (
              <>
                {point.activeServices && point.activeServices.length > 0 ? (
                  <>
                    <p className="mt-1.5 uppercase tracking-[0.18em] text-muted-foreground" style={{ fontSize: '8px' }}>
                      Online services
                    </p>
                    <ul className="mt-0.5 space-y-0.5 text-slate-200" style={{ fontSize: '9px' }}>
                      {point.activeServices.map((serviceName) => (
                        <li key={serviceName} className="flex items-center gap-1.5">
                          <span className="h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                          <span className="truncate">{serviceName}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}

                {point.offlineServices && point.offlineServices.length > 0 ? (
                  <>
                    <p className="mt-1.5 uppercase tracking-[0.18em] text-muted-foreground" style={{ fontSize: '8px' }}>
                      Offline services
                    </p>
                    <ul className="mt-0.5 space-y-0.5 text-slate-200" style={{ fontSize: '9px' }}>
                      {point.offlineServices.map((serviceName) => (
                        <li key={serviceName} className="flex items-center gap-1.5">
                          <span className="h-1 w-1 shrink-0 rounded-full bg-red-400" />
                          <span className="truncate">{serviceName}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}

                {(!point.activeServices || point.activeServices.length === 0) &&
                 (!point.offlineServices || point.offlineServices.length === 0) ? (
                  <p className="mt-1 text-muted-foreground" style={{ fontSize: '9px' }}>No services assigned.</p>
                ) : null}
              </>
            ) : (
              <p className="mt-1 text-muted-foreground" style={{ fontSize: '9px' }}>Client location.</p>
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

// Satellite dot that orbits slightly above the globe surface
function SatelliteDot({
  satellite,
  showDetails,
  hovered,
  setHovered,
}: {
  satellite: SatelliteData;
  showDetails: boolean;
  hovered: boolean;
  setHovered: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  // Satellites orbit slightly above the globe surface
  const altitudeScale = 0.02 + Math.min(satellite.altitude / 40000, 0.08);
  const orbitRadius = GLOBE_RADIUS + altitudeScale;

  const position = useMemo(
    () => latLngToVector3(satellite.lat, satellite.lng, orbitRadius),
    [satellite.lat, satellite.lng, orbitRadius]
  );

  const color = INCLINATION_COLORS[satellite.inclination];
  const dotSize = 0.018;

  useFrame((state) => {
    if (glowRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 3 + satellite.noradId) * 0.3;
      glowRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group>
      <mesh
        ref={meshRef}
        position={position}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(satellite.id);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(null);
        }}
      >
        <sphereGeometry args={[dotSize, 8, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>

      <mesh ref={glowRef} position={position}>
        <sphereGeometry args={[dotSize * 2.5, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.15} />
      </mesh>

      {hovered && showDetails ? (
        <Html
          position={position}
          distanceFactor={6}
          center
          style={{ pointerEvents: 'none', transform: 'translate(0, -120%)' }}
        >
          <div className="min-w-[180px] rounded-lg border border-white/15 bg-black/90 px-3 py-2 text-white shadow-[0_0_20px_rgba(0,0,0,0.6)] backdrop-blur-xl" style={{ fontSize: '10px' }}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold" style={{ color, fontSize: '12px' }}>{satellite.name}</span>
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-[8px] text-white/60">
                NORAD {satellite.noradId}
              </span>
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[9px]">
              <div className="text-white/50">Speed</div>
              <div className="text-right font-mono">{satellite.speed.toLocaleString()} km/h</div>
              <div className="text-white/50">Altitude</div>
              <div className="text-right font-mono">{satellite.altitude.toLocaleString()} km</div>
              <div className="text-white/50">Lat</div>
              <div className="text-right font-mono">{satellite.lat.toFixed(2)}°</div>
              <div className="text-white/50">Lng</div>
              <div className="text-right font-mono">{satellite.lng.toFixed(2)}°</div>
              <div className="text-white/50">Inclination</div>
              <div className="text-right capitalize" style={{ color }}>{satellite.inclination}</div>
            </div>
          </div>
        </Html>
      ) : null}

      {/* Show name label near the dot when zoomed in enough */}
      {showDetails && !hovered ? (
        <Html
          position={position}
          distanceFactor={6}
          center
          style={{ pointerEvents: 'none', transform: 'translate(14px, -4px)' }}
        >
          <div className="whitespace-nowrap text-[7px] font-mono text-white/40">
            •{satellite.noradId}
          </div>
        </Html>
      ) : null}
    </group>
  );
}

// Manages satellite visibility based on camera distance and which are in view
function SatelliteLayer({
  satellites,
  cameraDistance,
}: {
  satellites: SatelliteData[];
  cameraDistance: number;
}) {
  const [hoveredSatId, setHoveredSatId] = useState<string | null>(null);
  const { camera } = useThree();

  const showSatellites = cameraDistance < ZOOM_SHOW_SATELLITES;
  const showDetails = cameraDistance < ZOOM_SHOW_DETAILS;

  // Filter satellites to only show those roughly facing the camera
  const visibleSatellites = useMemo(() => {
    if (!showSatellites) return [];

    const cameraDir = camera.position.clone().normalize();
    // Show more satellites as we zoom in
    const dotThreshold = cameraDistance < 3.0 ? -0.2 : 0.1;

    return satellites.filter((sat) => {
      const satPos = latLngToVector3(sat.lat, sat.lng, GLOBE_RADIUS).normalize();
      return satPos.dot(cameraDir) > dotThreshold;
    });
  }, [showSatellites, satellites, camera.position, cameraDistance]);

  if (!showSatellites) return null;

  return (
    <group>
      {visibleSatellites.map((sat) => (
        <SatelliteDot
          key={sat.id}
          satellite={sat}
          showDetails={showDetails}
          hovered={hoveredSatId === sat.id}
          setHovered={setHoveredSatId}
        />
      ))}
    </group>
  );
}

// Tracks camera distance and reports it
function CameraTracker({ onDistanceChange }: { onDistanceChange: (d: number) => void }) {
  const { camera } = useThree();
  const lastReported = useRef(DEFAULT_CAMERA_DISTANCE);

  useFrame(() => {
    const dist = camera.position.length();
    // Only report if changed significantly to avoid excessive re-renders
    if (Math.abs(dist - lastReported.current) > 0.05) {
      lastReported.current = dist;
      onDistanceChange(dist);
    }
  });

  return null;
}

function Scene({
  points,
  connections,
  satellites,
  onZoomChange,
}: {
  points: GlobePoint[];
  connections: TrafficConnection[];
  satellites: SatelliteData[];
  onZoomChange?: (zoomLevel: number, cameraDistance: number) => void;
}) {
  const rotationGroupRef = useRef<THREE.Group>(null);
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);
  const [cameraDistance, setCameraDistance] = useState(DEFAULT_CAMERA_DISTANCE);
  const controlsRef = useRef<any>(null);

  // Slow down / stop auto-rotation when zoomed in
  const isZoomedIn = cameraDistance < ZOOM_SHOW_SATELLITES;

  const handleDistanceChange = useCallback(
    (dist: number) => {
      setCameraDistance(dist);
      if (onZoomChange) {
        // Normalize zoom: 0 = max distance, 1 = min distance
        const normalized = 1 - (dist - ZOOM_MIN_DISTANCE) / (ZOOM_MAX_DISTANCE - ZOOM_MIN_DISTANCE);
        onZoomChange(Math.max(0, Math.min(1, normalized)), dist);
      }
    },
    [onZoomChange]
  );

  useFrame((_, delta) => {
    if (!rotationGroupRef.current) {
      return;
    }

    // Reduce rotation speed when zoomed in
    const speedMultiplier = isZoomedIn ? 0.1 : 1;
    rotationGroupRef.current.rotation.y += delta * ROTATION_SPEED * speedMultiplier;
  });

  return (
    <>
      <ambientLight intensity={0.8} />
      <pointLight position={[4, 3, 5]} intensity={1.6} color="#c084fc" />
      <pointLight position={[-4, -2, -3]} intensity={1.2} color="#38bdf8" />

      <CameraTracker onDistanceChange={handleDistanceChange} />

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
        <SatelliteLayer satellites={satellites} cameraDistance={cameraDistance} />
      </group>

      <OrbitControls
        ref={controlsRef}
        enableZoom={true}
        enablePan={false}
        autoRotate={false}
        minDistance={ZOOM_MIN_DISTANCE}
        maxDistance={ZOOM_MAX_DISTANCE}
        zoomSpeed={0.8}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={(5 * Math.PI) / 6}
        // Smooth damping for nice feel
        enableDamping={true}
        dampingFactor={0.08}
      />
    </>
  );
}

// Pre-generate satellite data once
const SATELLITE_DATA = generateSatelliteData(800);

// Compute distribution stats
const SATELLITE_STATS = (() => {
  const counts: Record<InclinationCategory, number> = {
    equatorial: 0,
    low: 0,
    medium: 0,
    high: 0,
    retrograde: 0,
  };
  for (const sat of SATELLITE_DATA) {
    counts[sat.inclination]++;
  }
  return { total: SATELLITE_DATA.length, counts };
})();

export default function Globe({ points = [], connections = [], className, onZoomChange }: GlobeProps) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0, DEFAULT_CAMERA_DISTANCE], fov: 42 }}
        gl={{ alpha: true, antialias: true }}
      >
        <Scene
          points={points}
          connections={connections}
          satellites={SATELLITE_DATA}
          onZoomChange={onZoomChange}
        />
      </Canvas>
    </div>
  );
}

// Export for use in the overlay UI
export { INCLINATION_COLORS, INCLINATION_LABELS, SATELLITE_STATS, ZOOM_SHOW_SATELLITES, ZOOM_SHOW_DETAILS };
export type { InclinationCategory };
