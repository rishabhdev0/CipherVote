import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Vote,
  Menu,
  X,
  ChevronDown,
  LogOut,
  Shield,
  Wallet,
  LayoutDashboard,
} from "lucide-react";
import { clsx } from "clsx";
import { useAuth } from "../../context/AuthContext";
import { useWeb3 } from "../../context/Web3Context";
import { useSocket } from "../../context/SocketContext";
import { StatusBadge } from "../ui/Badge";
import BrandMark from "../ui/BrandMark";
import { formatAddress } from "../../utils/formatters";
export default function Navbar() {
  const { user, voter, logout, isAdmin, isAuthenticated } = useAuth();
  const { address, connecting, connect, isConnected } = useWeb3();
  const { connected: socketConnected } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const primaryDashboard =
    user?.role === "CANDIDATE" && !voter
      ? "/candidate/dashboard"
      : "/voter/dashboard";
  const registeredWallet =
    voter?.walletAddress || user?.walletAddress || null;
  const walletMismatch =
    isAuthenticated &&
    isConnected &&
    registeredWallet &&
    address?.toLowerCase() !== registeredWallet.toLowerCase();
  const navLinks = isAuthenticated
    ? isAdmin()
      ? [
          {
            label: "Overview",
            to: "/admin",
            icon: <LayoutDashboard size={16} />,
          },
          {
            label: "Elections",
            to: "/admin/elections",
            icon: <Vote size={16} />,
          },
          { label: "Fraud", to: "/admin/fraud", icon: <Shield size={16} /> },
        ]
      : [
          { label: "Elections", to: "/elections", icon: <Vote size={16} /> },
          {
            label: "My dashboard",
            to: primaryDashboard,
            icon: <LayoutDashboard size={16} />,
          },
        ]
    : [
        { label: "Home", to: "/" },
        { label: "Elections", to: "/elections" },
      ];
  const NavItems = ({ mobile = false }) =>
    navLinks.map((link) => (
      <Link
        key={link.to}
        to={link.to}
        onClick={() => mobile && setMobileOpen(false)}
        className={clsx(
          "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          location.pathname === link.to
            ? "bg-blue-50 text-blue-700"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
        )}
      >
        {link.icon}
        {link.label}
      </Link>
    ));
  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <BrandMark size="sm" />
            <span>
              <span className="block text-lg font-bold leading-none tracking-tight text-slate-950">
                CipherVote
              </span>
              <span className="mt-0.5 hidden text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:block">
                Election Integrity Platform
              </span>
            </span>
          </Link>
          <div className="hidden items-center gap-1 md:flex">
            <NavItems />
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
              <span
                className={clsx(
                  "h-2 w-2 rounded-full",
                  socketConnected ? "bg-green" : "bg-slate-300",
                )}
              />
              {socketConnected ? "Live" : "Offline"}
            </div>
            {!isConnected ? (
              <button
                onClick={connect}
                disabled={connecting}
                className="btn-outline-yellow btn-sm"
              >
                <Wallet size={14} />
                {connecting ? "Connecting" : "Connect wallet"}
              </button>
            ) : (
              <div
                className={clsx(
                  "rounded-full border px-3 py-1.5 text-xs font-medium",
                  walletMismatch
                    ? "border-red-200 bg-red-50 text-red"
                    : "border-green/20 bg-green/5 text-green",
                )}
                title={
                  walletMismatch
                    ? `Connected wallet does not match this account. Expected ${formatAddress(registeredWallet)}`
                    : "Connected wallet"
                }
              >
                {walletMismatch ? "Wrong wallet" : formatAddress(address)}
              </div>
            )}
            {!isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn-ghost btn-sm">
                  Log in
                </Link>
                <Link to="/register" className="btn-yellow btn-sm">
                  Create account
                </Link>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setUserOpen(!userOpen)}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-sm shadow-sm transition hover:border-blue-200 hover:bg-blue-50/40"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                    {user?.email?.[0]?.toUpperCase() || "U"}
                  </span>
                  <span className="max-w-[120px] truncate text-slate-700">
                    {voter
                      ? `${voter.firstName} ${voter.lastName}`
                      : user?.email?.split("@")[0]}
                  </span>
                  {voter && <StatusBadge status={voter.status} size="sm" />}
                  <ChevronDown
                    size={14}
                    className={clsx(
                      "text-slate-400 transition-transform",
                      userOpen && "rotate-180",
                    )}
                  />
                </button>
                <AnimatePresence>
                  {userOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="absolute right-0 top-full mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
                    >
                      <div className="border-b border-slate-100 px-4 py-3">
                        <p className="truncate text-sm font-semibold text-slate-950">
                          {user?.email}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {user?.role?.replace("_", " ")}
                        </p>
                        {registeredWallet && (
                          <p className="mt-1 text-xs text-slate-500">
                            Registered wallet: {formatAddress(registeredWallet)}
                          </p>
                        )}
                        {walletMismatch && (
                          <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-xs font-semibold text-red">
                            Switch MetaMask to this account before voting.
                          </p>
                        )}
                      </div>
                      {[
                        { label: "Dashboard", to: primaryDashboard },
                        voter && { label: "Credential", to: "/voter/nft" },
                        user?.role === "CANDIDATE" && {
                          label: "Candidate workspace",
                          to: "/candidate/dashboard",
                        },
                        isAdmin() && { label: "Admin workspace", to: "/admin" },
                      ]
                        .filter(Boolean)
                        .map((item) => (
                          <Link
                            key={item.to}
                            to={item.to}
                            onClick={() => setUserOpen(false)}
                            className="block px-4 py-2.5 text-sm text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"
                          >
                            {item.label}
                          </Link>
                        ))}
                      <button
                        onClick={() => {
                          setUserOpen(false);
                          logout();
                          navigate("/");
                        }}
                        className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-sm text-red hover:bg-red-50"
                      >
                        <LogOut size={14} />
                        Log out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
          <button
            className="rounded-md p-2 text-slate-600 hover:bg-slate-100 md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-slate-200 bg-white md:hidden"
          >
            <div className="space-y-1 px-4 py-4">
              <NavItems mobile />
              {!isAuthenticated ? (
                <div className="grid grid-cols-2 gap-2 pt-3">
                  <Link to="/login" className="btn-ghost btn-sm">
                    Log in
                  </Link>
                  <Link to="/register" className="btn-yellow btn-sm">
                    Create account
                  </Link>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    logout();
                    navigate("/");
                  }}
                  className="btn-outline-red btn-sm mt-3 w-full"
                >
                  <LogOut size={14} />
                  Log out
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
