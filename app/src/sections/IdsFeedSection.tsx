import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Clock,
  Crosshair,
  Database,
  Globe,
  Radio,
  Radar,
  RotateCcw,
  Shield,
  Siren,
  Target,
  Zap,
} from "lucide-react";
import { api, createSocket, getErrorMessage, type DashboardData, type IdsEvent } from "@/lib/liveApi";

const eventIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "Blocked packet": Shield,
  "Known malicious source": Siren,
  "Suspicious source": AlertTriangle,
  "Port scan behavior": Radar,
  "High packet rate": Crosshair,
  "DNS activity": Database,
};

function severityClass(severity: string) {
  if (severity === "Critical") return "bg-red-500/20 text-red-400";
  if (severity === "High") return "bg-orange-500/20 text-orange-400";
  if (severity === "Medium") return "bg-yellow-500/20 text-yellow-400";
  return "bg-blue-500/20 text-blue-400";
}

export default function IdsFeedSection() {
  const [events, setEvents] = useState<IdsEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<IdsEvent | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<DashboardData>("/api/dashboard")
      .then((response) => setEvents(response.data.recentAlerts || []))
      .catch((requestError) => setError(getErrorMessage(requestError)));

    const socket = createSocket();
    socket.on("ids-event", (event: IdsEvent) => {
      setEvents((prev) => [event, ...prev.filter((item) => item.id !== event.id)].slice(0, 50));
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  const stats = [
    { label: "IDS Events", value: events.length.toString(), icon: Target, color: "text-cyan-400" },
    { label: "Critical", value: events.filter((event) => event.severity === "Critical").length.toString(), icon: AlertTriangle, color: "text-red-400" },
    { label: "High", value: events.filter((event) => event.severity === "High").length.toString(), icon: Siren, color: "text-orange-400" },
    { label: "Blocked", value: events.filter((event) => event.status === "blocked").length.toString(), icon: Shield, color: "text-green-400" },
  ];

  return (
    <section id="ids-feed" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 mb-4">
            <Radar className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-mono text-orange-400">LIVE IDS FEED</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">INTRUSION <span className="text-orange-400">DETECTION</span> FEED</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">Real IDS events derived from captured packets, provider reputation, local firewall hits, port-scan behavior, and packet-rate signals.</p>
          {error && <p className="mt-4 text-red-300 text-sm">{error}</p>}
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }} className="glass rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2"><Icon className={`w-5 h-5 ${stat.color}`} /><span className="text-sm text-slate-400">{stat.label}</span></div>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
              </motion.div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="lg:col-span-2 glass rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-white">IDS Event Feed</h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-xs"><Radio className="w-3 h-3" />LIVE</span>
                </div>
                <button onClick={() => { setEvents([]); setSelectedEvent(null); }} className="flex items-center gap-2 px-4 py-2 glass text-slate-300 hover:text-white rounded-lg transition-colors"><RotateCcw className="w-4 h-4" />Clear View</button>
              </div>
            </div>

            <div className="h-[500px] overflow-y-auto p-4 space-y-2">
              {events.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <Shield className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No IDS events observed</p>
                  <p className="text-sm">Start live packet capture; this feed stays empty until real suspicious traffic appears.</p>
                </div>
              ) : (
                <AnimatePresence>
                  {events.map((event) => {
                    const EventIcon = eventIcons[event.type] || Zap;
                    return (
                      <motion.div key={event.id} initial={{ opacity: 0, x: -50, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 50 }} transition={{ duration: 0.25 }} onClick={() => setSelectedEvent(selectedEvent?.id === event.id ? null : event)} className={`p-4 rounded-xl cursor-pointer transition-all ${selectedEvent?.id === event.id ? "bg-slate-800/80 border border-orange-500/30" : "bg-slate-900/30 hover:bg-slate-800/50 border border-transparent"}`}>
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0"><EventIcon className="w-5 h-5 text-orange-400" /></div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap"><span className="font-medium text-white text-sm">{event.type}</span><span className={`text-xs px-2 py-0.5 rounded-full ${severityClass(event.severity)}`}>{event.severity}</span><span className="text-xs text-slate-500 ml-auto">{new Date(event.timestamp).toLocaleTimeString()}</span></div>
                            <div className="flex items-center gap-4 mt-1 text-xs text-slate-400"><span className="font-mono text-cyan-400">{event.source}</span><span>-&gt;</span><span className="font-mono">{event.target}</span></div>
                            <div className="flex items-center gap-4 mt-2 text-xs"><span className="text-slate-500"><Globe className="w-3 h-3 inline mr-1" />{event.country || "Unknown"}</span><span className="text-slate-500"><Activity className="w-3 h-3 inline mr-1" />{event.packetsPerMinute} ppm</span><span className="text-slate-500"><Clock className="w-3 h-3 inline mr-1" />Score {event.score ?? "N/A"}</span></div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </motion.div>

          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="glass rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Detection Sources</h3>
              <div className="space-y-2">
                {["Provider reputation", "Local firewall hit", "Repeated port attempts", "High packet rate"].map((source) => <div key={source} className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/30"><div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center"><Radar className="w-4 h-4 text-orange-400" /></div><span className="text-sm text-white">{source}</span></div>)}
              </div>
            </motion.div>

            <AnimatePresence>
              {selectedEvent && (
                <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} className="glass rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Event Details</h3>
                  <div className="space-y-3">
                    <DetailRow label="Type" value={selectedEvent.type} />
                    <DetailRow label="Source" value={selectedEvent.source} mono />
                    <DetailRow label="Target" value={selectedEvent.target} mono />
                    <DetailRow label="Severity" value={selectedEvent.severity} />
                    <DetailRow label="Country" value={selectedEvent.country || "Unknown"} />
                    <DetailRow label="Packets/min" value={selectedEvent.packetsPerMinute.toLocaleString()} />
                    <DetailRow label="Status" value={selectedEvent.status} />
                    <DetailRow label="Reason" value={selectedEvent.reason} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="flex items-start justify-between gap-4 text-sm"><span className="text-slate-400">{label}</span><span className={`text-white font-medium text-right ${mono ? "font-mono" : ""}`}>{value}</span></div>;
}
