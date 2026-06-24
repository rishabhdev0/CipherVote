import { clsx } from "clsx";
export default function Skeleton({ className = "" }) {
  return <div className={clsx("skeleton", className)} />;
}
export function SkeletonCard({ rows = 3 }) {
  return (
    <div className="card p-5">
      <Skeleton className="h-3 w-24 mb-4" />
      <Skeleton className="h-8 w-32 mb-3" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton
          key={i}
          className={clsx("h-3 mb-2", i === rows - 1 ? "w-3/4" : "w-full")}
        />
      ))}
    </div>
  );
}
export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="card-flat overflow-hidden">
      <div className="bg-elevated px-4 py-3 border-b border-slate-200">
        <div className="flex gap-8">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-16" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="px-4 py-3.5 border-b border-slate-200 flex gap-8"
        >
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton
              key={j}
              className={clsx("h-3", j === 0 ? "w-24" : "w-16")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
export function SkeletonStat() {
  return (
    <div className="card p-5">
      <Skeleton className="h-3 w-20 mb-2" />
      <Skeleton className="h-9 w-28" />
    </div>
  );
}
