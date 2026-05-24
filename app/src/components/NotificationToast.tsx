import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  X,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useNotificationContext } from "@/hooks/useNotifications";

const icons = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
};

const colors = {
  success: "border-green-500/30 bg-green-500/10 text-green-400",
  warning: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
  error: "border-red-500/30 bg-red-500/10 text-red-400",
  info: "border-cyan-500/30 bg-cyan-500/10 text-cyan-400",
};

export default function NotificationToast() {
  const { notifications, removeNotification, soundEnabled, setSoundEnabled } = useNotificationContext();

  return (
    <>
      {/* Sound Toggle */}
      <div className="fixed top-20 right-4 z-50">
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-2 glass rounded-lg hover:bg-slate-800/50 transition-colors"
          title={soundEnabled ? "Mute alerts" : "Enable alerts"}
        >
          {soundEnabled ? (
            <Volume2 className="w-4 h-4 text-cyan-400" />
          ) : (
            <VolumeX className="w-4 h-4 text-slate-500" />
          )}
        </button>
      </div>

      {/* Notifications Container */}
      <div className="fixed top-24 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
        <AnimatePresence>
          {notifications.map((notification) => {
            const Icon = icons[notification.type];
            return (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: 100, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 100, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className={`glass rounded-xl p-4 border ${colors[notification.type]} shadow-lg`}
              >
                <div className="flex items-start gap-3">
                  <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    notification.type === "success" ? "text-green-400" :
                    notification.type === "warning" ? "text-yellow-400" :
                    notification.type === "error" ? "text-red-400" :
                    "text-cyan-400"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white">
                      {notification.title}
                    </div>
                    <div className="text-xs text-slate-300 mt-0.5">
                      {notification.message}
                    </div>
                  </div>
                  <button
                    onClick={() => removeNotification(notification.id)}
                    className="p-1 hover:bg-white/10 rounded transition-colors flex-shrink-0"
                  >
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </>
  );
}
