import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Vote,
  Shield,
  RefreshCw,
  CheckCircle2,
  Lock,
  ArrowRight,
} from "lucide-react";
import { authService } from "../../services/auth.service";
import Alert from "../../components/ui/Alert";
import toast from "react-hot-toast";
export default function OTPPage() {
  const [otp, setOTP] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const refs = useRef([]);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const type = params.get("type") || "REGISTRATION";
  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);
  useEffect(() => {
    const code = otp.join("");
    if (code.length === 6 && !loading && !verified) verify(code);
  }, [otp]);
  const change = (i, v) => {
    if (!/^\d*$/.test(v)) return;
    const n = [...otp];
    n[i] = v.slice(-1);
    setOTP(n);
    setError("");
    if (v && i < 5) refs.current[i + 1]?.focus();
  };
  const keyDown = (i, e) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) refs.current[i - 1]?.focus();
  };
  const paste = (e) => {
    e.preventDefault();
    const p = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const n = [...otp];
    p.split("").forEach((c, i) => {
      n[i] = c;
    });
    setOTP(n);
    refs.current[Math.min(p.length, 5)]?.focus();
  };
  const verify = async (code) => {
    setError("");
    setLoading(true);
    try {
      const { data } = await authService.verifyOTP(code, type);
      if (data.success) {
        setVerified(true);
        toast.success("Verified!");
        setTimeout(() => navigate("/voter/dashboard"), 1500);
      }
    } catch (e) {
      setError(e.response?.data?.message || "Invalid OTP");
      setOTP(["", "", "", "", "", ""]);
      refs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };
  const resend = async () => {
    if (!canResend) return;
    try {
      const { data } = await authService.resendOTP(type, "EMAIL");
      if (data.data?.devOTP)
        toast(`Dev OTP: ${data.data.devOTP}`, {
          duration: 15000,
          style: { fontFamily: "monospace" },
        });
      toast.success("OTP resent!");
      setCountdown(60);
      setCanResend(false);
      setOTP(["", "", "", "", "", ""]);
      refs.current[0]?.focus();
    } catch {
      toast.error("Failed to resend");
    }
  };
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-600 border border-blue-600 flex items-center justify-center mx-auto mb-4">
            <Vote size={22} className="text-white" />
          </div>
          <span className="font-semibold text-2xl tracking-normal">
            CIPHER<span className="text-blue-700">VOTE</span>
          </span>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-200 p-8"
        >
          {verified ? (
            <div className="text-center py-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-16 h-16 bg-green/10 border border-green flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle2 size={32} className="text-green" />
              </motion.div>
              <h2 className="font-semibold text-3xl text-green mb-2">
                VERIFIED!
              </h2>
              <p className="text-sm text-slate-500">Redirecting...</p>
              <motion.div className="mt-4 w-24 h-1 bg-slate-200 mx-auto overflow-hidden">
                <motion.div
                  className="h-full bg-green"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.5 }}
                />
              </motion.div>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h2 className="font-semibold text-3xl text-slate-950 mb-1">
                  VERIFY YOUR EMAIL
                </h2>
                <p className="text-sm text-slate-500">
                  Enter the 6-digit code sent to your email
                </p>
              </div>
              {error && (
                <Alert variant="error" className="mb-5">
                  {error}
                </Alert>
              )}
              <div className="flex gap-2.5 justify-center mb-6">
                {otp.map((d, i) => (
                  <motion.input
                    key={i}
                    ref={(el) => (refs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => change(i, e.target.value)}
                    onKeyDown={(e) => keyDown(i, e)}
                    onPaste={i === 0 ? paste : undefined}
                    disabled={loading}
                    className={`w-12 h-14 text-center text-2xl font-bold border bg-slate-50 text-slate-950 outline-none transition-all font-mono ${d ? "border-blue-600 text-blue-700" : error ? "border-red" : "border-slate-200 focus:border-blue-600"}`}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                  />
                ))}
              </div>
              <button
                onClick={() => verify(otp.join(""))}
                disabled={otp.join("").length < 6 || loading}
                className="btn-yellow w-full justify-center mb-4"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  <>
                    <Lock size={14} />
                    Verify Code
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
              <div className="text-center">
                {canResend ? (
                  <button
                    onClick={resend}
                    className="text-blue-700 text-sm hover:underline flex items-center gap-1.5 mx-auto"
                  >
                    <RefreshCw size={13} />
                    Resend Code
                  </button>
                ) : (
                  <p className="text-sm text-slate-500">
                    Resend in{" "}
                    <span className="text-blue-700 font-mono font-bold">
                      {countdown}s
                    </span>
                  </p>
                )}
              </div>
            </>
          )}
        </motion.div>
        <div className="flex items-center justify-center gap-2 mt-5 text-xs text-slate-400">
          <Shield size={11} />
          <span>Code expires in 10 minutes</span>
        </div>
      </div>
    </div>
  );
}
