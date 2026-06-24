import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Vote,
  Shield,
  Lock,
  CheckCircle2,
  ChevronLeft,
  X,
  Check,
  Eye,
  CircleSlash,
} from "lucide-react";
import { clsx } from "clsx";
import { ethers } from "ethers";
import { useElection } from "../../hooks/useElection";
import { useCastVote, useVoterEligibilityForVote } from "../../hooks/useVote";
import PageWrapper from "../../components/layout/PageWrapper";
import Modal, { ConfirmModal } from "../../components/ui/Modal";
import { StatusBadge } from "../../components/ui/Badge";
import LiveIndicator from "../../components/ui/LiveIndicator";
import ProgressBar from "../../components/ui/ProgressBar";
import HashDisplay from "../../components/ui/HashDisplay";
import Alert from "../../components/ui/Alert";
import { SkeletonCard } from "../../components/ui/Skeleton";
import { formatNumber } from "../../utils/formatters";
import { useCountdown } from "../../hooks/useCountdown";
import { useWeb3 } from "../../context/Web3Context";
import { useAuth } from "../../context/AuthContext";
import { REQUIRE_ZKP } from "../../utils/constants";
import { voteService } from "../../services/vote.service";
import { buildEncryptedBallot } from "../../services/ballot.crypto";
import { generateClientVoteProof } from "../../services/zkp.client.service";
import PartyMark from "../../components/ui/PartyMark";
import { NOTA_PARTY, partyLogoToken } from "../../utils/partyCatalog";
import toast from "react-hot-toast";
const COLORS = [
  "#2563eb",
  "#00D4FF",
  "#15803d",
  "#FF8C00",
  "#9B6DFF",
  "#dc2626",
];
export default function VotingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isConnected, connect, address } = useWeb3();
  const { voter, user } = useAuth();
  const [selected, setSelected] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const { data: election, isLoading } = useElection(id);
  const { data: eligibility } = useVoterEligibilityForVote(id);
  const castVoteMut = useCastVote();
  const countdown = useCountdown(election?.endTime);
  const candidates = election?.candidates || [];
  const notaChoice = {
    id: "NOTA",
    name: NOTA_PARTY.name,
    party: "Official ballot option",
    partyLogoUrl: partyLogoToken(NOTA_PARTY.id),
    blockchainId: 0,
    voteCount: election?.resultSummary?.notaVotes || 0,
    isNota: true,
  };
  const ballotChoices = [...candidates, notaChoice];
  const totalVotes = Number(election?.totalVotesCast || 0);
  const candidateVotes = (candidate) => Number(candidate?.voteCount || 0);
  const isActive = election?.status === "ACTIVE";
  const resultsSealed = !["CLOSED", "RESULTS_DECLARED"].includes(
    election?.status,
  );
  const canVote = eligibility?.eligible && !eligibility?.hasVoted && isActive;
  const registeredWallet = voter?.walletAddress || user?.walletAddress || null;
  const walletMismatch =
    isConnected &&
    registeredWallet &&
    address?.toLowerCase() !== registeredWallet.toLowerCase();
  useEffect(() => {
    setAlreadyVoted(Boolean(eligibility?.hasVoted));
    setSelected(null);
  }, [eligibility?.hasVoted, id, voter?.id, user?.id]);
  const handleVote = async () => {
    if (!selected) return;
    if (!isConnected) {
      toast.error("Connect your registered wallet first");
      return;
    }
    if (walletMismatch) {
      toast.error("Connected MetaMask wallet does not match this voter account");
      return;
    }
    setConfirmOpen(false);
    try {
      const eligibilityPackage = (await voteService.getEligibilityPackage(id))
        .data.data;
      const encrypted = await buildEncryptedBallot({
        election,
        candidate: selected,
        walletAddress: address,
      });
      const proof = await generateClientVoteProof({
        candidate: selected,
        election,
        eligibilityPackage,
        ballot: encrypted,
      });
      const { data } = await voteService.castPrivate({
        electionId: id,
        ...encrypted,
        eligibilityRoot: eligibilityPackage.eligibilityRoot,
        ...(proof || {}),
      });
      if (data.success) {
        setReceipt(data.data);
        setReceiptOpen(true);
        setAlreadyVoted(true);
        queryClient.invalidateQueries({ queryKey: ["vote", "eligibility", id] });
        queryClient.invalidateQueries({ queryKey: ["election", id] });
        queryClient.invalidateQueries({ queryKey: ["elections"] });
        queryClient.invalidateQueries({ queryKey: ["votes"] });
        queryClient.invalidateQueries({ queryKey: ["voter", "me"] });
      }
    } catch (e) {
      toast.error(e.response?.data?.message || e.message || "Vote failed");
    }
  };
  if (isLoading)
    return (
      <PageWrapper>
        <div className="max-w-4xl mx-auto">
          <SkeletonCard rows={6} />
        </div>
      </PageWrapper>
    );
  if (!election)
    return (
      <PageWrapper>
        <div className="max-w-4xl mx-auto text-center py-16">
          <h2 className="font-semibold text-3xl text-slate-600">
            Election Not Found
          </h2>
        </div>
      </PageWrapper>
    );
  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate("/elections")}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-700 transition-colors mb-6"
        >
          <ChevronLeft size={14} />
          Back to Elections
        </button>
        <div className="bg-white border border-slate-200 mb-6 overflow-hidden">
          <div
            className={clsx(
              "px-5 py-2.5 flex items-center justify-between",
              isActive
                ? "bg-green/10 border-b border-green/30"
                : "bg-slate-50 border-b border-slate-200",
            )}
          >
            <div className="flex items-center gap-3">
              <StatusBadge status={election.status} />
              {isActive && <LiveIndicator size="sm" />}
            </div>
            {isActive && countdown && !countdown.ended && (
              <div className="flex items-center gap-4">
                {[
                  { l: "D", v: countdown.days },
                  { l: "H", v: countdown.hours },
                  { l: "M", v: countdown.minutes },
                  { l: "S", v: countdown.seconds },
                ].map(({ l, v }) => (
                  <div key={l} className="text-center">
                    <p className="font-semibold text-2xl text-green leading-none">
                      {String(v).padStart(2, "0")}
                    </p>
                    <p className="text-[8px] text-slate-400 uppercase">{l}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="p-6">
            <h1 className="font-semibold text-4xl md:text-5xl text-slate-950 mb-2">
              {election.title}
            </h1>
            <div className="flex flex-wrap gap-4 text-xs text-slate-500">
              <span>{election.constituency}</span>
              <span>{candidates.length} Candidates + NOTA</span>
              <span>{formatNumber(totalVotes)} Votes</span>
            </div>
          </div>
        </div>
        {alreadyVoted && (
          <div className="bg-green/5 border border-green/30 p-4 mb-6 flex items-center gap-3">
            <CheckCircle2 size={18} className="text-green" />
            <p className="text-sm font-bold text-green">
              You have already voted in this election
            </p>
          </div>
        )}
        {eligibility && !eligibility.eligible && !alreadyVoted && (
          <Alert variant="warning" className="mb-6">
            {eligibility.reasons?.[0] || "Not eligible for this election"}
          </Alert>
        )}
        {!isConnected && isActive && (
          <div className="bg-blue-600/5 border border-blue-600/30 p-4 mb-6 flex items-center justify-between gap-3">
            <p className="text-sm text-blue-700 font-bold">
              Connect wallet to vote
            </p>
            <button onClick={connect} className="btn-yellow btn-sm">
              Connect
            </button>
          </div>
        )}
        {walletMismatch && isActive && (
          <Alert variant="error" className="mb-6">
            Connected wallet does not match this voter account. Switch MetaMask
            to the registered wallet before casting a ballot.
          </Alert>
        )}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-2xl text-slate-950">
                BALLOT OPTIONS
              </h2>
              {selected && (
                <span className="text-xs text-blue-700 flex items-center gap-1">
                  <CheckCircle2 size={11} />
                  {selected.name} selected
                </span>
              )}
            </div>
            <div className="space-y-3">
              {ballotChoices.map((c, i) => {
                const color = COLORS[i % COLORS.length];
                const votes = candidateVotes(c);
                const pct =
                  totalVotes > 0
                    ? ((votes / totalVotes) * 100).toFixed(1)
                    : 0;
                const sel = selected?.id === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() =>
                      !alreadyVoted && canVote && !walletMismatch && setSelected(c)
                    }
                    disabled={alreadyVoted || !canVote || walletMismatch}
                    className={clsx(
                      "w-full text-left border overflow-hidden transition-all duration-200 focus:outline-none",
                      sel
                        ? "border-blue-600 bg-blue-600/5"
                        : "border-slate-200 hover:border-blue-600/50",
                      alreadyVoted && "cursor-not-allowed",
                    )}
                    style={{
                      boxShadow: sel
                        ? "0 0 0 3px rgba(37,99,235,.12)"
                        : "0 1px 3px rgba(15,23,42,.08)",
                    }}
                  >
                    <div
                      className="h-1"
                      style={{ background: sel ? "#2563eb" : color }}
                    />
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 flex items-center justify-center border-2 font-semibold text-sm"
                            style={{
                              background: sel ? "#2563eb" : `${color}20`,
                              borderColor: sel ? "#2563eb" : `${color}40`,
                              color: sel ? "#fff" : color,
                            }}
                          >
                            {c.isNota ? <CircleSlash size={16} /> : i + 1}
                          </div>
                          <PartyMark
                            party={c.party}
                            logoUrl={c.partyLogoUrl}
                            size="sm"
                          />
                          <div>
                            <h3
                              className={clsx(
                                "font-semibold text-xl",
                                sel ? "text-blue-700" : "text-slate-950",
                              )}
                            >
                              {c.name}
                            </h3>
                            <span className="text-xs text-slate-500">
                              {c.party}
                            </span>
                          </div>
                        </div>
                        <div
                          className={clsx(
                            "w-6 h-6 border-2 flex items-center justify-center",
                            sel
                              ? "bg-blue-600 border-blue-600"
                              : "border-slate-200",
                          )}
                        >
                          {sel && (
                            <Check size={13} className="text-white font-bold" />
                          )}
                        </div>
                      </div>
                      {totalVotes > 0 && (
                        <>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-500">
                              {formatNumber(votes)} votes
                            </span>
                            <span className="font-bold" style={{ color }}>
                              {pct}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-50 border border-slate-200 overflow-hidden">
                            <motion.div
                              className="h-full"
                              style={{ background: sel ? "#2563eb" : color }}
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            {isActive && !alreadyVoted && (
              <div className="mt-6">
                <button
                  onClick={() => selected && setConfirmOpen(true)}
                  disabled={!selected || !canVote}
                  className={clsx(
                    "w-full justify-center py-4 text-base",
                    selected && canVote
                      ? "btn-yellow"
                      : "btn-ghost cursor-not-allowed",
                  )}
                >
                  {!canVote ? (
                    <>
                      <Lock size={16} />
                      Verify Identity to Vote
                    </>
                  ) : !selected ? (
                    <>
                      <Vote size={16} />
                      Select a Candidate
                    </>
                  ) : (
                    <>
                      <Shield size={16} />
                      Cast Encrypted Ballot - {selected?.name}
                    </>
                  )}
                </button>
                {selected && canVote && (
                  <p className="text-xs text-slate-500 text-center mt-2 flex items-center justify-center gap-1.5">
                    <Lock size={10} />
                    {REQUIRE_ZKP
                      ? "Client eligibility proof is required before production submission"
                      : "Encrypted ballot privacy path is active"}
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="section-label">Live Tally</h3>
                {isActive && <LiveIndicator size="sm" />}
              </div>
              <div className="space-y-3">
                {resultsSealed ? (
                  <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-900">
                      <Lock size={14} />
                      Candidate tally sealed
                    </div>
                    <p className="text-xs leading-5 text-blue-700">
                      Candidate counts are hidden until the election is closed
                      and results are declared.
                    </p>
                  </div>
                ) : (
                  [...ballotChoices]
                  .sort((a, b) => candidateVotes(b) - candidateVotes(a))
                  .map((c, i) => {
                    const votes = candidateVotes(c);
                    const pct =
                      totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
                    const color =
                      COLORS[
                        ballotChoices.findIndex((x) => x.id === c.id) %
                          COLORS.length
                      ];
                    return (
                      <div key={c.id}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-600 truncate mr-2">
                            {c.name}
                          </span>
                          <span
                            className="font-bold shrink-0"
                            style={{ color }}
                          >
                            {pct.toFixed(1)}%
                          </span>
                        </div>
                        <ProgressBar
                          value={pct}
                          max={100}
                          size="sm"
                          animated={false}
                          color={
                            i === 0 ? "yellow" : i === 1 ? "cyan" : "green"
                          }
                        />
                        <p className="text-[9px] text-slate-400 mt-0.5">
                          {formatNumber(votes)} votes
                        </p>
                      </div>
                    );
                  })
                )}
                <div className="pt-3 border-t border-slate-200 flex justify-between text-xs">
                  <span className="text-slate-500">Total</span>
                  <span className="font-bold text-slate-950">
                    {formatNumber(totalVotes)}
                  </span>
                </div>
              </div>
            </div>
            <div className="bg-white border border-slate-200 p-4">
              <h3 className="section-label mb-3">Your Status</h3>
              <div className="space-y-2">
                {[
                  {
                    l: "Voter Verified",
                    d: eligibility?.voterStatus === "VERIFIED",
                  },
                  { l: "Not Yet Voted", d: !eligibility?.hasVoted },
                  { l: "Election Active", d: isActive },
                ].map((item) => (
                  <div key={item.l} className="flex items-center gap-2 text-xs">
                    {item.d ? (
                      <CheckCircle2 size={12} className="text-green" />
                    ) : (
                      <X size={12} className="text-red" />
                    )}
                    <span
                      className={item.d ? "text-slate-600" : "text-slate-400"}
                    >
                      {item.l}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <ConfirmModal
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={handleVote}
          title="CONFIRM YOUR VOTE"
          message={
            selected?.isNota
              ? "You are choosing None of the Above. This cannot be undone."
              : `You are voting for ${selected?.name} (${selected?.party}). This cannot be undone.`
          }
          confirmText="Cast Vote"
          variant="yellow"
          loading={castVoteMut.isPending}
        />
        <Modal
          open={receiptOpen}
          onClose={() => {
            setReceiptOpen(false);
            navigate("/voter/dashboard");
          }}
          title="VOTE CONFIRMED!"
          size="md"
          accent="green"
          closable={false}
        >
          <div className="text-center">
            <div className="w-16 h-16 bg-green/10 border border-green flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-green" />
            </div>
            <h3 className="font-semibold text-2xl text-slate-950 mb-1">
              YOUR VOTE IS RECORDED
            </h3>
            <p className="text-sm text-slate-500 mb-5">
              Confirmed by the configured voting contract receipt.
            </p>
            {receipt && (
              <div className="bg-slate-50 border border-slate-200 p-5 text-left mb-4">
                <HashDisplay
                  label="Receipt Hash"
                  hash={receipt.receiptHash}
                  chars={10}
                />
                {receipt.blockchainTx && (
                  <HashDisplay
                    label="Transaction Hash"
                    hash={receipt.blockchainTx}
                    chars={10}
                    explorer={`https://sepolia.etherscan.io/tx/${receipt.blockchainTx}`}
                    className="mt-3"
                  />
                )}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(receipt?.receiptHash || "");
                  toast.success("Copied!");
                }}
                className="btn-outline-cyan flex-1 justify-center"
              >
                <Eye size={13} />
                Copy Receipt
              </button>
              <button
                onClick={() => {
                  setReceiptOpen(false);
                  navigate("/voter/dashboard");
                }}
                className="btn-yellow flex-1 justify-center"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </PageWrapper>
  );
}
