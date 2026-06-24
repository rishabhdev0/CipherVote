import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { clsx } from "clsx";
const V = {
  yellow: "btn-yellow",
  red: "btn-red",
  cyan: "btn-cyan",
  green: "btn-green",
  orange: "btn-orange",
  ghost: "btn-ghost",
  "outline-yellow": "btn-outline-yellow",
  "outline-red": "btn-outline-red",
  "outline-cyan": "btn-outline-cyan",
  "outline-green": "btn-outline-green",
};
const S = { sm: "btn-sm", md: "", lg: "btn-lg" };
const Button = forwardRef(
  (
    {
      children,
      variant = "yellow",
      size = "md",
      loading = false,
      disabled = false,
      icon,
      iconRight,
      fullWidth = false,
      className = "",
      onClick,
      type = "button",
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={clsx(V[variant], S[size], fullWidth && "w-full", className)}
      {...props}
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin shrink-0" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children && <span>{children}</span>}
      {iconRight && !loading && <span className="shrink-0">{iconRight}</span>}
    </button>
  ),
);
Button.displayName = "Button";
export default Button;
