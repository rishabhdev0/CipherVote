import { forwardRef, useState } from "react";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { clsx } from "clsx";
const Input = forwardRef(
  (
    {
      label,
      error,
      hint,
      icon,
      type = "text",
      className = "",
      inputClass = "",
      required,
      disabled,
      ...props
    },
    ref,
  ) => {
    const [show, setShow] = useState(false);
    const isPwd = type === "password";
    const t = isPwd ? (show ? "text" : "password") : type;
    return (
      <div className={clsx("w-full", className)}>
        {label && (
          <label className="label">
            {label}
            {required && <span className="text-red ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            type={t}
            disabled={disabled}
            className={clsx(
              "input",
              icon && "pl-10",
              isPwd && "pr-10",
              error && "input-error",
              disabled && "opacity-50 cursor-not-allowed",
              inputClass,
            )}
            {...props}
          />
          {isPwd && (
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-950"
            >
              {show ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-xs text-red flex items-center gap-1">
            <AlertCircle size={11} />
            {error}
          </p>
        )}
        {!error && hint && (
          <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";
export default Input;
export const Textarea = forwardRef(
  (
    { label, error, hint, rows = 4, className = "", required, ...props },
    ref,
  ) => (
    <div className={clsx("w-full", className)}>
      {label && (
        <label className="label">
          {label}
          {required && <span className="text-red ml-1">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        rows={rows}
        className={clsx("input resize-none", error && "input-error")}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-xs text-red flex items-center gap-1">
          <AlertCircle size={11} />
          {error}
        </p>
      )}
      {!error && hint && (
        <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      )}
    </div>
  ),
);
Textarea.displayName = "Textarea";
export const Select = forwardRef(
  (
    {
      label,
      error,
      hint,
      options = [],
      placeholder,
      className = "",
      required,
      ...props
    },
    ref,
  ) => (
    <div className={clsx("w-full", className)}>
      {label && (
        <label className="label">
          {label}
          {required && <span className="text-red ml-1">*</span>}
        </label>
      )}
      <select
        ref={ref}
        className={clsx(
          "input appearance-none cursor-pointer",
          error && "input-error",
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1.5 text-xs text-red flex items-center gap-1">
          <AlertCircle size={11} />
          {error}
        </p>
      )}
    </div>
  ),
);
Select.displayName = "Select";
