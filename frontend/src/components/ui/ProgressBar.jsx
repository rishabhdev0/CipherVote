import { clsx } from "clsx";
import { motion } from "framer-motion";
export default function ProgressBar({
  value = 0,
  max = 100,
  color = "yellow",
  label,
  showValue = false,
  size = "md",
  animated = true,
  className = "",
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const H = { sm: "h-1", md: "h-2", lg: "h-3", xl: "h-4" };
  const C = {
    yellow: "bg-blue-600",
    red: "bg-red",
    cyan: "bg-cyan",
    green: "bg-green",
    orange: "bg-orange",
  };
  return (
    <div className={clsx("w-full", className)}>
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && (
            <span className="text-xs text-slate-500 font-medium">{label}</span>
          )}
          {showValue && (
            <span className="text-xs font-bold text-slate-950">
              {pct.toFixed(1)}%
            </span>
          )}
        </div>
      )}
      <div
        className={clsx(
          "w-full bg-elevated border border-slate-200 overflow-hidden",
          H[size],
        )}
      >
        <motion.div
          className={clsx("h-full", C[color])}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: animated ? 0.8 : 0, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
