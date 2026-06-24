import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { clsx } from "clsx";
import toast from "react-hot-toast";
export default function HashDisplay({
  hash,
  label,
  truncate = true,
  chars = 8,
  explorer,
  className = "",
}) {
  const [copied, setCopied] = useState(false);
  const display =
    truncate && hash?.length > chars * 2 + 3
      ? `${hash.slice(0, chars)}...${hash.slice(-chars)}`
      : hash;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      toast.success("Copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed");
    }
  };
  if (!hash) return null;
  return (
    <div className={clsx("", className)}>
      {label && <p className="label mb-1.5">{label}</p>}
      <div className="flex items-center gap-2 hash group">
        <span className="flex-1 break-all">{display}</span>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={copy}
            className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-cyan transition-all p-0.5"
          >
            {copied ? (
              <Check size={12} className="text-green" />
            ) : (
              <Copy size={12} />
            )}
          </button>
          {explorer && (
            <a
              href={explorer}
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-blue-700 transition-all p-0.5"
            >
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
