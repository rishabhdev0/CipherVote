import { AlertTriangle, CheckCircle2, Info, XCircle, X } from "lucide-react";
import { clsx } from "clsx";
import { useState } from "react";
const V = {
  info: {
    w: "bg-cyan/5 border-cyan/30 border-l-cyan",
    i: <Info size={16} className="text-cyan shrink-0 mt-0.5" />,
    t: "text-cyan",
  },
  success: {
    w: "bg-green/5 border-green/30 border-l-green",
    i: <CheckCircle2 size={16} className="text-green shrink-0 mt-0.5" />,
    t: "text-green",
  },
  warning: {
    w: "bg-blue-600/5 border-blue-600/30 border-l-yellow",
    i: <AlertTriangle size={16} className="text-blue-700 shrink-0 mt-0.5" />,
    t: "text-blue-700",
  },
  error: {
    w: "bg-red/5 border-red/30 border-l-red",
    i: <XCircle size={16} className="text-red shrink-0 mt-0.5" />,
    t: "text-red",
  },
};
export default function Alert({
  variant = "info",
  title,
  children,
  dismissible = false,
  className = "",
}) {
  const [v, setV] = useState(true);
  const c = V[variant];
  if (!v) return null;
  return (
    <div className={clsx("border border-l-4 p-4 flex gap-3", c.w, className)}>
      {c.i}
      <div className="flex-1 min-w-0">
        {title && (
          <p
            className={clsx(
              "text-xs font-bold uppercase tracking-wide mb-1",
              c.t,
            )}
          >
            {title}
          </p>
        )}
        <div className="text-sm text-slate-600">{children}</div>
      </div>
      {dismissible && (
        <button
          onClick={() => setV(false)}
          className="text-slate-500 hover:text-slate-950 transition-colors shrink-0"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
