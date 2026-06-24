import { clsx } from "clsx";
export default function LiveIndicator({
  label = "LIVE",
  color = "green",
  className = "",
  size = "md",
}) {
  const ds = { sm: "w-1.5 h-1.5", md: "w-2 h-2", lg: "w-2.5 h-2.5" };
  const ts = { sm: "text-[9px]", md: "text-xs", lg: "text-sm" };
  const c = {
    green: "bg-green",
    yellow: "bg-blue-600",
    red: "bg-red",
    cyan: "bg-cyan",
  };
  const tc = {
    green: "text-green",
    yellow: "text-blue-700",
    red: "text-red",
    cyan: "text-cyan",
  };
  return (
    <div className={clsx("flex items-center gap-2", className)}>
      <span className="relative flex">
        <span
          className={clsx(
            "animate-ping absolute inline-flex rounded-full opacity-75",
            ds[size],
            c[color],
          )}
        />
        <span
          className={clsx(
            "relative inline-flex rounded-full",
            ds[size],
            c[color],
          )}
        />
      </span>
      <span
        className={clsx(
          "font-bold tracking-normal uppercase",
          ts[size],
          tc[color],
        )}
      >
        {label}
      </span>
    </div>
  );
}
