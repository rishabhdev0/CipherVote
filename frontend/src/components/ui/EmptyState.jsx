import { clsx } from "clsx";
export default function EmptyState({
  icon,
  title = "Nothing here",
  description,
  action,
  className = "",
  size = "md",
}) {
  const S = { sm: "py-8", md: "py-16", lg: "py-24" };
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center text-center px-4",
        S[size],
        className,
      )}
    >
      {icon && (
        <div className="text-slate-400 mb-4 p-4 border border-slate-200 bg-surface inline-flex">
          {icon}
        </div>
      )}
      <h3 className="font-semibold text-2xl text-slate-600 tracking-wide mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-slate-500 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
