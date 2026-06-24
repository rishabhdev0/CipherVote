import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Vote,
  Shield,
  Users,
  FileText,
  BarChart3,
  Gavel,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { clsx } from "clsx";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import BrandMark from "../ui/BrandMark";
const nav = [
  {
    group: "Overview",
    items: [
      { label: "Dashboard", to: "/admin", icon: <LayoutDashboard size={17} /> },
      {
        label: "Analytics",
        to: "/admin/analytics",
        icon: <BarChart3 size={17} />,
      },
    ],
  },
  {
    group: "Elections",
    items: [
      { label: "Elections", to: "/admin/elections", icon: <Vote size={17} /> },
      {
        label: "Candidate review",
        to: "/admin/candidates",
        icon: <UserRoundCheck size={17} />,
      },
      {
        label: "Governance",
        to: "/admin/governance",
        icon: <ShieldCheck size={17} />,
      },
    ],
  },
  {
    group: "Operations",
    items: [
      { label: "Fraud review", to: "/admin/fraud", icon: <Shield size={17} /> },
      { label: "Disputes", to: "/admin/disputes", icon: <Gavel size={17} /> },
      { label: "Voters", to: "/admin/voters", icon: <Users size={17} /> },
      { label: "Audit logs", to: "/admin/audit", icon: <FileText size={17} /> },
    ],
  },
];
export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [accountOpen, setAccountOpen] = useState(false);
  const roleLabel = user?.role?.replace(/_/g, " ") || "ADMIN";
  const initial = user?.email?.[0]?.toUpperCase() || "E";
  const doLogout = async () => {
    setAccountOpen(false);
    await logout();
    navigate("/login");
  };
  return (
    <aside className="fixed bottom-0 left-0 top-0 z-40 hidden w-72 flex-col border-r border-slate-200 bg-white/95 shadow-sm backdrop-blur lg:flex">
      <div className="border-b border-slate-200 px-5 py-4">
        <Link to="/admin" className="flex items-center gap-3">
          <BrandMark size="md" />
          <span>
            <span className="block text-lg font-bold leading-tight text-slate-950">
              CipherVote
            </span>
            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Election Office
            </span>
          </span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-5">
        {nav.map((group) => (
          <section key={group.group} className="mb-6">
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {group.group}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={clsx(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                      active
                        ? "bg-blue-50 text-blue-700 shadow-sm"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
                    )}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <div className="relative border-t border-slate-200 p-4">
        <AnimatePresence>
          {accountOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="absolute bottom-[88px] left-4 right-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
            >
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="truncate text-sm font-semibold text-slate-950">
                  {user?.email}
                </p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                  {roleLabel}
                </p>
              </div>
              <Link
                to="/admin"
                onClick={() => setAccountOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              >
                <LayoutDashboard size={14} />
                Admin dashboard
              </Link>
              <Link
                to="/"
                onClick={() => setAccountOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              >
                <ExternalLink size={14} />
                Public site
              </Link>
              <button
                type="button"
                onClick={doLogout}
                className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-left text-sm font-medium text-red hover:bg-red-50"
              >
                <LogOut size={14} />
                Log out
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          type="button"
          onClick={() => setAccountOpen((v) => !v)}
          className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-blue-200 hover:bg-blue-50/50"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-sm font-bold text-blue-700">
            {initial}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-slate-950">
              {user?.email}
            </span>
            <span className="mt-0.5 block truncate text-xs font-medium uppercase tracking-wide text-slate-500">
              {roleLabel}
            </span>
          </span>
          <ChevronDown
            size={16}
            className={clsx(
              "shrink-0 text-slate-400 transition-transform",
              accountOpen && "rotate-180",
            )}
          />
        </button>
      </div>
    </aside>
  );
}
