import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Bot,
  BrainCircuit,
  Loader2,
  Send,
  Server,
  Shield,
  Sparkles,
  User,
} from "lucide-react";
import { api, getErrorMessage } from "@/lib/liveApi";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  error?: boolean;
}

export default function AIAssistantSection() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Ask about the live dashboard, recent IDS events, firewall policy, packet capture readiness, or a specific scan. Responses come from the backend AI endpoint only.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || isTyping) return;

    const userMessage: Message = { id: `user-${Date.now()}`, role: "user", content, timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await api.post<{ content: string; model: string }>("/api/assistant", { message: content });
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.data.content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (requestError) {
      const assistantMessage: Message = {
        id: `assistant-error-${Date.now()}`,
        role: "assistant",
        content: getErrorMessage(requestError),
        timestamp: new Date(),
        error: true,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const quickQuestions = [
    "What is the current firewall readiness?",
    "Summarize recent IDS alerts.",
    "What providers are missing or unconfigured?",
    "How should I investigate the latest suspicious source?",
  ];

  return (
    <section id="ai-assistant" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-4">
            <BrainCircuit className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-mono text-purple-400">BACKEND AI ASSISTANT</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">AI <span className="text-purple-400">ASSISTANT</span></h2>
          <p className="text-slate-400 max-w-2xl mx-auto">Uses the backend OpenAI endpoint and current live console context. If OpenAI is not configured, it reports that explicitly.</p>
        </motion.div>

        <div className="grid lg:grid-cols-4 gap-8">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="lg:col-span-3 glass rounded-2xl overflow-hidden flex flex-col" style={{ height: "600px" }}>
            <div className="p-4 border-b border-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center"><Bot className="w-6 h-6 text-purple-400" /></div>
              <div><div className="text-white font-semibold">ThreatVision AI</div><div className="flex items-center gap-1 text-xs text-slate-400"><div className="w-1.5 h-1.5 bg-slate-400 rounded-full" />Backend endpoint</div></div>
              <div className="ml-auto flex items-center gap-2"><Sparkles className="w-4 h-4 text-purple-400" /><span className="text-xs text-purple-400">Live context</span></div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <motion.div key={message.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  {message.role === "assistant" && <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${message.error ? "bg-red-500/10" : "bg-purple-500/10"}`}>{message.error ? <AlertTriangle className="w-4 h-4 text-red-400" /> : <Bot className="w-4 h-4 text-purple-400" />}</div>}
                  <div className={`max-w-[80%] rounded-xl px-4 py-3 ${message.role === "user" ? "bg-cyan-500/20 text-cyan-100" : message.error ? "bg-red-500/10 text-red-200 border border-red-500/20" : "bg-slate-800/50 text-slate-200"}`}>
                    <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                    <div className="text-xs text-slate-500 mt-1">{message.timestamp.toLocaleTimeString()}</div>
                  </div>
                  {message.role === "user" && <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0"><User className="w-4 h-4 text-cyan-400" /></div>}
                </motion.div>
              ))}
              {isTyping && <div className="flex gap-3"><div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0"><Bot className="w-4 h-4 text-purple-400" /></div><div className="bg-slate-800/50 rounded-xl px-4 py-3"><div className="flex items-center gap-2"><Loader2 className="w-4 h-4 text-purple-400 animate-spin" /><span className="text-sm text-slate-400">Waiting for backend AI response...</span></div></div></div>}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-slate-800">
              <div className="flex gap-3">
                <input ref={inputRef} type="text" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && handleSend()} placeholder="Ask about live threats, firewall, provider status, or capture readiness..." className="flex-1 px-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 outline-none transition-all" />
                <button onClick={handleSend} disabled={!input.trim() || isTyping} className="px-6 py-3 bg-purple-500 hover:bg-purple-400 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex items-center gap-2"><Send className="w-4 h-4" /></button>
              </div>
            </div>
          </motion.div>

          <div className="space-y-4">
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="glass rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Questions</h3>
              <div className="space-y-2">
                {quickQuestions.map((question, index) => <button key={question} onClick={() => { setInput(question); inputRef.current?.focus(); }} className="w-full text-left p-3 rounded-xl bg-slate-900/50 hover:bg-purple-500/10 text-sm text-slate-300 hover:text-purple-300 transition-colors border border-transparent hover:border-purple-500/20" style={{ transitionDelay: `${index * 20}ms` }}>{question}</button>)}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="glass rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Live Context</h3>
              <div className="space-y-3">
                {[{ icon: Shield, label: "Firewall State", desc: "Policy and recent actions" }, { icon: Server, label: "Capture Readiness", desc: "tshark and interface status" }, { icon: AlertTriangle, label: "IDS Alerts", desc: "Recent live detections" }, { icon: BrainCircuit, label: "Provider Status", desc: "Configured reputation APIs" }].map((capability) => {
                  const Icon = capability.icon;
                  return <div key={capability.label} className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center"><Icon className="w-4 h-4 text-purple-400" /></div><div><div className="text-sm font-medium text-white">{capability.label}</div><div className="text-xs text-slate-400">{capability.desc}</div></div></div>;
                })}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
