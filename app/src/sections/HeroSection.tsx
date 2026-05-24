import { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Shield, ChevronDown, Activity, Globe, Lock } from "lucide-react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";

function AnimatedGlobe() {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.15;
    }
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Main Sphere */}
      <Sphere ref={meshRef} args={[2, 64, 64]} scale={1.2}>
        <MeshDistortMaterial
          color="#0e4a6e"
          attach="material"
          distort={0.15}
          speed={1.5}
          roughness={0.2}
          metalness={0.8}
        />
      </Sphere>

      {/* Outer Wireframe */}
      <Sphere args={[2.3, 32, 32]} scale={1.2}>
        <meshBasicMaterial
          color="#06b6d4"
          wireframe
          transparent
          opacity={0.15}
        />
      </Sphere>

      {/* Inner Core */}
      <Sphere args={[1.5, 32, 32]} scale={1.2}>
        <meshBasicMaterial
          color="#0891b2"
          transparent
          opacity={0.1}
        />
      </Sphere>

      {/* Orbiting Rings */}
      <Ring rotation={[Math.PI / 2, 0, 0]} radius={3.2} />
      <Ring rotation={[Math.PI / 3, Math.PI / 4, 0]} radius={3.5} />
      <Ring rotation={[-Math.PI / 6, Math.PI / 3, 0]} radius={2.8} />

      {/* Floating Data Points */}
      {Array.from({ length: 12 }).map((_, i) => (
        <DataPoint
          key={i}
          angle={(i / 12) * Math.PI * 2}
          radius={2.8}
          speed={0.5 + i * 0.1}
          offset={i * 0.5}
        />
      ))}
    </group>
  );
}

function Ring({
  rotation,
  radius,
}: {
  rotation: [number, number, number];
  radius: number;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.z = clock.getElapsedTime() * 0.1;
    }
  });

  return (
    <mesh ref={ref} rotation={rotation}>
      <ringGeometry args={[radius - 0.02, radius, 64]} />
      <meshBasicMaterial
        color="#06b6d4"
        transparent
        opacity={0.2}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function DataPoint({
  angle,
  radius,
  speed,
  offset,
}: {
  angle: number;
  radius: number;
  speed: number;
  offset: number;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (ref.current) {
      const t = clock.getElapsedTime() * speed + offset;
      ref.current.position.x = Math.cos(angle + t * 0.2) * radius;
      ref.current.position.y = Math.sin(t * 0.3) * 0.5;
      ref.current.position.z = Math.sin(angle + t * 0.2) * radius;
    }
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.08, 16, 16]} />
      <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.5} />
    </mesh>
  );
}

function ThreatOrbital() {
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = -clock.getElapsedTime() * 0.2;
    }
  });

  return (
    <group ref={ref}>
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        const isThreat = i % 2 === 0;

        return (
          <mesh
            key={i}
            position={[Math.cos(angle) * 4.5, Math.sin(angle * 2) * 0.8, Math.sin(angle) * 4.5]}
          >
            <octahedronGeometry args={[0.15, 0]} />
            <meshStandardMaterial
              color={isThreat ? "#ef4444" : "#22c55e"}
              emissive={isThreat ? "#ef4444" : "#22c55e"}
              emissiveIntensity={0.3}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function TypewriterText({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayText, setDisplayText] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;

    let index = 0;
    const interval = setInterval(() => {
      if (index <= text.length) {
        setDisplayText(text.slice(0, index));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [started, text]);

  return (
    <span>
      {displayText}
      <span className="animate-pulse">|</span>
    </span>
  );
}

interface HeroSectionProps {
  lowPerformanceMode?: boolean;
}

export default function HeroSection({ lowPerformanceMode = false }: HeroSectionProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { margin: "200px" });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <section
      id="hero"
      className="min-h-screen relative flex items-center justify-center overflow-hidden"
    >
      {/* Background Image with Parallax */}
      <motion.div
        className="absolute inset-0 z-0"
        style={{
          x: mousePosition.x * 10,
          y: mousePosition.y * 10,
        }}
      >
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: "url(/hero-cyber.jpg)" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,hsl(216_31%_8%/0.38),hsl(217_27%_12%/0.72),hsl(220_24%_10%/0.96))]" />
      </motion.div>

      {/* Scanline Effect */}
      <div className="absolute inset-0 pointer-events-none z-5 scanline opacity-30" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-center lg:text-left"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-6"
            >
              <Activity className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-mono text-cyan-400">
                LIVE THREAT MONITORING ACTIVE
              </span>
            </motion.div>

            {/* Title */}
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              <span className="text-white">MALICIOUS IP</span>
              <br />
              <span className="gradient-text">INTELLIGENCE</span>
              <br />
              <span className="text-white">SYSTEM</span>
            </h1>

            {/* Terminal Text */}
            <div className="font-mono text-sm sm:text-base text-cyan-400/80 mb-8 h-8">
              <TypewriterText
                text=">>> Initializing threat detection protocols..."
                delay={500}
              />
            </div>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-slate-400 text-lg mb-8 max-w-xl"
            >
              Advanced cybersecurity platform for real-time threat detection,
              IP reputation analysis, and network intelligence gathering using
              VirusTotal and AbuseIPDB APIs.
            </motion.p>

            {/* Stats Row */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex flex-wrap gap-4 justify-center lg:justify-start mb-10"
            >
              {[
                { icon: Shield, label: "Threats Blocked", value: "12,847" },
                { icon: Globe, label: "IPs Monitored", value: "2.4M+" },
                { icon: Lock, label: "Protection Rate", value: "99.9%" },
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={i}
                    className="glass rounded-xl px-5 py-3 flex items-center gap-3"
                  >
                    <Icon className="w-5 h-5 text-cyan-400" />
                    <div>
                      <div className="text-lg font-bold text-white">
                        {stat.value}
                      </div>
                      <div className="text-xs text-slate-400">{stat.label}</div>
                    </div>
                  </div>
                );
              })}
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="flex flex-wrap gap-4 justify-center lg:justify-start"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() =>
                  document
                    .getElementById("scanner")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold rounded-xl glow-cyan transition-colors flex items-center gap-2"
              >
                <Shield className="w-5 h-5" />
                Scan IP Address
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() =>
                  document
                    .getElementById("traffic")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="px-8 py-4 glass text-cyan-400 font-semibold rounded-xl hover:bg-cyan-500/10 transition-colors flex items-center gap-2"
              >
                <Activity className="w-5 h-5" />
                View Live Traffic
              </motion.button>
            </motion.div>
          </motion.div>

          {/* Right Content - 3D Globe */}
          <motion.div
            ref={containerRef}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="relative h-[400px] lg:h-[600px] flex items-center justify-center"
          >
            {!lowPerformanceMode && isInView ? (
              <>
                <Canvas
                  camera={{ position: [0, 0, 8], fov: 45 }}
                  dpr={[1, 1.5]}
                  gl={{ antialias: true, alpha: true }}
                >
                  <ambientLight intensity={0.3} />
                  <pointLight position={[10, 10, 10]} intensity={0.5} color="#06b6d4" />
                  <pointLight position={[-10, -10, -10]} intensity={0.3} color="#3b82f6" />
                  <AnimatedGlobe />
                  <ThreatOrbital />
                  <OrbitControls
                    enableZoom={false}
                    enablePan={false}
                    autoRotate
                    autoRotateSpeed={0.5}
                  />
                </Canvas>

                {/* Floating Elements */}
                <motion.div
                  animate={{
                    y: [0, -10, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="absolute top-10 right-10 glass rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-xs font-mono text-green-400">
                      SYSTEM SECURE
                    </span>
                  </div>
                </motion.div>

                <motion.div
                  animate={{
                    y: [0, 10, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1,
                  }}
                  className="absolute bottom-20 left-0 glass rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                    <span className="text-xs font-mono text-red-400">
                      THREAT DETECTED: 192.168.x.x
                    </span>
                  </div>
                </motion.div>
              </>
            ) : (
              <div className="w-64 h-64 relative rounded-full border border-cyan-500/20 bg-cyan-950/10 flex items-center justify-center shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.2)_0%,transparent_70%)]" />
                <div className="w-48 h-48 rounded-full border border-cyan-500/30 border-dashed animate-[spin_20s_linear_infinite] flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full border border-cyan-500/40 border-double flex items-center justify-center">
                    <Shield className="w-12 h-12 text-cyan-400 animate-pulse" />
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 to-transparent pointer-events-none" />
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="flex flex-col items-center gap-2 cursor-pointer"
          onClick={() =>
            document
              .getElementById("dashboard")
              ?.scrollIntoView({ behavior: "smooth" })
          }
        >
          <span className="text-xs text-slate-500 font-mono">
            SCROLL TO EXPLORE
          </span>
          <ChevronDown className="w-5 h-5 text-cyan-400" />
        </motion.div>
      </motion.div>
    </section>
  );
}
