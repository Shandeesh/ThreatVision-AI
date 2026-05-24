import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Shield,
  Lock,
  Filter,
  Eye,
  Bell,
  FileText,
  ChevronDown,
  Server,
  Network,
  HardDrive,
  Users,
  Zap,
} from "lucide-react";

interface Strategy {
  id: number;
  title: string;
  description: string;
  icon: LucideIcon;
  steps: string[];
  priority: "Critical" | "High" | "Medium" | "Low";
  category: string;
}

const strategies: Strategy[] = [
  {
    id: 1,
    title: "Block Malicious IPs",
    description:
      "Immediately block identified malicious IP addresses at the firewall level to prevent further attacks.",
    icon: Shield,
    priority: "Critical",
    category: "Firewall",
    steps: [
      "Add malicious IPs to firewall blacklist",
      "Configure iptables rules: iptables -A INPUT -s [IP] -j DROP",
      "Update AWS Security Groups / Azure NSGs",
      "Implement rate limiting for suspicious traffic",
      "Set up automated blocking via fail2ban",
    ],
  },
  {
    id: 2,
    title: "Network Segmentation",
    description:
      "Isolate critical systems and implement network segmentation to limit lateral movement.",
    icon: Network,
    priority: "High",
    category: "Network",
    steps: [
      "Create VLANs for different security zones",
      "Implement DMZ for public-facing services",
      "Configure inter-VLAN ACLs",
      "Deploy micro-segmentation policies",
      "Regular network topology reviews",
    ],
  },
  {
    id: 3,
    title: "Intrusion Detection System",
    description:
      "Deploy IDS/IPS systems to monitor and automatically respond to suspicious activities.",
    icon: Eye,
    priority: "High",
    category: "Monitoring",
    steps: [
      "Install and configure Snort or Suricata",
      "Set up alert rules for known attack patterns",
      "Configure automated response actions",
      "Regular signature updates",
      "Integrate with SIEM for correlation",
    ],
  },
  {
    id: 4,
    title: "Access Control Hardening",
    description:
      "Strengthen authentication and authorization mechanisms across all systems.",
    icon: Lock,
    priority: "Critical",
    category: "Access",
    steps: [
      "Enforce multi-factor authentication (MFA)",
      "Implement least privilege access",
      "Rotate credentials regularly",
      "Disable unused accounts and services",
      "Deploy privileged access management (PAM)",
    ],
  },
  {
    id: 5,
    title: "Traffic Filtering",
    description:
      "Implement advanced traffic filtering to block malicious requests and DDoS attacks.",
    icon: Filter,
    priority: "High",
    category: "Firewall",
    steps: [
      "Deploy Web Application Firewall (WAF)",
      "Configure DDoS mitigation rules",
      "Implement geo-blocking if applicable",
      "Set up traffic rate limiting",
      "Use CDN for traffic distribution",
    ],
  },
  {
    id: 6,
    title: "Incident Response Plan",
    description:
      "Establish clear incident response procedures for handling security breaches.",
    icon: Bell,
    priority: "Critical",
    category: "Process",
    steps: [
      "Create incident response team",
      "Define escalation procedures",
      "Document containment strategies",
      "Establish communication protocols",
      "Conduct regular response drills",
    ],
  },
  {
    id: 7,
    title: "Log Analysis & SIEM",
    description:
      "Centralize and analyze security logs to detect patterns and improve threat detection.",
    icon: FileText,
    priority: "Medium",
    category: "Monitoring",
    steps: [
      "Deploy SIEM solution (Splunk, ELK, etc.)",
      "Configure log forwarding from all systems",
      "Create correlation rules for threat detection",
      "Set up real-time alerting dashboards",
      "Regular log review and analysis",
    ],
  },
  {
    id: 8,
    title: "System Hardening",
    description:
      "Apply security hardening to all operating systems, applications, and network devices.",
    icon: HardDrive,
    priority: "High",
    category: "System",
    steps: [
      "Apply latest security patches",
      "Disable unnecessary services",
      "Configure secure baselines (CIS)",
      "Enable audit logging",
      "Regular vulnerability scans",
    ],
  },
  {
    id: 9,
    title: "Security Awareness Training",
    description:
      "Train employees on cybersecurity best practices and threat recognition.",
    icon: Users,
    priority: "Medium",
    category: "Training",
    steps: [
      "Conduct phishing simulation exercises",
      "Provide security awareness training",
      "Establish clear security policies",
      "Create incident reporting procedures",
      "Regular security updates and briefings",
    ],
  },
  {
    id: 10,
    title: "Backup & Recovery",
    description:
      "Implement robust backup strategies and disaster recovery procedures.",
    icon: Server,
    priority: "Critical",
    category: "Recovery",
    steps: [
      "Implement 3-2-1 backup strategy",
      "Regular backup testing and validation",
      "Store backups offline/air-gapped",
      "Document recovery procedures",
      "Test disaster recovery plan regularly",
    ],
  },
];

const categories = [
  { name: "All", icon: Shield },
  { name: "Firewall", icon: Filter },
  { name: "Network", icon: Network },
  { name: "Monitoring", icon: Eye },
  { name: "Access", icon: Lock },
  { name: "System", icon: Server },
  { name: "Process", icon: FileText },
  { name: "Training", icon: Users },
  { name: "Recovery", icon: HardDrive },
];

function getPriorityColor(priority: "Critical" | "High" | "Medium" | "Low") {
  switch (priority) {
    case "Critical":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    case "High":
      return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    case "Medium":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    default:
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  }
}

function StrategyCard({ strategy }: { strategy: Strategy }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const Icon = strategy.icon;

  return (
    <motion.div
      layout
      className="glass rounded-2xl overflow-hidden cyber-card"
    >
      <div
        className="p-6 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-4">
          <div
            className={`p-3 rounded-xl ${
              strategy.priority === "Critical"
                ? "bg-red-500/10"
                : strategy.priority === "High"
                ? "bg-orange-500/10"
                : "bg-cyan-500/10"
            }`}
          >
            <Icon
              className={`w-6 h-6 ${
                strategy.priority === "Critical"
                  ? "text-red-400"
                  : strategy.priority === "High"
                  ? "text-orange-400"
                  : "text-cyan-400"
              }`}
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-white">
                {strategy.title}
              </h3>
              <span
                className={`text-xs px-2 py-0.5 rounded-full border ${getPriorityColor(
                  strategy.priority
                )}`}
              >
                {strategy.priority}
              </span>
            </div>
            <p className="text-sm text-slate-400 mb-3">
              {strategy.description}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Category: {strategy.category}
              </span>
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-5 h-5 text-slate-400" />
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 pt-2 border-t border-slate-800">
              <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                Implementation Steps
              </h4>
              <div className="space-y-2">
                {strategy.steps.map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/50"
                  >
                    <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-cyan-400">
                        {i + 1}
                      </span>
                    </div>
                    <span className="text-sm text-slate-300">{step}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function MitigationSection() {
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredStrategies =
    activeCategory === "All"
      ? strategies
      : strategies.filter((s) => s.category === activeCategory);

  const completionRate = 65;

  return (
    <section id="mitigation" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-4">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-mono text-cyan-400">
              MITIGATION STRATEGIES
            </span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
            SECURITY <span className="text-cyan-400">MITIGATION</span> PLAYBOOK
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Comprehensive mitigation strategies and recommendations to protect
            your infrastructure against identified threats.
          </p>
        </motion.div>

        {/* Progress Overview */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass rounded-2xl p-6 mb-8"
        >
          <div className="grid sm:grid-cols-3 gap-6 items-center">
            <div>
              <div className="text-sm text-slate-400 mb-1">
                Implementation Progress
              </div>
              <div className="text-3xl font-bold text-white">
                {completionRate}%
              </div>
            </div>
            <div className="sm:col-span-2">
              <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${completionRate}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-slate-500">
                <span>0% - Not Started</span>
                <span>100% - Fully Implemented</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800">
            {[
              {
                label: "Critical",
                count: strategies.filter((s) => s.priority === "Critical").length,
                color: "text-red-400",
              },
              {
                label: "High",
                count: strategies.filter((s) => s.priority === "High").length,
                color: "text-orange-400",
              },
              {
                label: "Medium",
                count: strategies.filter((s) => s.priority === "Medium").length,
                color: "text-yellow-400",
              },
              {
                label: "Low",
                count: strategies.filter((s) => s.priority === "Low").length,
                color: "text-blue-400",
              },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className={`text-2xl font-bold ${item.color}`}>
                  {item.count}
                </div>
                <div className="text-xs text-slate-400">{item.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Category Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-wrap gap-2 mb-8"
        >
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(cat.name)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeCategory === cat.name
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                    : "glass text-slate-400 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4" />
                {cat.name}
              </button>
            );
          })}
        </motion.div>

        {/* Strategies Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {filteredStrategies.map((strategy, i) => (
            <motion.div
              key={strategy.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <StrategyCard strategy={strategy} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
