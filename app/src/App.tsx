import { useEffect, useState } from "react";
import {
  Shield,
  Activity,
  Globe,
  Scan,
  BookOpen,
  Zap,
  Lock,
  Bot,
  Bomb,
} from "lucide-react";
import { motion, AnimatePresence, useScroll, useSpring } from "framer-motion";
import type { ReactNode } from "react";
import ParticleBackground from "@/components/ParticleBackground";
import Navigation from "@/components/Navigation";
import NotificationToast from "@/components/NotificationToast";
import HeroSection from "@/sections/HeroSection";
import DashboardSection from "@/sections/DashboardSection";
import IPScannerSection from "@/sections/IPScannerSection";
import LiveTrafficSection from "@/sections/LiveTrafficSection";
import ThreatGlobeSection from "@/sections/ThreatGlobeSection";
import FirewallControlSection from "@/sections/FirewallControlSection";
import AIAssistantSection from "@/sections/AIAssistantSection";
import IdsFeedSection from "@/sections/IdsFeedSection";
import MitigationSection from "@/sections/MitigationSection";
import FooterSection from "@/sections/FooterSection";
import { NotificationContext, useNotifications } from "@/hooks/useNotifications";



function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 28,
    restDelta: 0.001,
  });

  return (
    <motion.div
      className="fixed left-0 right-0 top-0 z-[60] h-1 origin-left bg-gradient-to-r from-cyan-300 via-sky-400 to-violet-400 shadow-[0_0_24px_rgba(56,189,248,0.65)]"
      style={{ scaleX }}
    />
  );
}

function AmbientGlassField() {
  return (
    <div className="ambient-glass-field" aria-hidden="true">
      <div className="ambient-pane ambient-pane-a" />
      <div className="ambient-pane ambient-pane-b" />
      <div className="ambient-pane ambient-pane-c" />
    </div>
  );
}

function ScrollRevealSection({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      className="scroll-reveal-section"
      initial={{ opacity: 0, y: 56, scale: 0.985, filter: "blur(10px)" }}
      whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.16, margin: "-8% 0px -8% 0px" }}
      transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

function App() {
  const [activeSection, setActiveSection] = useState("hero");
  const [isLoaded, setIsLoaded] = useState(false);
  const [lowPerformanceMode, setLowPerformanceMode] = useState(false);
  const { notifications, addNotification, removeNotification, clearNotifications, soundEnabled, setSoundEnabled, playAlertSound } =
    useNotifications();

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const navItems = [
    { id: "hero", label: "Home", icon: Shield },
    { id: "dashboard", label: "Dashboard", icon: Activity },
    { id: "scanner", label: "IP Scanner", icon: Scan },
    { id: "traffic", label: "Live Traffic", icon: Zap },
    { id: "threatmap", label: "Threat Map", icon: Globe },
    { id: "firewall", label: "Firewall", icon: Lock },
    { id: "ids-feed", label: "IDS Feed", icon: Bomb },
    { id: "ai-assistant", label: "AI Assistant", icon: Bot },
    { id: "mitigation", label: "Mitigation", icon: BookOpen },
  ];

  const sections = [
    { key: "hero", node: <HeroSection lowPerformanceMode={lowPerformanceMode} /> },
    { key: "dashboard", node: <DashboardSection /> },
    { key: "scanner", node: <IPScannerSection /> },
    { key: "traffic", node: <LiveTrafficSection /> },
    { key: "threatmap", node: <ThreatGlobeSection lowPerformanceMode={lowPerformanceMode} /> },
    { key: "firewall", node: <FirewallControlSection /> },
    { key: "ids-feed", node: <IdsFeedSection /> },
    { key: "ai-assistant", node: <AIAssistantSection /> },
    { key: "mitigation", node: <MitigationSection /> },
    { key: "footer", node: <FooterSection /> },
  ];

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification, clearNotifications, soundEnabled, setSoundEnabled, playAlertSound }}>
      <div className="windows-glass-shell min-h-screen text-white relative overflow-x-hidden">
        <ScrollProgress />

        {/* Particle Background */}
        <ParticleBackground lowPerformanceMode={lowPerformanceMode} />
        <AmbientGlassField />

        {/* Loading Screen */}
        <AnimatePresence>
          {!isLoaded && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="windows-glass-loading fixed inset-0 z-50 flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="text-center"
              >
                <Shield className="w-16 h-16 text-cyan-400 mx-auto mb-4 animate-pulse" />
                <div className="font-display text-xl text-cyan-400">
                  LOADING THREATVISION AI...
                </div>
                <div className="text-sm text-slate-500 mt-2 font-mono">
                  Initializing AI threat engine...
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notification Toast */}
        <NotificationToast />

        {/* Navigation */}
        <Navigation
          items={navItems}
          activeSection={activeSection}
          onNavigate={setActiveSection}
          lowPerformanceMode={lowPerformanceMode}
          setLowPerformanceMode={setLowPerformanceMode}
          soundEnabled={soundEnabled}
          setSoundEnabled={setSoundEnabled}
        />

        {/* Main Content */}
        <main className="relative z-10">
          {sections.map((section, index) => (
            <ScrollRevealSection key={section.key} delay={index === 0 ? 0 : 0.04}>
              {section.node}
            </ScrollRevealSection>
          ))}
        </main>
      </div>
    </NotificationContext.Provider>
  );
}

export default App;
