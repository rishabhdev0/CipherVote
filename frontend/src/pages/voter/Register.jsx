import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Upload,
  CheckCircle2,
  XCircle,
  Shield,
  User,
  CreditCard,
  RefreshCw,
  ArrowRight,
  Fingerprint,
} from "lucide-react";
import { clsx } from "clsx";
import Input, { Select } from "../../components/ui/Input";
import Alert from "../../components/ui/Alert";
import PageWrapper from "../../components/layout/PageWrapper";
import { useAuth } from "../../context/AuthContext";
import { useWeb3 } from "../../context/Web3Context";
import api from "../../services/api";
import toast from "react-hot-toast";
import { formatAddress } from "../../utils/formatters";
const schema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  dateOfBirth: z.string().min(1, "Required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]),
  constituency: z.string().min(1, "Required"),
  voterIdNumber: z.string().min(5),
});
const CONS = [
  "Delhi-01",
  "Delhi-02",
  "Mumbai-01",
  "Mumbai-02",
  "Bangalore-01",
  "Chennai-01",
  "Kolkata-01",
  "Hyderabad-01",
  "Pune-01",
];
export default function VoterRegisterPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(null);
  const [idFile, setIDFile] = useState(null);
  const [idPreview, setIdPreview] = useState(null);
  const [faceFile, setFaceFile] = useState(null);
  const [facePreview, setFacePreview] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const { user, voter, fetchMe, logout } = useAuth();
  const { address, isConnected, connect, connecting } = useWeb3();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });
  useEffect(() => {
    if (!idFile) {
      setIdPreview(null);
      return;
    }
    const url = idPreview;
    setIdPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [idFile]);
  useEffect(
    () => () => streamRef.current?.getTracks().forEach((t) => t.stop()),
    [],
  );
  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      toast.error("Camera access denied");
    }
  };
  const capture = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      setFaceFile(new File([blob], "face.jpg", { type: "image/jpeg" }));
      setFacePreview(canvas.toDataURL());
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setCameraActive(false);
      toast.success("Face captured!");
    });
  };
  const submit = async () => {
    const registeredWallet = voter?.walletAddress || user?.walletAddress;
    if (!registeredWallet) {
      toast.error("Create your account with a wallet before voter registration");
      return;
    }
    if (!isConnected) {
      toast.error("Connect your registered wallet first");
      await connect();
      return;
    }
    if (address?.toLowerCase() !== registeredWallet.toLowerCase()) {
      toast.error("Connected MetaMask wallet does not match this account");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(formData).forEach(([k, v]) => {
        if (v) fd.append(k, v);
      });
      if (faceFile) fd.append("faceImage", faceFile);
      if (idFile) fd.append("idImage", idFile);
      await api.post("/voters/register", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await fetchMe();
      toast.success(
        "Voter registration submitted successfully. Awaiting EC review.",
      );
      navigate("/voter/dashboard");
    } catch (e) {
      toast.error(e.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };
  const STEPS = [
    { id: 1, label: "Personal Info", icon: <User size={14} /> },
    { id: 2, label: "ID Upload", icon: <CreditCard size={14} /> },
    { id: 3, label: "Face Capture", icon: <Camera size={14} /> },
    { id: 4, label: "Review", icon: <CheckCircle2 size={14} /> },
  ];
  const registeredWallet = voter?.walletAddress || user?.walletAddress;
  const candidateAccount = user?.role === "CANDIDATE";
  const walletMismatch =
    isConnected &&
    registeredWallet &&
    address?.toLowerCase() !== registeredWallet.toLowerCase();
  if (candidateAccount && !voter) {
    return (
      <PageWrapper showFooter={false}>
        <div className="mx-auto max-w-2xl">
          <div className="mb-8">
            <h1 className="font-semibold text-5xl text-slate-950 tracking-wide">
              VOTER <span className="text-blue-700">REGISTRATION</span>
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Voter and candidate accounts are separated for this prototype.
            </p>
          </div>
          <Alert variant="warning" className="mb-5">
            You are logged in as candidate account{" "}
            <span className="font-semibold">{user?.email}</span>. To register
            Sneha Walia or any new person as a voter, sign out and create a
            separate voter account with that person's MetaMask wallet.
          </Alert>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={async () => {
                await logout();
                navigate("/register");
              }}
              className="btn-yellow"
            >
              Sign out and create voter account
              <ArrowRight size={14} />
            </button>
            <button
              type="button"
              onClick={() => navigate("/candidate/dashboard")}
              className="btn-ghost"
            >
              Back to candidate dashboard
            </button>
          </div>
        </div>
      </PageWrapper>
    );
  }
  return (
    <PageWrapper showFooter={false}>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="font-semibold text-5xl text-slate-950 tracking-wide">
            VOTER <span className="text-blue-700">REGISTRATION</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Complete all steps to register as a verified voter.
          </p>
        </div>
        {!registeredWallet ? (
          <Alert variant="error" className="mb-5">
            This account has no registered wallet. Create the account from the
            wallet-bound registration flow first.
          </Alert>
        ) : !isConnected ? (
          <Alert variant="warning" className="mb-5">
            Connect your registered wallet {formatAddress(registeredWallet)} to
            submit voter registration.{" "}
            <button
              type="button"
              onClick={connect}
              disabled={connecting}
              className="font-semibold text-blue-700 underline"
            >
              Connect wallet
            </button>
          </Alert>
        ) : walletMismatch ? (
          <Alert variant="error" className="mb-5">
            Wrong wallet connected. This account is registered with{" "}
            {formatAddress(registeredWallet)}, but MetaMask is on{" "}
            {formatAddress(address)}. Switch MetaMask back to the registered
            wallet, or sign out and create a new voter account for this wallet.
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={connect}
                disabled={connecting}
                className="btn-ghost btn-sm"
              >
                Switch / reconnect wallet
              </button>
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  navigate("/register");
                }}
                className="btn-yellow btn-sm"
              >
                Sign out and create new account
              </button>
            </div>
          </Alert>
        ) : (
          <Alert variant="success" className="mb-5">
            Wallet bound: {formatAddress(registeredWallet)}
          </Alert>
        )}
        <div className="flex border border-slate-200 mb-8 overflow-hidden">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold transition-all",
                step === s.id
                  ? "bg-blue-600 text-white"
                  : step > s.id
                    ? "bg-green/10 text-green"
                    : "bg-transparent text-slate-400",
              )}
            >
              {step > s.id ? <CheckCircle2 size={13} /> : s.icon}
              <span className="hidden sm:inline">{s.label}</span>
              <span className="sm:hidden">{s.id}</span>
            </div>
          ))}
        </div>
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="s1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="bg-white border border-slate-200 p-6">
                <form
                  onSubmit={handleSubmit((d) => {
                    setFormData(d);
                    setStep(2);
                  })}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="First Name"
                      required
                      placeholder="Rahul"
                      error={errors.firstName?.message}
                      {...register("firstName")}
                    />
                    <Input
                      label="Last Name"
                      required
                      placeholder="Kumar"
                      error={errors.lastName?.message}
                      {...register("lastName")}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Date of Birth"
                      type="date"
                      required
                      error={errors.dateOfBirth?.message}
                      {...register("dateOfBirth")}
                    />
                    <Select
                      label="Gender"
                      required
                      placeholder="Select"
                      options={[
                        { value: "MALE", label: "Male" },
                        { value: "FEMALE", label: "Female" },
                        { value: "OTHER", label: "Other" },
                        {
                          value: "PREFER_NOT_TO_SAY",
                          label: "Prefer not to say",
                        },
                      ]}
                      error={errors.gender?.message}
                      {...register("gender")}
                    />
                  </div>
                  <Select
                    label="Constituency"
                    required
                    placeholder="Select constituency"
                    options={CONS.map((c) => ({ value: c, label: c }))}
                    error={errors.constituency?.message}
                    {...register("constituency")}
                  />
                  <Input
                    label="Voter ID Number"
                    required
                    placeholder="ABC1234567"
                    icon={<CreditCard size={14} />}
                    error={errors.voterIdNumber?.message}
                    {...register("voterIdNumber")}
                  />
                  <Alert variant="info">
                    Your documents are encrypted at rest and submitted for
                    identity review before voting access is granted.
                  </Alert>
                  <button
                    type="submit"
                    className="btn-yellow w-full justify-center"
                  >
                    Continue
                    <ArrowRight size={14} />
                  </button>
                </form>
              </div>
            </motion.div>
          )}
          {step === 2 && (
            <motion.div
              key="s2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="bg-white border border-slate-200 p-6">
                <h2 className="font-semibold text-xl text-slate-950 mb-4">
                  UPLOAD VOTER ID
                </h2>
                <div
                  className="border border-dashed border-slate-200 p-8 text-center cursor-pointer hover:border-blue-600/40 transition-colors"
                  onClick={() => document.getElementById("id-file")?.click()}
                >
                  <input
                    id="id-file"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files[0];
                      if (f) setIDFile(f);
                    }}
                  />
                  {idFile ? (
                    <div className="text-green flex items-center justify-center gap-2">
                      <CheckCircle2 size={20} />
                      {idFile.name}
                    </div>
                  ) : (
                    <>
                      <Upload
                        size={32}
                        className="text-slate-400 mx-auto mb-2"
                      />
                      <p className="text-sm text-slate-500">
                        Click to upload ID card
                      </p>
                    </>
                  )}
                </div>
                <div className="flex gap-3 mt-5">
                  <button
                    onClick={() => setStep(1)}
                    className="btn-ghost flex-1 justify-center"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      if (!idFile) {
                        toast.error("Upload ID first");
                        return;
                      }
                      setStep(3);
                    }}
                    className="btn-yellow flex-1 justify-center"
                  >
                    Continue
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
          {step === 3 && (
            <motion.div
              key="s3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="bg-white border border-slate-200 p-6">
                <h2 className="font-semibold text-xl text-slate-950 mb-4">
                  BIOMETRIC FACE CAPTURE
                </h2>
                <div
                  className="relative bg-black border border-slate-200 overflow-hidden mb-4"
                  style={{ aspectRatio: "4/3" }}
                >
                  <video
                    ref={videoRef}
                    className={clsx(
                      "w-full h-full object-cover",
                      "-scale-x-100",
                      !cameraActive && "hidden",
                    )}
                    muted
                    playsInline
                  />
                  {facePreview && (
                    <img
                      src={facePreview}
                      alt="Captured"
                      className="w-full h-full object-cover"
                    />
                  )}
                  {!cameraActive && !facePreview && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <Camera size={48} className="text-slate-400 mb-2" />
                      <p className="text-sm text-slate-500">
                        Camera not active
                      </p>
                    </div>
                  )}
                  {cameraActive && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute top-4 left-4 w-8 h-8 border-t-[3px] border-l border-blue-600" />
                      <div className="absolute top-4 right-4 w-8 h-8 border-t-[3px] border-r-[3px] border-blue-600" />
                      <div className="absolute bottom-4 left-4 w-8 h-8 border-b border-l border-blue-600" />
                      <div className="absolute bottom-4 right-4 w-8 h-8 border-b border-r-[3px] border-blue-600" />
                    </div>
                  )}
                </div>
                {!facePreview ? (
                  !cameraActive ? (
                    <button
                      onClick={startCamera}
                      className="btn-cyan w-full justify-center"
                    >
                      <Camera size={14} />
                      Start Camera
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={capture}
                        className="btn-yellow flex-1 justify-center"
                      >
                        <Fingerprint size={14} />
                        Capture Face
                      </button>
                      <button
                        onClick={() => {
                          streamRef.current
                            ?.getTracks()
                            .forEach((t) => t.stop());
                          setCameraActive(false);
                        }}
                        className="btn-outline-red btn-sm"
                      >
                        <XCircle size={14} />
                      </button>
                    </div>
                  )
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setFacePreview(null);
                        setFaceFile(null);
                        startCamera();
                      }}
                      className="btn-ghost flex-1 justify-center"
                    >
                      <RefreshCw size={14} />
                      Retake
                    </button>
                    <div className="flex-1 flex items-center justify-center gap-2 bg-green/10 border border-green/30 text-green text-sm font-bold py-2">
                      <CheckCircle2 size={14} />
                      Face Ready
                    </div>
                  </div>
                )}
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setStep(2)}
                    className="btn-ghost flex-1 justify-center"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      if (!faceFile) {
                        toast.error("Capture face first");
                        return;
                      }
                      setStep(4);
                    }}
                    disabled={!faceFile}
                    className="btn-yellow flex-1 justify-center"
                  >
                    Continue
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
          {step === 4 && (
            <motion.div
              key="s4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="bg-white border border-slate-200 p-6">
                <h2 className="font-semibold text-xl text-slate-950 mb-4">
                  REVIEW & SUBMIT
                </h2>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {idFile && (
                    <div>
                      <p className="label mb-2">Voter ID</p>
                      <img
                        src={idPreview}
                        alt="ID"
                        className="w-full h-28 object-cover border border-slate-200"
                      />
                    </div>
                  )}
                  {facePreview && (
                    <div>
                      <p className="label mb-2">Face Capture</p>
                      <img
                        src={facePreview}
                        alt="Face"
                        className="w-full h-28 object-cover border border-slate-200"
                      />
                    </div>
                  )}
                </div>
                <div className="bg-slate-50 border border-slate-200 mb-4">
                  {[
                    {
                      l: "Name",
                      v: `${formData?.firstName} ${formData?.lastName}`,
                    },
                    { l: "DOB", v: formData?.dateOfBirth },
                    { l: "Gender", v: formData?.gender },
                    { l: "Constituency", v: formData?.constituency },
                    { l: "Voter ID", v: formData?.voterIdNumber },
                  ].map((i) => (
                    <div
                      key={i.l}
                      className="flex justify-between px-4 py-2.5 border-b border-slate-200/50 text-sm"
                    >
                      <span className="text-slate-400 text-xs uppercase tracking-wider">
                        {i.l}
                      </span>
                      <span className="text-slate-950 font-medium text-xs">
                        {i.v}
                      </span>
                    </div>
                  ))}
                </div>
                <Alert variant="warning" className="mb-4">
                  By submitting you confirm all information is accurate and
                  matches your voter ID.
                </Alert>
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(3)}
                    className="btn-ghost flex-1 justify-center"
                    disabled={loading}
                  >
                    Back
                  </button>
                  <button
                    onClick={submit}
                    disabled={loading}
                    className="btn-yellow flex-1 justify-center"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        Submitting...
                      </span>
                    ) : (
                      <>
                        <Shield size={14} />
                        Submit Registration
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageWrapper>
  );
}
