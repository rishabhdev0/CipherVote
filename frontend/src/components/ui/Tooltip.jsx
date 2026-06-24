import { useState } from "react";
import { clsx } from "clsx";
export default function Tooltip({
  children,
  content,
  placement = "top",
  className = "",
}) {
  const [v, setV] = useState(false);
  const P = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };
  return (
    <div
      className={clsx("relative inline-flex", className)}
      onMouseEnter={() => setV(true)}
      onMouseLeave={() => setV(false)}
    >
      {children}
      {v && content && (
        <div
          className={clsx(
            "absolute z-50 px-2.5 py-1.5 text-xs text-slate-950 bg-elevated border border-slate-200 whitespace-nowrap pointer-events-none",
            P[placement],
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
