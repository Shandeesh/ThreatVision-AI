import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Server,
  Shield,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, createSocket, getErrorMessage, type DashboardData } from "@/lib/liveApi";

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: "cyan" | "red" | "green" | "yellow";
  delay: number;
}

function StatCard({ title, value, icon: Icon, color, delay }: StatCardProps) {
  const colorClass = {
    cyan: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    red: "text-red-400 bg-red-500/10 border-red-500/20",
    green: "text-green-400 bg-green-500/10 border-green-500/20",
    yellow: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  }[color];

  return (
    <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay, duration: 0.5 }} className="glass rounded-2xl p-6 cyber-card">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${colorClass}`}><Icon className="w-6 h-6" /></div>
        <span className="text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-400">Live</span>
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-slate-400">{title}</div>
    </motion.div>
  );
}

const emptyDashboard: DashboardData = {
  totals: { totalThreats: 0, threatsBlocked: 0, activeMonitors: 0, packetsTotal: 0, bytesTotal: 0, uptimeSeconds: 0 },
  threatData: [],
  threatTypes: [],
  recentAlerts: [],
  recentPackets: [],
  serviceStartedAt: "",
};

function normalizeDashboardData(payload: unknown): DashboardData {
  if (!payload || typeof payload !== "object") {
    return emptyDashboard;
  }

  const data = payload as Partial<DashboardData>;
  return {
    totals: {
      totalThreats: Number(data.totals?.totalThreats || 0),
      threatsBlocked: Number(data.totals?.threatsBlocked || 0),
      activeMonitors: Number(data.totals?.activeMonitors || 0),
      packetsTotal: Number(data.totals?.packetsTotal || 0),
      bytesTotal: Number(data.totals?.bytesTotal || 0),
      uptimeSeconds: Number(data.totals?.uptimeSeconds || 0),
    },
    threatData: Array.isArray(data.threatData) ? data.threatData : [],
    threatTypes: Array.isArray(data.threatTypes) ? data.threatTypes : [],
    recentAlerts: Array.isArray(data.recentAlerts) ? data.recentAlerts : [],
    recentPackets: Array.isArray(data.recentPackets) ? data.recentPackets : [],
    serviceStartedAt: typeof data.serviceStartedAt === "string" ? data.serviceStartedAt : "",
  };
}

function formatUptime(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export default function DashboardSection() {
  const sectionRef = useRef(null);
  const [dashboard, setDashboard] = useState<DashboardData>(emptyDashboard);
  const [error, setError] = useState<string | null>(null);
  const isInView = useInView(sectionRef, { once: true });

  useEffect(() => {
    api
      .get<DashboardData>("/api/dashboard")
      .then((response) => setDashboard(normalizeDashboardData(response.data)))
      .catch((requestError) => setError(getErrorMessage(requestError)));

    const socket = createSocket();
    socket.on("stats", (payload: DashboardData) => setDashboard(normalizeDashboardData(payload)));
    return () => {
      socket.disconnect();
    };
  }, []);

  const stats = [
    { title: "Threats Detected", value: dashboard.totals.totalThreats.toLocaleString(), icon: AlertTriangle, color: "red" as const },
    { title: "Threats Blocked", value: dashboard.totals.threatsBlocked.toLocaleString(), icon: Shield, color: "green" as const },
    { title: "Active Captures", value: dashboard.totals.activeMonitors.toLocaleString(), icon: Activity, color: "cyan" as const },
    { title: "Backend Uptime", value: formatUptime(dashboard.totals.uptimeSeconds), icon: Server, color: "yellow" as const },
  ];

  return (
    <section id="dashboard" ref={sectionRef} className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-4">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-mono text-cyan-400">LIVE SECURITY DASHBOARD</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">THREAT <span className="text-cyan-400">INTELLIGENCE</span> OVERVIEW</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">Live counters from packet capture, IDS events, firewall actions, and backend scan history.</p>
          {error && <p className="mt-4 text-red-300 text-sm">{error}</p>}
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {stats.map((stat, index) => <StatCard key={stat.title} {...stat} delay={index * 0.1} />)}
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-12">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.2 }} className="lg:col-span-2 glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white">Threat Activity (24h)</h3>
                <p className="text-sm text-slate-400">Detected vs blocked from live events</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dashboard.threatData}>
                <defs>
                  <linearGradient id="threatGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
                  <linearGradient id="blockedGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(6, 182, 212, 0.2)", borderRadius: "8px", color: "#fff" }} />
                <Area type="monotone" dataKey="threats" stroke="#ef4444" fillOpacity={1} fill="url(#threatGradient)" />
                <Area type="monotone" dataKey="blocked" stroke="#22c55e" fillOpacity={1} fill="url(#blockedGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.3 }} className="glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Threat Categories</h3>
            <p className="text-sm text-slate-400 mb-6">Distribution by real IDS event type</p>
            {dashboard.threatTypes.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-center text-slate-500 text-sm">No IDS categories yet.</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={dashboard.threatTypes} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                      {dashboard.threatTypes.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(6, 182, 212, 0.2)", borderRadius: "8px", color: "#fff" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-4">
                  {dashboard.threatTypes.map((type) => (
                    <div key={type.name} className="flex items-center gap-2 text-xs text-slate-400">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }} />
                      {type.name} ({type.count})
                    </div>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.4 }} className="glass rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-cyan-500/10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Recent IDS Alerts</h3>
                <p className="text-sm text-slate-400">Latest events derived from live packets</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400"><Clock className="w-4 h-4" /><span>Live updates</span></div>
            </div>
          </div>
          <div className="overflow-x-auto">
            {dashboard.recentAlerts.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No IDS alerts yet.</div>
            ) : (
              <table className="w-full">
                <thead><tr className="border-b border-slate-800"><th className="text-left px-6 py-4 text-sm font-medium text-slate-400">IP Address</th><th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Event</th><th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Severity</th><th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Time</th><th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Status</th></tr></thead>
                <tbody>
                  {dashboard.recentAlerts.map((alert) => (
                    <tr key={alert.id} className="border-b border-slate-800/50 hover:bg-cyan-500/5 transition-colors">
                      <td className="px-6 py-4 font-mono text-cyan-400 text-sm">{alert.source}</td>
                      <td className="px-6 py-4 text-white text-sm">{alert.type}</td>
                      <td className="px-6 py-4"><span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${alert.severity === "Critical" ? "threat-critical" : alert.severity === "High" ? "threat-high" : "threat-medium"}`}>{alert.severity}</span></td>
                      <td className="px-6 py-4 text-slate-400 text-sm">{new Date(alert.timestamp).toLocaleTimeString()}</td>
                      <td className="px-6 py-4"><span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${alert.status === "blocked" ? "status-malicious" : alert.status === "flagged" ? "status-suspicious" : "status-safe"}`}>{alert.status === "blocked" ? <CheckCircle className="w-3 h-3" /> : <Activity className="w-3 h-3" />}{alert.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
