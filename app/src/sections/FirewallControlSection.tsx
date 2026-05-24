import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ban,
  CheckCircle,
  Clock,
  Globe,
  Loader2,
  Lock,
  Power,
  Search,
  Server,
  Shield,
  ShieldCheck,
  ShieldOff,
  Unlock,
} from "lucide-react";
import { api, createSocket, getErrorMessage, type FirewallPolicy, type FirewallState } from "@/lib/liveApi";
import { useNotificationContext } from "@/hooks/useNotifications";

const emptyFirewall: FirewallState = {
  platform: "unknown",
  writeEnabled: false,
  privileged: false,
  privilegeMessage: "Loading firewall status",
  status: "write-disabled",
  policy: { autoBlockEnabled: false, threshold: 85, durationMinutes: 1440 },
  blockedIPs: [],
  recentActions: [],
};

function validateIP(ip: string) {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?\d\d?)$/;
  return ipv4Regex.test(ip.trim());
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export default function FirewallControlSection() {
  const [firewall, setFirewall] = useState<FirewallState>(emptyFirewall);
  const [newIP, setNewIP] = useState("");
  const [isBlocking, setIsBlocking] = useState(false);
  const [selectedIP, setSelectedIP] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { addNotification } = useNotificationContext();

  const refreshFirewall = async () => {
    const response = await api.get<FirewallState>("/api/firewall");
    setFirewall(response.data);
  };

  useEffect(() => {
    refreshFirewall().catch((requestError) => setError(getErrorMessage(requestError)));
    const socket = createSocket();
    socket.on("firewall-state", (payload: Pick<FirewallState, "policy" | "blockedIPs" | "recentActions">) => {
      setFirewall((prev) => ({ ...prev, ...payload }));
    });
    socket.on("firewall-action", () => {
      refreshFirewall().catch((requestError) => setError(getErrorMessage(requestError)));
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  const handleBlock = async () => {
    const ip = newIP.trim();
    if (!validateIP(ip)) {
      addNotification({ title: "Invalid IP Address", message: "Please enter a valid IPv4 address", type: "warning" });
      return;
    }

    setIsBlocking(true);
    setError(null);
    try {
      await api.post("/api/firewall/block", { ip, reason: "Manual Block" });
      setNewIP("");
      await refreshFirewall();
      addNotification({ title: "Firewall Updated", message: `${ip} was blocked by the backend firewall service`, type: "success" });
    } catch (requestError) {
      const message = getErrorMessage(requestError);
      setError(message);
      addNotification({ title: "Block Failed", message, type: "error" });
    } finally {
      setIsBlocking(false);
    }
  };

  const handleUnblock = async (ip: string) => {
    setError(null);
    try {
      await api.post("/api/firewall/unblock", { ip });
      setSelectedIP(null);
      await refreshFirewall();
      addNotification({ title: "Firewall Updated", message: `${ip} was unblocked`, type: "success" });
    } catch (requestError) {
      const message = getErrorMessage(requestError);
      setError(message);
      addNotification({ title: "Unblock Failed", message, type: "error" });
    }
  };

  const updatePolicy = async (policy: FirewallPolicy) => {
    setError(null);
    try {
      const response = await api.put<{ policy: FirewallPolicy }>("/api/firewall/policy", policy);
      setFirewall((prev) => ({ ...prev, policy: response.data.policy }));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  const stats = [
    { label: "Blocked IPs", value: firewall.blockedIPs.length.toString(), icon: Shield, color: "text-red-400" },
    { label: "Auto Block", value: firewall.policy.autoBlockEnabled ? "ON" : "OFF", icon: firewall.policy.autoBlockEnabled ? ShieldCheck : ShieldOff, color: firewall.policy.autoBlockEnabled ? "text-green-400" : "text-yellow-400" },
    { label: "Last Action", value: firewall.recentActions[0] ? new Date(firewall.recentActions[0].timestamp).toLocaleTimeString() : "None", icon: Clock, color: "text-cyan-400" },
    { label: "Firewall Status", value: firewall.status.replace("-", " "), icon: Power, color: firewall.status === "ready" ? "text-green-400" : "text-yellow-400" },
  ];

  return (
    <section id="firewall" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 mb-4">
            <Lock className="w-4 h-4 text-red-400" />
            <span className="text-sm font-mono text-red-400">LIVE FIREWALL CONTROL</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">SYSTEM <span className="text-red-400">FIREWALL</span> MANAGEMENT</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">Manual and auto blocking are only applied when the backend confirms real OS firewall writes.</p>
          {error && <p className="mt-4 text-red-300 text-sm">{error}</p>}
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }} className="glass rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2"><Icon className={`w-5 h-5 ${stat.color}`} /><span className="text-sm text-slate-400">{stat.label}</span></div>
                <div className="text-2xl font-bold text-white capitalize">{stat.value}</div>
              </motion.div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="lg:col-span-2 space-y-6">
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Ban className="w-5 h-5 text-red-400" />Manual IP Block</h3>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input type="text" value={newIP} onChange={(event) => setNewIP(event.target.value)} onKeyDown={(event) => event.key === "Enter" && handleBlock()} placeholder="Enter IP to block" className="w-full pl-12 pr-4 py-4 bg-slate-900/80 border border-red-500/30 rounded-xl text-white placeholder-slate-500 focus:border-red-400 focus:ring-2 focus:ring-red-400/20 outline-none font-mono transition-all" />
                </div>
                <button onClick={handleBlock} disabled={isBlocking || !newIP.trim()} className="px-8 py-4 bg-red-500 hover:bg-red-400 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 min-w-[160px]">
                  {isBlocking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
                  Block IP
                </button>
              </div>
              {firewall.status !== "ready" && <div className="mt-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-200 text-sm">{firewall.privilegeMessage}</div>}
            </div>

            <div className="glass rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2"><Shield className="w-5 h-5 text-red-400" />Blocked IP Addresses</h3>
                <span className="text-sm text-slate-400">{firewall.blockedIPs.length} IPs blocked</span>
              </div>
              <div className="divide-y divide-slate-800/50">
                <AnimatePresence>
                  {firewall.blockedIPs.map((blocked, index) => (
                    <motion.div key={blocked.ip} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ delay: index * 0.03 }} className={`p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors cursor-pointer ${selectedIP === blocked.ip ? "bg-slate-800/50" : ""}`} onClick={() => setSelectedIP(selectedIP === blocked.ip ? null : blocked.ip)}>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center"><Ban className="w-5 h-5 text-red-400" /></div>
                        <div>
                          <div className="font-mono text-sm text-white">{blocked.ip}</div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400"><span>{blocked.country || "Unknown"}</span><span>|</span><span>{blocked.reason}</span><span>|</span><span>{formatDate(blocked.blockedAt)}</span></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-400">Score: {blocked.score ?? "N/A"}</span>
                        <button onClick={(event) => { event.stopPropagation(); void handleUnblock(blocked.ip); }} className="p-2 hover:bg-green-500/10 rounded-lg transition-colors group" title="Unblock IP"><Unlock className="w-4 h-4 text-slate-400 group-hover:text-green-400" /></button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {firewall.blockedIPs.length === 0 && <div className="p-8 text-center text-slate-500"><ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>No IPs currently blocked by the backend state.</p></div>}
              </div>
            </div>
          </motion.div>

          <div className="space-y-6">
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Auto Block Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50">
                  <div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${firewall.policy.autoBlockEnabled ? "bg-green-500/10" : "bg-yellow-500/10"}`}><Power className={`w-5 h-5 ${firewall.policy.autoBlockEnabled ? "text-green-400" : "text-yellow-400"}`} /></div><div><div className="text-sm font-medium text-white">Auto Block</div><div className="text-xs text-slate-400">Requires firewall write readiness</div></div></div>
                  <button onClick={() => void updatePolicy({ ...firewall.policy, autoBlockEnabled: !firewall.policy.autoBlockEnabled })} className={`w-12 h-6 rounded-full transition-colors relative ${firewall.policy.autoBlockEnabled ? "bg-green-500" : "bg-slate-700"}`}><div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${firewall.policy.autoBlockEnabled ? "translate-x-6" : "translate-x-0.5"}`} /></button>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/50">
                  <div className="text-sm font-medium text-white mb-2">Block Threshold</div>
                  <input type="range" min="1" max="100" value={firewall.policy.threshold} onChange={(event) => void updatePolicy({ ...firewall.policy, threshold: Number(event.target.value) })} className="w-full" />
                  <div className="flex justify-between mt-1 text-xs text-slate-500"><span>Score &gt;= {firewall.policy.threshold}</span><span>Live policy</span></div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/50">
                  <div className="text-sm font-medium text-white mb-2">Block Duration</div>
                  <input type="number" min="1" value={firewall.policy.durationMinutes} onChange={(event) => void updatePolicy({ ...firewall.policy, durationMinutes: Number(event.target.value) })} className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white" />
                  <div className="text-xs text-slate-500 mt-1">Minutes</div>
                </div>
              </div>
            </div>

            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Firewall Platform</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm"><Server className="w-4 h-4 text-cyan-400" /><span className="text-slate-400">OS:</span><span className="text-white">{firewall.platform}</span></div>
                <div className="flex items-center gap-3 text-sm"><Globe className="w-4 h-4 text-cyan-400" /><span className="text-slate-400">Writes:</span><span className={firewall.writeEnabled ? "text-green-400" : "text-yellow-400"}>{firewall.writeEnabled ? "Enabled" : "Disabled"}</span></div>
                <div className="flex items-center gap-3 text-sm"><CheckCircle className="w-4 h-4 text-green-400" /><span className="text-slate-400">Privilege:</span><span className={firewall.privileged ? "text-green-400" : "text-yellow-400"}>{firewall.privileged ? "Ready" : "Not ready"}</span></div>
              </div>
            </div>

            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Actions</h3>
              {firewall.recentActions.length === 0 ? <p className="text-sm text-slate-500">No firewall actions yet.</p> : (
                <div className="space-y-2">
                  {firewall.recentActions.map((item) => <div key={item.id} className="flex items-center gap-3 text-sm p-2 rounded-lg bg-slate-900/30"><div className={`w-2 h-2 rounded-full ${item.action === "Blocked" ? "bg-red-400" : "bg-green-400"}`} /><span className="text-white">{item.action}</span><span className="font-mono text-cyan-400">{item.ip}</span><span className="text-slate-500 ml-auto text-xs">{new Date(item.timestamp).toLocaleTimeString()}</span></div>)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
