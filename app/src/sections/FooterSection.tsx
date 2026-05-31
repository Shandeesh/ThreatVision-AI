import { motion } from "framer-motion";
import {
  Shield,
  Github,
  Linkedin,
  Mail,
  ExternalLink,
  Heart,
  Code,
  BookOpen,
  Users,
  Award,
} from "lucide-react";

export default function FooterSection() {
  return (
    <footer className="py-16 relative border-t border-cyan-500/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Project Info Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass rounded-2xl p-8 mb-12"
        >
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-cyan-500/10 rounded-xl">
                  <Shield className="w-8 h-8 text-cyan-400" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-white">
                    CYBER<span className="text-cyan-400">SHIELD</span>
                  </h3>
                  <p className="text-sm text-slate-400">
                    Cybersecurity Capstone Project
                  </p>
                </div>
              </div>
              <p className="text-slate-400 mb-4">
                This project was developed as part of the Cybersecurity
                curriculum. It implements practical live threat
                intelligence, IP reputation analysis, and network monitoring
                using industry-standard tools and APIs.
              </p>
              <div className="flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-sm">
                  <Code className="w-3 h-3" />
                  Python
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-sm">
                  <Shield className="w-3 h-3" />
                  VirusTotal API
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-sm">
                  <BookOpen className="w-3 h-3" />
                  AbuseIPDB
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-sm">
                  <Users className="w-3 h-3" />
                  Wireshark
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-900/50 rounded-xl">
                <Award className="w-6 h-6 text-cyan-400 mb-2" />
                <div className="text-sm font-semibold text-white mb-1">
                  Project Type
                </div>
                <div className="text-sm text-slate-400">
                  Major Project - Cybersecurity
                </div>
              </div>
              <div className="p-4 bg-slate-900/50 rounded-xl">
                <BookOpen className="w-6 h-6 text-cyan-400 mb-2" />
                <div className="text-sm font-semibold text-white mb-1">
                  Subject
                </div>
                <div className="text-sm text-slate-400">
                  Network Intelligence
                </div>
              </div>
              <div className="p-4 bg-slate-900/50 rounded-xl">
                <Shield className="w-6 h-6 text-cyan-400 mb-2" />
                <div className="text-sm font-semibold text-white mb-1">
                  Focus Area
                </div>
                <div className="text-sm text-slate-400">
                  Threat Detection & Analysis
                </div>
              </div>
              <div className="p-4 bg-slate-900/50 rounded-xl">
                <Code className="w-6 h-6 text-cyan-400 mb-2" />
                <div className="text-sm font-semibold text-white mb-1">
                  Tech Stack
                </div>
                <div className="text-sm text-slate-400">
                  React, Three.js, Python
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Footer Content */}
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-6 h-6 text-cyan-400" />
              <span className="font-display text-lg font-bold text-white">
                CYBER<span className="text-cyan-400">SHIELD</span>
              </span>
            </div>
            <p className="text-slate-400 text-sm mb-4 max-w-md">
              Advanced Malicious IP Intelligence System for real-time threat
              detection, network monitoring, and cybersecurity analysis.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/Shandeesh"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg glass text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="https://www.linkedin.com/in/shandeesh-r-p-926538303?utm_source=share_via&utm_content=profile&utm_medium=member_android"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg glass text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-colors"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a
                href="mailto:shandeeshrp10@gmail.com"
                className="p-2 rounded-lg glass text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-colors"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2">
              {[
                { label: "Dashboard", href: "#dashboard" },
                { label: "IP Scanner", href: "#scanner" },
                { label: "Live Traffic", href: "#traffic" },
                { label: "Threat Map", href: "#threatmap" },
                { label: "IDS Feed", href: "#ids-feed" },
                { label: "Mitigation", href: "#mitigation" },
              ].map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">
              Resources
            </h4>
            <ul className="space-y-2">
              {[
                { label: "VirusTotal API", href: "#" },
                { label: "AbuseIPDB", href: "#" },
                { label: "Wireshark Docs", href: "#" },
                { label: "MITRE ATT&CK", href: "#" },
                { label: "NIST Framework", href: "#" },
              ].map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              &copy; 2026 CyberShield. Cybersecurity Capstone Project. All rights
              reserved.
            </p>
            <p className="text-sm text-slate-500 flex items-center gap-1">
              Built with <Heart className="w-4 h-4 text-red-400" /> for
              Cybersecurity Education
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
