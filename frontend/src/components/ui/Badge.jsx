import { clsx } from "clsx";
const V = {
  yellow: "badge-yellow",
  red: "badge-red",
  cyan: "badge-cyan",
  green: "badge-green",
  orange: "badge-orange",
  gray: "badge-gray",
};
export default function Badge({
  children,
  variant = "gray",
  dot = false,
  pulse = false,
  size = "md",
  className = "",
}) {
  return (
    <span
      className={clsx(
        V[variant],
        size === "sm" && "text-[9px] px-1.5 py-0.5",
        className,
      )}
    >
      {dot && (
        <span
          className={clsx(
            "w-1.5 h-1.5 rounded-full inline-block",
            pulse && "animate-pulse",
            {
              "bg-blue-600": variant === "yellow",
              "bg-red": variant === "red",
              "bg-cyan": variant === "cyan",
              "bg-green": variant === "green",
              "bg-orange": variant === "orange",
              "bg-slate-500": variant === "gray",
            },
          )}
        />
      )}
      {children}
    </span>
  );
}
export function StatusBadge({ status, size }) {
  const C = {
    VERIFIED: { v: "green", l: "Verified" },
    ACTIVE: { v: "green", l: "Active" },
    RESULTS_DECLARED: { v: "cyan", l: "Declared" },
    PENDING: { v: "yellow", l: "Pending" },
    SUBMITTED: { v: "yellow", l: "Submitted" },
    APPROVED: { v: "green", l: "Approved" },
    DRAFT: { v: "yellow", l: "Draft" },
    SELECTED: { v: "green", l: "Selected" },
    REJECTED: { v: "red", l: "Rejected" },
    REVOKED: { v: "orange", l: "Revoked" },
    WITHDRAWN: { v: "gray", l: "Withdrawn" },
    BLACKLISTED: { v: "red", l: "Blacklisted" },
    PAUSED: { v: "orange", l: "Paused" },
    CLOSED: { v: "gray", l: "Closed" },
    CONFIRMED: { v: "green", l: "Confirmed" },
  };
  const c = C[status] || { v: "gray", l: status };
  return (
    <Badge variant={c.v} dot pulse={c.v === "green"} size={size}>
      {c.l}
    </Badge>
  );
}
export function TierBadge({ tier, size }) {
  const C = {
    BRONZE: { v: "orange", l: "Bronze" },
    SILVER: { v: "gray", l: "Silver" },
    GOLD: { v: "yellow", l: "Gold" },
    PLATINUM: { v: "cyan", l: "Platinum" },
  };
  const c = C[tier] || C.BRONZE;
  return (
    <Badge variant={c.v} size={size}>
      {c.l}
    </Badge>
  );
}
