import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Menu, X, Volume2, VolumeX, Cpu } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface NavigationProps {
  items: NavItem[];
  activeSection: string;
  onNavigate: (id: string) => void;
  lowPerformanceMode: boolean;
  setLowPerformanceMode: (val: boolean) => void;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
}

function playClickSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.frequency.setValueAtTime(1000, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.08);
    osc.type = "sine";
    
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) {}
}

function playToggleSound(enabled: boolean) {
  try {
    const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (enabled) {
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    } else {
      osc.frequency.setValueAtTime(900, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(450, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    }
    
    osc.type = "sine";
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch (e) {}
}

export default function Navigation({
  items,
  activeSection,
  onNavigate,
  lowPerformanceMode,
  setLowPerformanceMode,
  soundEnabled,
  setSoundEnabled,
}: NavigationProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    if (soundEnabled) {
      playClickSound();
    }
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      onNavigate(id);
    }
    setIsMobileOpen(false);
  };

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "glass-strong shadow-lg shadow-cyan-500/5"
            : "bg-white/[0.03] backdrop-blur-md border-b border-white/5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <motion.div
              className="flex items-center gap-3 cursor-pointer"
              whileHover={{ scale: 1.02 }}
              onClick={() => scrollToSection("hero")}
            >
              <div className="relative">
                <Shield className="w-8 h-8 text-cyan-400" />
                <div className="absolute inset-0 bg-cyan-400/20 blur-xl rounded-full" />
              </div>
              <div>
                <span className="font-display text-lg font-bold text-white tracking-wider">
                  CYBER
                </span>
                <span className="font-display text-lg font-bold text-cyan-400 tracking-wider">
                  SHIELD
                </span>
              </div>
            </motion.div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;

                return (
                  <motion.button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                      isActive
                        ? "text-cyan-400"
                        : "text-slate-400 hover:text-white"
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeNav"
                        className="absolute inset-0 bg-cyan-500/10 border border-cyan-500/20 rounded-lg"
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 30,
                        }}
                      />
                    )}
                    <Icon className="w-4 h-4 relative z-10" />
                    <span className="relative z-10">{item.label}</span>
                  </motion.button>
                );
              })}

              <div className="h-6 w-[1px] bg-white/10 mx-2" />

              {/* Settings Controls */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const nextVal = !soundEnabled;
                    if (nextVal) {
                      playToggleSound(true);
                    }
                    setSoundEnabled(nextVal);
                  }}
                  className={`p-2 rounded-lg transition-colors relative hover:bg-white/5 ${soundEnabled ? "text-cyan-400" : "text-slate-500"}`}
                  title={soundEnabled ? "Disable UI Sound Effects" : "Enable UI Sound Effects"}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
                
                <button
                  onClick={() => {
                    const nextVal = !lowPerformanceMode;
                    if (soundEnabled) {
                      playToggleSound(!nextVal);
                    }
                    setLowPerformanceMode(nextVal);
                  }}
                  className={`p-2 rounded-lg transition-colors relative hover:bg-white/5 ${lowPerformanceMode ? "text-yellow-500" : "text-cyan-400"}`}
                  title={lowPerformanceMode ? "Switch to Visual Mode" : "Switch to Performance Mode (Disable Heavy Render)"}
                >
                  <Cpu className="w-4 h-4" />
                  {lowPerformanceMode && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-yellow-500 rounded-full animate-ping" />
                  )}
                </button>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-slate-400 hover:text-white"
              onClick={() => setIsMobileOpen(!isMobileOpen)}
            >
              {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 glass-strong pt-20 px-4 md:hidden overflow-y-auto pb-8"
          >
            <div className="flex flex-col gap-2">
              {items.map((item, index) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;

                return (
                  <motion.button
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => scrollToSection(item.id)}
                    className={`flex items-center gap-3 px-4 py-4 rounded-xl text-left transition-colors ${
                      isActive
                        ? "bg-cyan-500/10 border border-cyan-500/20 text-cyan-400"
                        : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </motion.button>
                );
              })}

              <div className="h-[1px] bg-white/5 my-2" />
              
              {/* Settings Controls */}
              <div className="flex items-center justify-around py-3 bg-slate-900/40 rounded-xl border border-white/5">
                <button
                  onClick={() => {
                    const nextVal = !soundEnabled;
                    if (nextVal) {
                      playToggleSound(true);
                    }
                    setSoundEnabled(nextVal);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${soundEnabled ? "text-cyan-400" : "text-slate-500"}`}
                >
                  {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  <span>Sound: {soundEnabled ? "ON" : "OFF"}</span>
                </button>
                
                <button
                  onClick={() => {
                    const nextVal = !lowPerformanceMode;
                    if (soundEnabled) {
                      playToggleSound(!nextVal);
                    }
                    setLowPerformanceMode(nextVal);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${lowPerformanceMode ? "text-yellow-500" : "text-cyan-400"}`}
                >
                  <Cpu className="w-5 h-5" />
                  <span>Perf Mode: {lowPerformanceMode ? "ON" : "OFF"}</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
