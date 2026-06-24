import { clsx } from "clsx";
export default function Pagination({ page, pages, total, limit, onPage }) {
  if (pages <= 1) return null;
  const canPrev = page > 1,
    canNext = page < pages;
  const getPages = () => {
    const a = [];
    for (let i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || (i >= page - 2 && i <= page + 2)) a.push(i);
      else if (a[a.length - 1] !== "...") a.push("...");
    }
    return a;
  };
  return (
    <div className="flex items-center justify-between mt-4 px-1">
      <p className="text-xs text-slate-500">
        Showing{" "}
        <span className="text-slate-950 font-medium">
          {(page - 1) * limit + 1}–{Math.min(page * limit, total)}
        </span>{" "}
        of <span className="text-slate-950 font-medium">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={!canPrev}
          className="btn-ghost btn-sm px-2.5 py-1.5 disabled:opacity-30"
        >
          ←
        </button>
        {getPages().map((p, i) => (
          <button
            key={i}
            onClick={() => typeof p === "number" && onPage(p)}
            disabled={p === "..."}
            className={clsx(
              "btn-sm px-3 py-1.5 min-w-[32px]",
              p === page
                ? "btn-yellow"
                : "btn-ghost disabled:opacity-50 disabled:cursor-default",
            )}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onPage(page + 1)}
          disabled={!canNext}
          className="btn-ghost btn-sm px-2.5 py-1.5 disabled:opacity-30"
        >
          →
        </button>
      </div>
    </div>
  );
}
