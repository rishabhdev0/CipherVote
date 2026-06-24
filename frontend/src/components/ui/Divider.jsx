import { clsx } from "clsx";
export default function Divider({ label, className = "" }) {
  if (!label) return <div className={clsx("divider", className)} />;
  return (
    <div className={clsx("flex items-center gap-3", className)}>
      <div className="flex-1 h-px bg-border" />
      <span className="text-[9px] font-bold tracking-normal uppercase text-slate-400">
        {label}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}
