import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  FileImage,
  FileText,
  Landmark,
  Send,
  ShieldCheck,
} from "lucide-react";
import PageWrapper from "../../components/layout/PageWrapper";
import Input, { Select, Textarea } from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Alert from "../../components/ui/Alert";
import { candidateService } from "../../services/candidate.service";
import { electionService } from "../../services/election.service";
import { useAuth } from "../../context/AuthContext";
import { useWeb3 } from "../../context/Web3Context";
import { formatAddress } from "../../utils/formatters";
import PartyMark from "../../components/ui/PartyMark";
import {
  CUSTOM_PARTY_ID,
  PARTY_PRESETS,
  partyLogoToken,
} from "../../utils/partyCatalog";
import toast from "react-hot-toast";

const constituencies = [
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

export default function CandidateRegisterPage() {
  const navigate = useNavigate();
  const { user, voter } = useAuth();
  const { address, isConnected, connect, connecting } = useWeb3();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [elections, setElections] = useState([]);
  const [partyChoice, setPartyChoice] = useState("BJP");
  const [form, setForm] = useState({
    electionId: "",
    fullName: "",
    party: PARTY_PRESETS[0].name,
    partyLogoUrl: partyLogoToken(PARTY_PRESETS[0].id),
    constituency: "",
    manifesto: "",
    contactEmail: "",
    contactPhone: "",
    documentHash: "",
  });

  useEffect(() => {
    electionService
      .getAll({ status: "DRAFT", limit: 100 })
      .then((r) => setElections(r.data.data.data || []))
      .catch(() => setElections([]));
  }, []);

  const change = (e) =>
    setForm((v) => ({ ...v, [e.target.name]: e.target.value }));
  const selectParty = (e) => {
    const value = e.target.value;
    setPartyChoice(value);
    const preset = PARTY_PRESETS.find((p) => p.id === value);
    if (preset) {
      setForm((v) => ({
        ...v,
        party: preset.name,
        partyLogoUrl: partyLogoToken(preset.id),
      }));
      return;
    }
    setForm((v) => ({
      ...v,
      party: "",
      partyLogoUrl: "",
    }));
  };
  const uploadLogo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Party logo must be an image file");
      return;
    }
    if (file.size > 180 * 1024) {
      setError("Party logo must be under 180 KB for this prototype");
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      setForm((v) => ({ ...v, partyLogoUrl: String(reader.result || "") }));
    reader.readAsDataURL(file);
  };
  const submit = async (e) => {
    e.preventDefault();
    const registeredWallet = voter?.walletAddress || user?.walletAddress;
    if (!registeredWallet) {
      setError("Create your account with a wallet before applying as candidate");
      return;
    }
    if (!isConnected) {
      setError("Connect your registered wallet before applying as candidate");
      await connect();
      return;
    }
    if (address?.toLowerCase() !== registeredWallet.toLowerCase()) {
      setError(
        `Wrong wallet connected. Switch MetaMask to ${formatAddress(registeredWallet)}.`,
      );
      return;
    }
    setLoading(true);
    setError("");
    try {
      await candidateService.apply(form);
      toast.success(
        "Candidate application submitted successfully. Awaiting EC review.",
      );
      navigate("/candidate/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Application failed",
      );
    } finally {
      setLoading(false);
    }
  };
  const registeredWallet = voter?.walletAddress || user?.walletAddress;
  const walletMismatch =
    isConnected &&
    registeredWallet &&
    address?.toLowerCase() !== registeredWallet.toLowerCase();
  if (user?.role !== "CANDIDATE") {
    return (
      <PageWrapper showFooter={false}>
        <div className="mx-auto max-w-2xl">
          <p className="section-label mb-2">Separate candidate account required</p>
          <h1 className="text-4xl font-semibold text-slate-950">
            Candidate Application
          </h1>
          <Alert variant="warning" className="mt-5">
            You are logged in as a {user?.role?.replace(/_/g, " ") || "user"}.
            Candidate applications must use a separate candidate account and
            wallet so voter and candidate records cannot overlap.
          </Alert>
          <div className="mt-5 flex gap-3">
            <Button type="button" onClick={() => navigate("/register")}>
              Create candidate account
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/dashboard")}
            >
              Back to dashboard
            </Button>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper showFooter={false}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <p className="section-label mb-2">Candidate participation</p>
          <h1 className="text-4xl font-semibold text-slate-950">
            Candidate Application
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Submit your basic details for Election Commission review. Approval
            adds you to the official candidate list.
          </p>
        </div>
        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}
        {!registeredWallet ? (
          <Alert variant="error" className="mb-4">
            This account has no registered wallet. Create a wallet-bound account
            before submitting candidate applications.
          </Alert>
        ) : !isConnected ? (
          <Alert variant="warning" className="mb-4">
            Connect your registered wallet {formatAddress(registeredWallet)} to
            submit a candidate application.{" "}
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
          <Alert variant="error" className="mb-4">
            Wrong wallet connected. This account is registered with{" "}
            {formatAddress(registeredWallet)}, but MetaMask is on{" "}
            {formatAddress(address)}.
          </Alert>
        ) : (
          <Alert variant="success" className="mb-4">
            Wallet bound: {formatAddress(registeredWallet)}
          </Alert>
        )}
        <form
          onSubmit={submit}
          className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <Input
              label="Full legal name"
              name="fullName"
              value={form.fullName}
              onChange={change}
              icon={<Briefcase size={14} />}
              required
            />
            <div className="sm:col-span-2">
              <label className="label">Political party</label>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <Select
                  name="partyChoice"
                  value={partyChoice}
                  onChange={selectParty}
                  options={[
                    ...PARTY_PRESETS.map((p) => ({
                      value: p.id,
                      label: p.name,
                    })),
                    { value: CUSTOM_PARTY_ID, label: "Create custom party" },
                  ]}
                  required
                />
                <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <PartyMark
                    party={form.party || "Custom party"}
                    logoUrl={form.partyLogoUrl}
                    size="md"
                  />
                  <div>
                    <p className="text-xs font-semibold text-slate-950">
                      {form.party || "Custom party"}
                    </p>
                    <p className="text-[11px] text-slate-500">Ballot mark</p>
                  </div>
                </div>
              </div>
            </div>
            {partyChoice === CUSTOM_PARTY_ID && (
              <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2">
                <Input
                  label="Custom party name"
                  name="party"
                  value={form.party}
                  onChange={change}
                  icon={<Landmark size={14} />}
                  required
                />
                <Input
                  label="Logo URL"
                  name="partyLogoUrl"
                  value={form.partyLogoUrl}
                  onChange={change}
                  icon={<FileImage size={14} />}
                  placeholder="https://example.com/logo.png"
                />
                <div className="sm:col-span-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
                  <label className="flex cursor-pointer items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        Upload party logo
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        PNG, JPG, or SVG image under 180 KB.
                      </p>
                    </div>
                    <span className="btn-ghost btn-sm">
                      <FileImage size={14} />
                      Choose file
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={uploadLogo}
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>
            )}
            <Select
              label="Constituency"
              name="constituency"
              value={form.constituency}
              onChange={change}
              placeholder="Select constituency"
              options={constituencies.map((c) => ({ value: c, label: c }))}
              required
            />
            <Select
              label="Target election"
              name="electionId"
              value={form.electionId}
              onChange={change}
              placeholder="Assign later or choose draft election"
              options={elections.map((e) => ({
                value: e.id,
                label: `${e.title} (${e.constituency})`,
              }))}
            />
            <Input
              label="Contact email"
              name="contactEmail"
              value={form.contactEmail}
              onChange={change}
            />
            <Input
              label="Contact phone"
              name="contactPhone"
              value={form.contactPhone}
              onChange={change}
            />
          </div>
          <Textarea
            label="Manifesto summary"
            name="manifesto"
            value={form.manifesto}
            onChange={change}
            rows={6}
            placeholder="Write a concise public candidate statement."
          />
          <Input
            className="mt-4"
            label="Nomination document hash"
            name="documentHash"
            value={form.documentHash}
            onChange={change}
            icon={<FileText size={14} />}
            hint="For now paste a document hash/reference. File upload can be wired next."
          />
          <Alert variant="info" className="mt-5">
            Election Commission can approve, reject, or assign this application
            to a draft election. Approved candidates become official election
            candidates.
          </Alert>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="ghost"
              type="button"
              onClick={() => navigate("/candidate/dashboard")}
            >
              View my status
            </Button>
            <Button type="submit" loading={loading} icon={<Send size={15} />}>
              Submit application
            </Button>
          </div>
        </form>
        <div className="mt-5 flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck size={14} className="text-blue-700" />
          Candidate approval is audited and can be connected to on-chain
          election candidate registration.
        </div>
      </div>
    </PageWrapper>
  );
}
