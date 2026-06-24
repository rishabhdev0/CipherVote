import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { clsx } from "clsx";
const S = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };
export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md",
  closable = true,
  className = "",
  accent,
}) {
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape" && closable) onClose?.();
    };
    if (open) document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, closable, onClose]);
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  const aC = {
    yellow: "border-t-yellow",
    red: "border-t-red",
    cyan: "border-t-cyan",
    green: "border-t-green",
  };
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => {
            if (e.target === ref.current && closable) onClose?.();
          }}
        >
          <motion.div
            className={clsx(
              "relative flex max-h-[calc(100vh-32px)] w-full flex-col overflow-hidden rounded-xl bg-surface border border-slate-200 shadow-xl",
              accent && `border-t-4 ${aC[accent]}`,
              S[size],
              className,
            )}
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {(title || closable) && (
              <div className="flex shrink-0 items-start justify-between border-b border-slate-200 bg-surface p-5">
                <div className="min-w-0">
                  {title && (
                    <h2 className="text-xl font-semibold tracking-wide text-slate-950 sm:text-2xl">
                      {title}
                    </h2>
                  )}
                  {subtitle && (
                    <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
                  )}
                </div>
                {closable && (
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-md text-slate-500 hover:text-slate-950 hover:bg-elevated border border-transparent hover:border-slate-200 transition-all ml-4 shrink-0"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
            {footer && (
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-slate-200 bg-surface px-5 py-4">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title = "Are you sure?",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "red",
  loading = false,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      accent={variant}
    >
      <div className="space-y-4">
        {message && <p className="text-sm text-slate-600">{message}</p>}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="btn-ghost btn-sm"
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={clsx(
              "btn btn-sm",
              variant === "red" && "btn-red",
              variant === "yellow" && "btn-yellow",
              variant === "green" && "btn-green",
            )}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ...
              </span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
