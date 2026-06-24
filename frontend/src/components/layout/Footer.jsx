import { Link } from "react-router-dom";
import { ExternalLink, Github, Shield, Zap } from "lucide-react";
import BrandMark from "../ui/BrandMark";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="md:col-span-2">
            <div className="mb-3 flex items-center gap-3">
              <BrandMark size="sm" />
              <div>
                <span className="block text-lg font-bold leading-none tracking-tight text-slate-950">
                  CipherVote
                </span>
                <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Election integrity platform
                </span>
              </div>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-slate-500">
              Contract-backed electoral operations with identity review, private
              ballot support, governance controls, and tamper-evident audit
              logs.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Shield size={12} className="text-green-700" />
                Eligibility proof support
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Zap size={12} className="text-blue-700" />
                Live operations
              </div>
            </div>
          </div>
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Platform
            </p>
            <ul className="space-y-2.5">
              {[
                { label: "Elections", to: "/elections" },
                { label: "Register", to: "/register" },
                { label: "Dashboard", to: "/dashboard" },
              ].map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="text-sm text-slate-500 transition-colors hover:text-blue-700"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-6 sm:flex-row">
          <p className="text-xs text-slate-400">
            (c) {new Date().getFullYear()} CipherVote. Contract network
            configurable.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://sepolia.etherscan.io"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-slate-400 transition-colors hover:text-blue-700"
            >
              <ExternalLink size={11} />
              Etherscan
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-slate-400 transition-colors hover:text-blue-700"
            >
              <Github size={11} />
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
