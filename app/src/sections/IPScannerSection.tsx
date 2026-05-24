import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle,
  Copy,
  Globe,
  Loader2,
  Lock,
  Scan,
  Shield,
  XCircle,
} from "lucide-react";
import { api, getErrorMessage, type Classification, type ScanResult } from "@/lib/liveApi";
import { useNotificationContext } from "@/hooks/useNotifications";

function validateIP(ip: string) {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?\d\d?)$/;
  return ipv4Regex.test(ip.trim());
}

function classificationColor(classification: Classification) {
  switch (classification) {
    case "malicious":
      return "bg-red-500/10 border-red-500/20 text-red-400";
    case "suspicious":
      return "bg-yellow-500/10 border-yellow-500/20 text-yellow-400";
    case "safe":
      return "bg-green-500/10 border-green-500/20 text-green-400";
    default:
      return "bg-slate-500/10 border-slate-500/20 text-slate-300";
  }
}

function ClassificationIcon({ classification }: { classification: Classification }) {
  if (classification === "safe") return <Shield className="w-8 h-8 text-green-400" />;
  if (classification === "suspicious") return <AlertTriangle className="w-8 h-8 text-yellow-400" />;
  if (classification === "malicious") return <XCircle className="w-8 h-8 text-red-400" />;
  return <BrainCircuit className="w-8 h-8 text-slate-400" />;
}

function formatScore(score: number | null) {
  return typeof score === "number" ? `${score}/100` : "Unavailable";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Unavailable";
  return new Date(value).toLocaleString();
}

export default function IPScannerSection() {
  const [ipInput, setIpInput] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copiedIp, setCopiedIp] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { addNotification } = useNotificationContext();

  useEffect(() => {
    api
      .get<{ scans: ScanResult[] }>("/api/scan-history")
      .then((response) => setScanHistory(response.data.scans || []))
      .catch((requestError) => setError(getErrorMessage(requestError)));
  }, []);

  const handleScan = async () => {
    const ip = ipInput.trim();
    if (!validateIP(ip)) {
      addNotification({ title: "Invalid IP Address", message: "Please enter a valid IPv4 address", type: "warning" });
      return;
    }

    setIsScanning(true);
    setError(null);
    setResult(null);

    try {
      const response = await api.post<ScanResult>("/api/analyze", { ip });
      setResult(response.data);
      setScanHistory((prev) => [response.data, ...prev.filter((scan) => scan.ip !== response.data.ip)].slice(0, 10));
      addNotification({
        title: "IP Analysis Complete",
        message: `${ip} classification: ${response.data.classification.toUpperCase()} (${formatScore(response.data.score)})`,
        type: response.data.classification === "malicious" ? "error" : response.data.classification === "suspicious" ? "warning" : "success",
      });
    } catch (requestError) {
      const message = getErrorMessage(requestError);
      setError(message);
      addNotification({ title: "IP Analysis Failed", message, type: "error" });
    } finally {
      setIsScanning(false);
    }
  };

  const handleBlockIP = async () => {
    if (!result) return;
    setIsBlocking(true);
    setError(null);

    try {
      await api.post("/api/firewall/block", { ip: result.ip, reason: "Manual block from IP scanner" });
      const refreshed = await api.post<ScanResult>("/api/analyze", { ip: result.ip });
      setResult(refreshed.data);
      addNotification({ title: "IP Blocked", message: `${result.ip} was blocked by the backend firewall service`, type: "success" });
    } catch (requestError) {
      const message = getErrorMessage(requestError);
      setError(message);
      addNotification({ title: "Block Failed", message, type: "error" });
    } finally {
      setIsBlocking(false);
    }
  };

  const handleCopyIp = (ip: string) => {
    void navigator.clipboard.writeText(ip);
    setCopiedIp(true);
    window.setTimeout(() => setCopiedIp(false), 2000);
  };

  return (
    <section id="scanner" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-4">
            <Scan className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-mono text-cyan-400">LIVE IP INTELLIGENCE</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
            SCAN <span className="text-cyan-400">IP ADDRESS</span>
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Backend-only threat analysis using configured reputation providers. Missing providers are shown as unavailable, never replaced with fabricated scores.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="glass rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={ipInput}
                    onChange={(event) => setIpInput(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && handleScan()}
                    placeholder="Enter IPv4 address"
                    className="w-full pl-12 pr-4 py-4 bg-slate-900/80 border border-cyan-500/30 rounded-xl text-white placeholder-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 outline-none font-mono transition-all"
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleScan}
                  disabled={isScanning || !ipInput.trim()}
                  className="px-8 py-4 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-700 disabled:cursor-not-allowed text-slate-900 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 min-w-[160px]"
                >
                  {isScanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <BrainCircuit className="w-5 h-5" />}
                  Analyze
                </motion.button>
              </div>
              {error && <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{error}</div>}
            </div>

            <AnimatePresence mode="wait">
              {result && (
                <motion.div key={result.ip} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="glass rounded-2xl overflow-hidden">
                  <div className={`p-6 border-b ${classificationColor(result.classification)}`}>
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-slate-950/30">
                          <ClassificationIcon classification={result.classification} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-2xl font-mono font-bold text-white">{result.ip}</h3>
                            <button onClick={() => handleCopyIp(result.ip)} className="p-1 hover:bg-slate-700 rounded transition-colors">
                              <Copy className="w-4 h-4 text-slate-400" />
                            </button>
                            {copiedIp && <span className="text-xs text-green-400">Copied</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold uppercase border ${classificationColor(result.classification)}`}>
                              {result.classification}
                            </span>
                            <span className="inline-flex px-3 py-1 rounded-full text-sm border border-cyan-500/20 bg-cyan-500/10 text-cyan-300">
                              Score: {formatScore(result.score)}
                            </span>
                            <span className="inline-flex px-3 py-1 rounded-full text-sm border border-slate-500/20 bg-slate-500/10 text-slate-300">
                              Confidence: {result.confidence}%
                            </span>
                          </div>
                        </div>
                      </div>
                      {!result.isBlocked ? (
                        <button onClick={handleBlockIP} disabled={isBlocking} className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-400 disabled:bg-slate-700 text-white rounded-lg transition-colors text-sm font-medium">
                          {isBlocking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                          Block IP
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-400 rounded-lg text-sm font-medium border border-green-500/20">
                          <CheckCircle className="w-4 h-4" />
                          Blocked
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-6 grid md:grid-cols-2 gap-6">
                    <InfoCard title="Network Details" rows={[
                      ["Country", result.country || "Unavailable"],
                      ["City", result.city || "Unavailable"],
                      ["ISP", result.isp || "Unavailable"],
                      ["Usage", result.details.usageType || "Unavailable"],
                      ["Last Reported", formatDate(result.lastReported)],
                    ]} />
                    <InfoCard title="Provider Status" rows={result.sources.map((source) => [source.name, `${source.status}: ${source.message}`])} />
                  </div>

                  <div className="px-6 pb-6 grid md:grid-cols-2 gap-6">
                    <div className="rounded-xl bg-slate-900/40 border border-slate-800 p-4">
                      <h4 className="text-white font-semibold mb-3">Threat Factors</h4>
                      {result.factors.length === 0 ? (
                        <p className="text-sm text-slate-500">No scoring factors available. Configure reputation providers for public IP scoring.</p>
                      ) : (
                        <div className="space-y-3">
                          {result.factors.map((factor) => (
                            <div key={factor.name}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-slate-300">{factor.name}</span>
                                <span className="text-cyan-300">{factor.value}/100</span>
                              </div>
                              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-cyan-500" style={{ width: `${factor.value}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="rounded-xl bg-slate-900/40 border border-slate-800 p-4">
                      <h4 className="text-white font-semibold mb-3">Threat Types</h4>
                      {result.threatTypes.length === 0 ? (
                        <p className="text-sm text-slate-500">No provider threat tags returned.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {result.threatTypes.map((type) => <span key={type} className="px-3 py-1 rounded-full bg-red-500/10 text-red-300 text-xs border border-red-500/20">{type}</span>)}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="glass rounded-2xl p-6 h-fit">
            <h3 className="text-lg font-semibold text-white mb-4">Real Scan History</h3>
            {scanHistory.length === 0 ? (
              <p className="text-sm text-slate-500">No backend scan history yet.</p>
            ) : (
              <div className="space-y-3">
                {scanHistory.map((scan) => (
                  <button key={`${scan.ip}-${scan.analyzedAt}`} onClick={() => { setResult(scan); setIpInput(scan.ip); inputRef.current?.focus(); }} className="w-full text-left p-3 rounded-xl bg-slate-900/50 hover:bg-cyan-500/10 transition-colors">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-sm text-cyan-300">{scan.ip}</span>
                      <span className={`text-xs px-2 py-1 rounded-full border ${classificationColor(scan.classification)}`}>{scan.classification}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{formatScore(scan.score)} | {formatDate(scan.analyzedAt)}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function InfoCard({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <div className="rounded-xl bg-slate-900/40 border border-slate-800 p-4">
      <h4 className="text-white font-semibold mb-3">{title}</h4>
      <div className="space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-4 text-sm">
            <span className="text-slate-400">{label}</span>
            <span className="text-right text-slate-200 break-words">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
