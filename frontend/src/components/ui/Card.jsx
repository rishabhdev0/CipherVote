import { clsx } from "clsx";
export default function Card({
  children,
  className = "",
  hover = true,
  flat = false,
  accent,
  padding = "p-5",
  onClick,
}) {
  const aB = {
    yellow: "border-l-yellow",
    red: "border-l-red",
    cyan: "border-l-cyan",
    green: "border-l-green",
    orange: "border-l-orange",
  };
  return (
    <div
      onClick={onClick}
      className={clsx(
        flat ? "card-flat" : "card",
        padding,
        accent && `border-l-4 ${aB[accent]}`,
        onClick && "cursor-pointer",
        className,
      )}
    >
      {children}
    </div>
  );
}
Card.Header = ({ children, className = "" }) => (
  <div className={clsx("flex items-center justify-between mb-4", className)}>
    {children}
  </div>
);
Card.Title = ({ children, className = "" }) => (
  <h3
    className={clsx(
      "text-[10px] font-bold tracking-normal uppercase text-slate-500",
      className,
    )}
  >
    {children}
  </h3>
);
Card.Body = ({ children, className = "" }) => (
  <div className={clsx("", className)}>{children}</div>
);
Card.Footer = ({ children, className = "" }) => (
  <div
    className={clsx(
      "mt-4 pt-4 border-t border-slate-200 flex items-center justify-between",
      className,
    )}
  >
    {children}
  </div>
);
export function StatCard({
  label,
  value,
  icon,
  accent,
  loading = false,
  className = "",
}) {
  return (
    <div className={clsx("card p-5 flex flex-col gap-1", className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-slate-500 font-medium tracking-wider uppercase">
            {label}
          </p>
          {loading ? (
            <div className="skeleton h-9 w-24 mt-1" />
          ) : (
            <p
              className={clsx("font-semibold text-4xl mt-1", {
                "text-blue-700": accent === "yellow",
                "text-cyan": accent === "cyan",
                "text-green": accent === "green",
                "text-red": accent === "red",
              })}
            >
              {value}
            </p>
          )}
        </div>
        {icon && (
          <div
            className={clsx("p-2.5 bg-elevated border border-slate-200 ml-3", {
              "text-blue-700": accent === "yellow",
              "text-cyan": accent === "cyan",
              "text-green": accent === "green",
              "text-red": accent === "red",
            })}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
