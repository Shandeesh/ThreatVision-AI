import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Clock,
  Download,
  Filter,
  Pause,
  Play,
  RotateCcw,
  Server,
  Shield,
  Upload,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import { createSocket, type Packet } from "@/lib/liveApi";
import { useNotificationContext } from "@/hooks/useNotifications";

function packetBadge(packet: Packet) {
  if (packet.status === "blocked") return "bg-red-500/10 text-red-400";
  if (packet.status === "flagged") return "bg-yellow-500/10 text-yellow-400";
  return "bg-green-500/10 text-green-400";
}

function playThreatSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    const playBeep = (delay: number, frequency: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.frequency.setValueAtTime(frequency, ctx.currentTime + delay);
      osc.type = "sawtooth";
      
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.03, ctx.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.12);
      
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.12);
    };
    
    playBeep(0, 880);
    playBeep(0.1, 880);
  } catch (e) {}
}

function PacketBar({ packet }: { packet: Packet }) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-2 rounded-lg border transition-all duration-300 animate-slide-in ${
        packet.isThreat 
          ? "bg-red-500/5 border-red-500/10 hover:border-red-500/20" 
          : "bg-slate-900/30 border-transparent hover:border-cyan-500/10 hover:bg-slate-900/40"
      }`}
    >
      <div className="w-2 h-2 rounded-full flex-shrink-0">
        <div className={`w-2 h-2 rounded-full ${packet.status === "allowed" ? "bg-green-400" : packet.status === "blocked" ? "bg-red-400" : "bg-yellow-400"}`} />
      </div>
      <div className="w-32 flex-shrink-0"><span className="font-mono text-xs text-cyan-400">{packet.source}</span></div>
      <ArrowRight className={`w-3 h-3 flex-shrink-0 ${packet.isThreat ? "text-red-400" : "text-slate-600"}`} />
      <div className="w-32 flex-shrink-0"><span className="font-mono text-xs text-cyan-300">{packet.destination}</span></div>
      <div className="w-16 flex-shrink-0"><span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-700/50 text-slate-300">{packet.protocol}</span></div>
      <div className="w-14 flex-shrink-0"><span className="text-xs text-slate-500">:{packet.port || "-"}</span></div>
      <div className="w-16 flex-shrink-0"><span className="text-xs text-slate-500">{packet.size} B</span></div>
      <div className="w-12 flex-shrink-0"><span className="text-xs font-medium text-slate-400">{packet.country || "-"}</span></div>
      <div className="flex-1 flex justify-end">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${packetBadge(packet)}`}>
          {packet.isThreat ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
          {packet.isThreat ? packet.threatType || packet.classification : packet.status}
        </span>
      </div>
      <div className="w-20 flex-shrink-0 text-right"><span className="text-xs text-slate-600 font-mono">{new Date(packet.timestamp).toLocaleTimeString()}</span></div>
    </div>
  );
}

export default function LiveTrafficSection() {
  const [packets, setPackets] = useState<Packet[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [filter, setFilter] = useState("all");
  const [packetCount, setPacketCount] = useState(0);
  const [threatCount, setThreatCount] = useState(0);
  const [blockedCount, setBlockedCount] = useState(0);
  const [bytesTotal, setBytesTotal] = useState(0);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [captureStatus, setCaptureStatus] = useState<string>("Stopped");
  const sectionRef = useRef(null);
  const socketRef = useRef<ReturnType<typeof createSocket> | null>(null);
  const isInView = useInView(sectionRef, { once: true });
  const { soundEnabled } = useNotificationContext();

  useEffect(() => {
    const socket = createSocket();
    socketRef.current = socket;
    let lastSoundTime = 0;

    socket.on("packet", (packet: Packet) => {
      setPackets((prev) => [packet, ...prev].slice(0, 25));
      setPacketCount((prev) => prev + 1);
      setBytesTotal((prev) => prev + packet.size);
      if (packet.isThreat) {
        setThreatCount((prev) => prev + 1);
        const now = Date.now();
        if (soundEnabled && now - lastSoundTime > 1500) {
          lastSoundTime = now;
          playThreatSound();
        }
      }
      if (packet.status === "blocked") setBlockedCount((prev) => prev + 1);
    });

    socket.on("capture-error", (payload: { message: string; severity?: "warning" | "error" }) => {
      setCaptureError(payload.message);
      if (payload.severity !== "warning") setCaptureStatus("Error");
    });

    socket.on("capture-status", (payload: { running: boolean; interface?: string | null; code?: number }) => {
      setIsCapturing(payload.running);
      setCaptureStatus(payload.running ? `Capturing${payload.interface ? ` on ${payload.interface}` : ""}` : `Stopped${typeof payload.code === "number" ? ` (${payload.code})` : ""}`);
    });

    return () => {
      socket.emit("stop-capture");
      socket.disconnect();
    };
  }, [soundEnabled]);

  const startCapture = useCallback(() => {
    setCaptureError(null);
    setCaptureStatus("Starting capture");
    socketRef.current?.emit("start-capture");
  }, []);

  const stopCapture = useCallback(() => {
    socketRef.current?.emit("stop-capture");
    setIsCapturing(false);
    setCaptureStatus("Stopped");
  }, []);

  const resetCapture = useCallback(() => {
    stopCapture();
    setPackets([]);
    setPacketCount(0);
    setThreatCount(0);
    setBlockedCount(0);
    setBytesTotal(0);
    setCaptureError(null);
  }, [stopCapture]);

  const filteredPackets = packets.filter((packet) => {
    if (filter === "threats") return packet.isThreat;
    if (filter === "safe") return !packet.isThreat;
    return true;
  });

  const trafficRate = packetCount === 0 ? "0 pkt" : `${packetCount} pkt`;
  const stats = [
    { label: "Session Packets", value: packetCount.toLocaleString(), icon: Download, color: "cyan" },
    { label: "Threats Detected", value: threatCount.toLocaleString(), icon: AlertTriangle, color: "red" },
    { label: "Traffic Volume", value: `${(bytesTotal / 1024).toFixed(1)} KB`, icon: isCapturing ? Wifi : WifiOff, color: isCapturing ? "green" : "slate" },
    { label: "Blocked", value: blockedCount.toLocaleString(), icon: Shield, color: "green" },
  ];

  return (
    <section id="traffic" ref={sectionRef} className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-4">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-mono text-cyan-400">LIVE NETWORK MONITOR</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">REAL-TIME <span className="text-cyan-400">TRAFFIC</span> ANALYSIS</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">Captures local packets through tshark when available, with a Windows TCP connection monitor fallback when packet capture tools are missing.</p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            const color = stat.color === "cyan" ? "text-cyan-400" : stat.color === "red" ? "text-red-400" : stat.color === "green" ? "text-green-400" : "text-slate-400";
            return (
              <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.9 }} animate={isInView ? { opacity: 1, scale: 1 } : {}} transition={{ delay: index * 0.1 }} className="glass rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2"><Icon className={`w-5 h-5 ${color}`} /><span className="text-sm text-slate-400">{stat.label}</span></div>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
              </motion.div>
            );
          })}
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="glass rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-800">
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-white">Packet Capture</h3>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${isCapturing ? "bg-green-500/10 text-green-400" : "bg-slate-500/10 text-slate-400"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isCapturing ? "bg-green-400" : "bg-slate-500"}`} />
                    {captureStatus}
                  </span>
                </div>
                {captureError && <p className="text-sm text-red-300 mt-2">{captureError}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1 bg-slate-900/50 rounded-lg p-1">
                  <Filter className="w-4 h-4 text-slate-400 ml-2" />
                  {["all", "threats", "safe"].map((item) => (
                    <button key={item} onClick={() => setFilter(item)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === item ? "bg-cyan-500/20 text-cyan-400" : "text-slate-400 hover:text-white"}`}>{item.charAt(0).toUpperCase() + item.slice(1)}</button>
                  ))}
                </div>
                {!isCapturing ? (
                  <button onClick={startCapture} className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-400 text-slate-900 font-semibold rounded-lg transition-colors"><Play className="w-4 h-4" />Start</button>
                ) : (
                  <button onClick={stopCapture} className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-semibold rounded-lg transition-colors"><Pause className="w-4 h-4" />Stop</button>
                )}
                <button onClick={resetCapture} className="flex items-center gap-2 px-4 py-2 glass text-slate-300 hover:text-white rounded-lg transition-colors"><RotateCcw className="w-4 h-4" />Reset</button>
              </div>
            </div>
          </div>

          <div className="px-4 py-3 bg-slate-900/30 border-b border-slate-800 hidden lg:flex items-center gap-3 text-xs text-slate-500 font-medium">
            <div className="w-2 flex-shrink-0" /><div className="w-32 flex-shrink-0">Source</div><div className="w-3 flex-shrink-0" /><div className="w-32 flex-shrink-0">Destination</div><div className="w-16 flex-shrink-0">Protocol</div><div className="w-14 flex-shrink-0">Port</div><div className="w-16 flex-shrink-0">Size</div><div className="w-12 flex-shrink-0">CC</div><div className="flex-1 text-right">Status</div><div className="w-20 flex-shrink-0 text-right">Time</div>
          </div>

          <div className="relative h-[500px] overflow-hidden">
            <div className="relative z-10 h-full overflow-y-auto p-2 space-y-1">
              {filteredPackets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <Server className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No live packets captured</p>
                  <p className="text-sm">Click Start to monitor active connections. Install Wireshark/tshark for raw packet capture.</p>
                </div>
              ) : (
                filteredPackets.map((packet) => <PacketBar key={packet.id} packet={packet} />)
              )}
            </div>
          </div>

          <div className="p-4 border-t border-slate-800 bg-slate-900/30">
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <div className="flex items-center gap-2"><Download className="w-4 h-4 text-cyan-400" /><span className="text-slate-400">Captured:</span><span className="text-white font-mono">{trafficRate}</span></div>
              <div className="flex items-center gap-2"><Upload className="w-4 h-4 text-cyan-400" /><span className="text-slate-400">Bytes:</span><span className="text-white font-mono">{bytesTotal.toLocaleString()}</span></div>
              <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-cyan-400" /><span className="text-slate-400">Duration:</span><span className="text-white font-mono">{isCapturing ? "Active" : "Stopped"}</span></div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
