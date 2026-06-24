import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Vote, Wallet, Mail, Lock, ArrowRight, Shield } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useWeb3 } from "../../context/Web3Context";
import { authService } from "../../services/auth.service";
import Input from "../../components/ui/Input";
import Alert from "../../components/ui/Alert";
import toast from "react-hot-toast";
const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Required"),
});
function homeFor(user) {
  if (
    ["SUPER_ADMIN", "ELECTION_COMMISSION", "AUDITOR", "FRAUD_ANALYST"].includes(
      user?.role,
    )
  )
    return "/admin";
  if (user?.role === "CANDIDATE") return "/candidate/dashboard";
  return "/voter/dashboard";
}
export default function LoginPage() {
  const [tab, setTab] = useState("wallet");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const { address, connect, connecting, isConnected, signer } = useWeb3();
  const navigate = useNavigate();
  const location = useLocation();
  const requestedFrom = location.state?.from?.pathname;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });
  const handleWallet = async () => {
    setError("");
    setLoading(true);
    try {
      let addr = address;
      let activeSigner = signer;
      if (!isConnected) {
        const r = await connect();
        if (!r) {
          setLoading(false);
          return;
        }
        addr = r.address;
        activeSigner = r.signer;
      }
      const nonceRes = await authService.getWalletNonce(addr);
      const message = nonceRes.data.data.message;
      const signature = await activeSigner.signMessage(message);
      const { data } = await authService.loginWallet(addr, message, signature);
      if (data.success) {
        await login(data.data.tokens, data.data.user);
        toast.success("Welcome back!");
        navigate(requestedFrom || homeFor(data.data.user), { replace: true });
      }
    } catch (e) {
      setError(e.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };
  const handleEmail = async (vals) => {
    setError("");
    setLoading(true);
    try {
      const { data } = await authService.loginEmail(vals.email, vals.password);
      if (data.success) {
        await login(data.data.tokens, data.data.user);
        toast.success("Welcome back!");
        navigate(requestedFrom || homeFor(data.data.user), { replace: true });
      }
    } catch (e) {
      setError(e.response?.data?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-bg flex">
      <div
        className="hidden lg:flex w-1/2 bg-white border-r border-slate-200 flex-col justify-between p-12 relative overflow-hidden"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,215,0,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,215,0,.03) 1px,transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      >
        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-600 border-2 border-blue-600 flex items-center justify-center">
              <Vote size={18} className="text-white" />
            </div>
            <span className="font-semibold text-2xl tracking-normal">
              CIPHER<span className="text-blue-700">VOTE</span>
            </span>
          </Link>
        </div>
        <div className="relative z-10">
          <h2 className="font-semibold text-6xl text-slate-950 leading-tight mb-4">
            SECURE.
            <br />
            PRIVATE.
            <br />
            <span className="text-blue-700">VERIFIABLE.</span>
          </h2>
          <div className="mt-8 space-y-3">
            {[
              {
                icon: <Shield size={14} />,
                text: "ZKP proof support for private eligibility",
                c: "text-cyan",
              },
              {
                icon: <Lock size={14} />,
                text: "Identity review required before voting",
                c: "text-blue-700",
              },
              {
                icon: <Vote size={14} />,
                text: "One eligible voter, one recorded vote",
                c: "text-green",
              },
            ].map((i) => (
              <div
                key={i.text}
                className="flex items-center gap-3 text-sm text-slate-600"
              >
                <span className={i.c}>{i.icon}</span>
                {i.text}
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 bg-slate-50 border border-slate-200 p-4">
          <p className="text-[9px] text-slate-500 font-mono tracking-normal mb-2">
            NETWORK STATUS
          </p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green animate-pulse" />
            <span className="text-xs text-slate-600">
              Configured chain sync monitored
            </span>
          </div>
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 lg:px-12">
        <Link to="/" className="flex items-center gap-2 mb-8 lg:hidden">
          <div className="w-8 h-8 bg-blue-600 border-2 border-blue-600 flex items-center justify-center">
            <Vote size={14} className="text-white" />
          </div>
          <span className="font-semibold text-xl tracking-normal">
            CIPHER<span className="text-blue-700">VOTE</span>
          </span>
        </Link>
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="font-semibold text-4xl text-slate-950 tracking-wide">
              WELCOME BACK
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Sign in to access the voting platform
            </p>
          </div>
          <div className="flex border border-slate-200 mb-6">
            {[
              { id: "wallet", label: "MetaMask", icon: <Wallet size={14} /> },
              { id: "email", label: "Email", icon: <Mail size={14} /> },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all ${tab === t.id ? "bg-blue-600 text-white" : "bg-transparent text-slate-500 hover:text-slate-950 hover:bg-slate-50"}`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-4"
              >
                <Alert variant="error" dismissible>
                  {error}
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence mode="wait">
            {tab === "wallet" && (
              <motion.div
                key="w"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="bg-slate-50 border border-slate-200 p-6 mb-4">
                  {isConnected ? (
                    <div className="flex items-center gap-2 p-3 bg-green/5 border border-green/30 mb-4">
                      <span className="w-2 h-2 rounded-full bg-green animate-pulse" />
                      <span className="text-xs text-green font-mono">
                        {address?.slice(0, 6)}...{address?.slice(-4)} connected
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 mb-4">
                      No wallet connected. Click below to connect MetaMask.
                    </p>
                  )}
                  <button
                    onClick={handleWallet}
                    disabled={loading || connecting}
                    className="btn-yellow w-full justify-center"
                  >
                    {loading || connecting ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        {connecting ? "Connecting..." : "Signing in..."}
                      </span>
                    ) : (
                      <>
                        <Wallet size={14} />
                        {isConnected
                          ? "Sign In with Wallet"
                          : "Connect & Sign In"}
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
            {tab === "email" && (
              <motion.div
                key="e"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <form
                  onSubmit={handleSubmit(handleEmail)}
                  className="space-y-4"
                >
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="you@example.com"
                    icon={<Mail size={14} />}
                    error={errors.email?.message}
                    {...register("email")}
                  />
                  <Input
                    label="Password"
                    type="password"
                    placeholder="Enter your password"
                    icon={<Lock size={14} />}
                    error={errors.password?.message}
                    {...register("password")}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-yellow w-full justify-center"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        Signing in...
                      </span>
                    ) : (
                      <>
                        Sign In
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="mt-8 pt-6 border-t border-slate-200 text-center">
            <p className="text-sm text-slate-500">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="text-blue-700 hover:underline font-medium"
              >
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
