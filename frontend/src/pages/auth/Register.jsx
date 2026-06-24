import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Key,
  Lock,
  Mail,
  UserCheck,
  Vote,
  Wallet,
} from "lucide-react";
import { useWeb3 } from "../../context/Web3Context";
import { authService } from "../../services/auth.service";
import { useAuth } from "../../context/AuthContext";
import Input from "../../components/ui/Input";
import Alert from "../../components/ui/Alert";
import toast from "react-hot-toast";

const schema = z
  .object({
    email: z.string().email().optional().or(z.literal("")),
    password: z.string().min(8, "Min 8 chars"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [intent, setIntent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { address, connect, connecting, isConnected } = useWeb3();
  const { login, logout, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  const handleConnect = async () => {
    if (!intent) return setStep(1);
    if (!isConnected) {
      const result = await connect();
      if (result) setStep(3);
    } else {
      setStep(3);
    }
  };

  const handleRegister = async (values) => {
    setError("");
    if (!address) {
      setError("Connect MetaMask before creating this account.");
      setStep(2);
      return;
    }
    setLoading(true);
    try {
      const { data } = await authService.register({
        walletAddress: address,
        email: values.email || undefined,
        password: values.password,
        intent,
      });
      if (data.success) {
        if (data.data.tokens) {
          await login(data.data.tokens, { walletAddress: address });
        }
        if (data.data.devOTP) {
          toast(`Dev OTP: ${data.data.devOTP}`, {
            duration: 15000,
            style: { fontFamily: "monospace" },
          });
        }
        setStep(4);
      }
    } catch (e) {
      setError(e.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const continuePath =
    intent === "candidate" ? "/candidate/register" : "/voter/register";

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <Link to="/" className="mb-6 flex items-center justify-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Vote size={17} />
            </div>
            <span className="text-xl font-semibold text-slate-950">
              CipherVote
            </span>
          </Link>
          <Alert variant="warning" className="mb-5">
            You are already logged in as{" "}
            <span className="font-semibold">{user?.email}</span>. To create a
            new voter or candidate account with a different MetaMask wallet,
            sign out first.
          </Alert>
          <div className="space-y-3">
            <button
              type="button"
              onClick={async () => {
                await logout();
                setStep(1);
                setIntent("");
                setError("");
              }}
              className="btn-yellow w-full justify-center"
            >
              Sign out and create new account
              <ArrowRight size={14} />
            </button>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="btn-ghost w-full justify-center"
            >
              Continue with current account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-8 h-8 bg-blue-600 border-2 border-blue-600 flex items-center justify-center">
            <Vote size={14} className="text-white" />
          </div>
          <span className="font-semibold text-xl tracking-normal">
            CIPHER<span className="text-blue-700">VOTE</span>
          </span>
        </Link>

        <div className="flex gap-2 mb-8 justify-center">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1 rounded-full transition-all ${step >= s ? "bg-blue-600" : "bg-slate-200"} ${step === s ? "w-8" : "w-4"}`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="role"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="mb-6 text-center">
                <h1 className="font-semibold text-4xl text-slate-950">
                  CREATE ACCOUNT
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  First choose how you want to register.
                </p>
              </div>

              <div className="grid gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setIntent("voter");
                    setStep(2);
                  }}
                  className="rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
                >
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                    <UserCheck size={22} />
                  </div>
                  <p className="text-lg font-semibold text-slate-950">
                    Register as voter
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Submit identity details and wait for Election Commission
                    verification before voting.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIntent("candidate");
                    setStep(2);
                  }}
                  className="rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-green-300 hover:shadow-md"
                >
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-green-50 text-green-700">
                    <Briefcase size={22} />
                  </div>
                  <p className="text-lg font-semibold text-slate-950">
                    Apply as candidate
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Submit candidate details and manifesto for EC approval into
                    an official election.
                  </p>
                </button>
              </div>

              <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                Super admin and Election Commission accounts are created by
                seed/admin setup, not through public registration.
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="wallet"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="mb-6">
                <h1 className="font-semibold text-4xl text-slate-950">
                  CONNECT WALLET
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  This wallet links to your{" "}
                  {intent === "candidate" ? "candidate" : "voter"} account.
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-6 mb-4">
                {isConnected ? (
                  <div className="flex items-center gap-2 p-3 bg-green/5 border border-green/30 mb-4">
                    <span className="w-2 h-2 rounded-full bg-green animate-pulse" />
                    <span className="text-xs text-green font-mono truncate">
                      {address}
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 mb-4">
                    Connect MetaMask to continue.
                  </p>
                )}
                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="btn-yellow w-full justify-center"
                >
                  {connecting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      Connecting...
                    </span>
                  ) : isConnected ? (
                    <>
                      Continue
                      <ArrowRight size={14} />
                    </>
                  ) : (
                    <>
                      <Wallet size={14} />
                      Connect MetaMask
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-ghost mt-3 w-full justify-center"
                >
                  Back to role choice
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="mb-6">
                <h1 className="font-semibold text-4xl text-slate-950">
                  ACCOUNT DETAILS
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Creating account for{" "}
                  <span className="font-semibold text-blue-700">
                    {intent === "candidate" ? "Candidate" : "Voter"}
                  </span>
                  .
                </p>
              </div>
              {error && (
                <Alert variant="error" className="mb-4" dismissible>
                  {error}
                </Alert>
              )}
              <form
                onSubmit={handleSubmit(handleRegister)}
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
                  placeholder="Min 8 characters"
                  icon={<Key size={14} />}
                  error={errors.password?.message}
                  required
                  {...register("password")}
                />
                <Input
                  label="Confirm Password"
                  type="password"
                  placeholder="Repeat password"
                  icon={<Lock size={14} />}
                  error={errors.confirmPassword?.message}
                  required
                  {...register("confirmPassword")}
                />
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="btn-ghost flex-1 justify-center"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-yellow flex-1 justify-center"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        Creating...
                      </span>
                    ) : (
                      <>
                        Create account
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="done"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green/10 border-2 border-green/30 flex items-center justify-center mx-auto mb-5">
                  <CheckCircle2 size={32} className="text-green" />
                </div>
                <h3 className="font-semibold text-2xl text-slate-950 mb-2">
                  ACCOUNT CREATED
                </h3>
                <p className="text-sm text-slate-500 mb-6">
                  Continue your{" "}
                  {intent === "candidate"
                    ? "candidate application"
                    : "voter registration"}
                  .
                </p>
                <div className="space-y-3">
                  <button
                    onClick={() => navigate(continuePath)}
                    className="btn-yellow w-full justify-center"
                  >
                    {intent === "candidate"
                      ? "Continue as Candidate"
                      : "Continue as Voter"}
                    <ArrowRight size={14} />
                  </button>
                  <button
                    onClick={() => navigate("/dashboard")}
                    className="btn-ghost w-full justify-center"
                  >
                    Go to Participation Dashboard
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {step < 4 && (
          <div className="mt-8 pt-6 border-t border-slate-200 text-center">
            <p className="text-sm text-slate-500">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-blue-700 hover:underline font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
