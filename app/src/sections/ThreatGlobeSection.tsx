import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Activity, AlertTriangle, Globe, MapPin, Radio } from "lucide-react";
import { api, createSocket, getErrorMessage, type ThreatLocation, type ThreatMapData } from "@/lib/liveApi";

const emptyMap: ThreatMapData = { threatLocations: [], topThreatCountries: [], recentThreats: [] };

function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(-(radius * Math.sin(phi) * Math.cos(theta)), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta));
}

function GlobeMesh() {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (meshRef.current) meshRef.current.rotation.y += 0.001;
  });
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[2, 64, 64]} />
      <meshPhongMaterial color="#0c4a6e" transparent opacity={0.8} shininess={100} specular={new THREE.Color("#06b6d4")} />
    </mesh>
  );
}

function WireframeGlobe() {
  return <mesh><sphereGeometry args={[2.02, 32, 32]} /><meshBasicMaterial color="#06b6d4" wireframe transparent opacity={0.08} /></mesh>;
}

function AtmosphereGlow() {
  return <mesh><sphereGeometry args={[2.3, 32, 32]} /><meshBasicMaterial color="#06b6d4" transparent opacity={0.03} side={THREE.BackSide} /></mesh>;
}

function ThreatMarker({ location }: { location: ThreatLocation }) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);
  const lat = typeof location.lat === "number" ? location.lat : 0;
  const lon = typeof location.lon === "number" ? location.lon : 0;
  const position = useMemo(() => latLonToVector3(lat, lon, 2.05), [lat, lon]);
  const size = Math.min(0.08 + location.threats / 5000, 0.16);
  const isHighThreat = location.threats >= 10;

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const scale = 1 + Math.sin(clock.getElapsedTime() * 3 + location.threats) * 0.15;
      meshRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
        <sphereGeometry args={[size, 16, 16]} />
        <meshStandardMaterial color={isHighThreat ? "#ef4444" : "#f59e0b"} emissive={isHighThreat ? "#ef4444" : "#f59e0b"} emissiveIntensity={0.5} />
      </mesh>
      {hovered && (
        <Html distanceFactor={10}>
          <div className="glass rounded-lg px-3 py-2 whitespace-nowrap pointer-events-none">
            <div className="text-white font-semibold text-sm">{location.city || location.country}, {location.code || location.country}</div>
            <div className="text-red-400 text-xs"><AlertTriangle className="w-3 h-3 inline mr-1" />{location.threats} live threats</div>
          </div>
        </Html>
      )}
    </group>
  );
}

function ConnectionLines({ locations }: { locations: ThreatLocation[] }) {
  const positions = useMemo(() => {
    const valid = locations.filter((location) => typeof location.lat === "number" && typeof location.lon === "number").slice(0, 12);
    const pos: number[] = [];
    for (let index = 0; index < valid.length - 1; index += 1) {
      const current = valid[index];
      const next = valid[index + 1];
      const p1 = latLonToVector3(current.lat as number, current.lon as number, 2.05);
      const p2 = latLonToVector3(next.lat as number, next.lon as number, 2.05);
      pos.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
    }
    return new Float32Array(pos);
  }, [locations]);

  return (
    <lineSegments>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
      <lineBasicMaterial color="#06b6d4" transparent opacity={0.08} />
    </lineSegments>
  );
}

function Scene({ locations }: { locations: ThreatLocation[] }) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#06b6d4" />
      <pointLight position={[-10, -10, -10]} intensity={0.3} color="#3b82f6" />
      <GlobeMesh />
      <WireframeGlobe />
      <AtmosphereGlow />
      <ConnectionLines locations={locations} />
      {locations.filter((location) => typeof location.lat === "number" && typeof location.lon === "number").map((location) => <ThreatMarker key={`${location.code}-${location.city}`} location={location} />)}
      <OrbitControls enableZoom enablePan={false} autoRotate autoRotateSpeed={0.5} minDistance={4} maxDistance={10} />
    </>
  );
}

interface ThreatGlobeSectionProps {
  lowPerformanceMode?: boolean;
}

export default function ThreatGlobeSection({ lowPerformanceMode = false }: ThreatGlobeSectionProps) {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: false, margin: "200px" });
  const [mapData, setMapData] = useState<ThreatMapData>(emptyMap);
  const [error, setError] = useState<string | null>(null);

  const refreshMap = () => {
    api
      .get<ThreatMapData>("/api/threat-map")
      .then((response) => setMapData(response.data))
      .catch((requestError) => setError(getErrorMessage(requestError)));
  };

  useEffect(() => {
    refreshMap();
    const socket = createSocket();
    socket.on("ids-event", refreshMap);
    return () => {
      socket.disconnect();
    };
  }, []);

  const totalThreats = mapData.threatLocations.reduce((sum, location) => sum + location.threats, 0);

  return (
    <section id="threatmap" ref={sectionRef} className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-4"><Globe className="w-4 h-4 text-cyan-400" /><span className="text-sm font-mono text-cyan-400">LIVE THREAT MAP</span></div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">WORLDWIDE <span className="text-cyan-400">THREAT</span> INTELLIGENCE</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">Locations are aggregated from real IDS events with GeoIP data. Empty means no live threat geography has been observed.</p>
          {error && <p className="mt-4 text-red-300 text-sm">{error}</p>}
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={isInView ? { opacity: 1, scale: 1 } : {}} transition={{ duration: 0.8 }} className="lg:col-span-2 glass rounded-2xl overflow-hidden">
            <div className="h-[500px] lg:h-[600px] relative flex items-center justify-center">
              {!lowPerformanceMode && isInView ? (
                <Canvas camera={{ position: [0, 0, 6], fov: 45 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
                  <Scene locations={mapData.threatLocations} />
                </Canvas>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/20">
                  <div className="text-center p-6 glass rounded-2xl max-w-sm border border-cyan-500/10 shadow-[0_0_40px_rgba(6,182,212,0.05)]">
                    <Globe className="w-16 h-16 text-cyan-500/60 mx-auto mb-4 animate-[spin_10s_linear_infinite]" />
                    <h4 className="text-white font-mono text-sm font-semibold mb-2">INTELLIGENCE MAP DEACTIVATED</h4>
                    <p className="text-slate-400 text-xs">
                      {lowPerformanceMode
                        ? "WebGL globe disabled in Performance Mode. Toggle CPU icon in navbar to activate."
                        : "WebGL context suspended to preserve system resources. Scroll to view."}
                    </p>
                  </div>
                </div>
              )}
              <div className="absolute top-4 left-4 glass rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 mb-2"><Radio className="w-4 h-4 text-red-400" /><span className="text-sm font-medium text-white">Live Threat Feed</span></div>
                <div className="text-2xl font-bold text-white">{totalThreats.toLocaleString()}</div>
                <div className="text-xs text-slate-400">Geolocated threats</div>
              </div>
              {mapData.threatLocations.length === 0 && <div className="absolute inset-x-4 bottom-4 glass rounded-xl px-4 py-3 text-sm text-slate-400">No geolocated live threats yet.</div>}
            </div>
          </motion.div>

          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="glass rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><MapPin className="w-5 h-5 text-red-400" />Top Threat Sources</h3>
              {mapData.topThreatCountries.length === 0 ? <p className="text-sm text-slate-500">No country aggregates yet.</p> : (
                <div className="space-y-3">
                  {mapData.topThreatCountries.map((country, index) => <div key={`${country.code}-${country.city}`} className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/50"><div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs text-cyan-300">{country.code || "--"}</div><div className="flex-1"><div className="text-sm font-medium text-white">{country.country}</div><div className="text-xs text-slate-400">{country.threats.toLocaleString()} threats</div></div><div className="text-sm font-bold text-white">#{index + 1}</div></div>)}
                </div>
              )}
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="glass rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Activity className="w-5 h-5 text-cyan-400" />Recent Threats</h3>
              {mapData.recentThreats.length === 0 ? <p className="text-sm text-slate-500">No IDS alerts yet.</p> : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {mapData.recentThreats.map((threat) => <div key={threat.id} className="p-3 rounded-xl bg-slate-900/50 border border-red-500/10"><div className="flex items-start justify-between mb-1"><span className="text-xs text-slate-500">{new Date(threat.timestamp).toLocaleTimeString()}</span><span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">{threat.severity}</span></div><div className="font-mono text-xs text-cyan-400 mb-1">{threat.source}</div><div className="flex items-center gap-2 text-xs"><span className="text-slate-400">Target:</span><span className="text-white">{threat.target}</span></div><div className="flex items-center gap-2 text-xs mt-1"><AlertTriangle className="w-3 h-3 text-red-400" /><span className="text-red-400">{threat.type}</span></div></div>)}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
