import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Vote,
  Shield,
  Award,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronRight,
  BarChart3,
  ExternalLink,
  RefreshCw,
  Eye,
} from "lucide-react";
import { clsx } from "clsx";
import { useAuth } from "../../context/AuthContext";
import { useMyVoterProfile } from "../../hooks/useVoter";
import { useElections } from "../../hooks/useElection";
import { useVoteHistory } from "../../hooks/useVote";
import PageWrapper from "../../components/layout/PageWrapper";
import { StatusBadge, TierBadge } from "../../components/ui/Badge";
import { StatCard } from "../../components/ui/Card";
import { SkeletonCard, SkeletonStat } from "../../components/ui/Skeleton";
import {
  formatDate,
  formatRelative,
  formatTimeRemaining,
  formatAddress,
  formatNumber,
} from "../../utils/formatters";
import { NFT_TIER_COLORS } from "../../utils/constants";
import api from "../../services/api";
export default function VoterDashboard() {
  const { user } = useAuth();
  const [notice, setNotice] = useState(null);
  const { data: voter, isLoading: vL, refetch } = useMyVoterProfile();
  const { data: ed, isLoading: eL } = useElections({
    status: "ACTIVE",
    limit: 3,
  });
  const { data: rd } = useElections({
    status: "RESULTS_DECLARED",
    limit: 3,
  });
  const { data: history, isLoading: hL } = useVoteHistory();
  const elections = ed?.data || [];
  const results = rd?.data || [];
  const votes = history || [];
  const tier = voter?.nftTier || "BRONZE";
  const color = NFT_TIER_COLORS[tier];
  useEffect(() => {
    api
      .get("/admin/notifications")
      .then((res) => {
        const latest = (res.data.data.notifications || []).find((n) =>
          String(n.type || "").startsWith("VOTER_"),
        );
        setNotice(latest || null);
      })
      .catch(() => {});
  }, []);
  return (
    <PageWrapper>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="page-kicker mb-2">
                Welcome back,{" "}
                <span className="text-blue-700">
                  {voter?.firstName || user?.email?.split("@")[0] || "Voter"}
                </span>
              </p>
              <h1 className="page-title">Voter dashboard</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Check your verification status, eligible elections, vote
                history, and certified results from one workspace.
              </p>
            </div>
            <button onClick={() => refetch()} className="btn-ghost btn-sm">
              <RefreshCw size={13} />
              Refresh
            </button>
          </div>
        </div>
        {notice && (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-semibold text-blue-800">
              {notice.title}
            </p>
            <p className="mt-1 text-sm text-slate-700">{notice.message}</p>
            {notice.type === "VOTER_REGISTRATION_REJECTED" && (
              <Link
                to="/voter/register"
                className="btn-yellow btn-sm mt-3 inline-flex"
              >
                Submit registration again
              </Link>
            )}
          </div>
        )}
        {!vL &&
          (voter?.status === "PENDING" ? (
            <div className="bg-blue-600/5 border border-blue-600/30 p-4 mb-6 flex items-start gap-3">
              <Clock size={18} className="text-blue-700 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-blue-700">
                  Registration Under Review
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Your registration is being reviewed. This typically takes
                  24-48 hours.
                </p>
              </div>
            </div>
          ) : voter?.status === "VERIFIED" ? (
            <div className="bg-green/5 border border-green/30 p-4 mb-6 flex items-center gap-3">
              <CheckCircle2 size={18} className="text-green" />
              <p className="text-sm font-bold text-green">
                Verified Voter — Ready to Vote
              </p>
            </div>
          ) : voter?.status === "REJECTED" ? (
            <div className="bg-red/5 border border-red/30 p-4 mb-6 flex items-start gap-3">
              <XCircle size={18} className="text-red shrink-0" />
              <div>
                <p className="text-sm font-bold text-red">
                  Registration Rejected
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  {voter?.rejectionReason ||
                    "Please review your details and submit the form again."}
                </p>
                <Link
                  to="/voter/register"
                  className="btn-yellow btn-sm mt-3 inline-flex"
                >
                  Submit again
                </Link>
              </div>
            </div>
          ) : !voter ? (
            <div className="bg-blue-600/5 border border-blue-600/30 p-4 mb-6 flex items-start gap-3">
              <AlertTriangle size={18} className="text-blue-700 shrink-0" />
              <div>
                <p className="text-sm font-bold text-blue-700">
                  Registration Required
                </p>
                <Link
                  to="/voter/register"
                  className="btn-yellow btn-sm mt-3 inline-flex"
                >
                  Register Now
                </Link>
              </div>
            </div>
          ) : null)}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div>
              <p className="section-label mb-3">NFT Credential</p>
              {vL ? (
                <SkeletonCard rows={4} />
              ) : (
                <div
                  className="border overflow-hidden"
                  style={{
                    borderColor: color,
                    boxShadow: "0 8px 24px rgba(15,23,42,.08)",
                  }}
                >
                  <div className="h-1.5" style={{ background: color }} />
                  <div
                    className="p-5"
                    style={{
                      background: `linear-gradient(135deg,${color}15 0%,transparent 60%)`,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <StatusBadge status={voter?.status || "PENDING"} />
                      <TierBadge tier={tier} />
                    </div>
                    <h3 className="font-semibold text-2xl text-slate-950">
                      {voter?.firstName || "—"} {voter?.lastName || ""}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {voter?.constituency || "—"}
                    </p>
                    {voter?.walletAddress && (
                      <div className="mt-3 text-xs font-mono text-slate-500 bg-black/20 px-2 py-1.5 border border-white/5">
                        {formatAddress(voter.walletAddress, 6)}
                      </div>
                    )}
                    <Link
                      to="/voter/nft"
                      className="mt-4 flex items-center justify-center gap-2 w-full py-2 border text-xs font-bold transition-all hover:bg-slate-50"
                      style={{ borderColor: `${color}40`, color }}
                    >
                      <ExternalLink size={12} />
                      View NFT Profile
                    </Link>
                  </div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {vL ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonStat key={i} />
                ))
              ) : (
                <>
                  <StatCard
                    label="Votes Cast"
                    value={votes.length}
                    accent="yellow"
                  />
                  <StatCard
                    label="Active"
                    value={elections.length}
                    accent="cyan"
                  />
                  <StatCard
                    label="Risk Score"
                    value={`${voter?.riskScore || 0}`}
                    accent={
                      voter?.riskScore > 70
                        ? "red"
                        : voter?.riskScore > 40
                          ? "yellow"
                          : "green"
                    }
                  />
                  <StatCard label="NFT Tier" value={tier} accent="green" />
                </>
              )}
            </div>
            <div>
              <p className="section-label mb-3">Quick Actions</p>
              <div className="space-y-2">
                {[
                  {
                    label: "Browse Elections",
                    to: "/elections",
                    disabled: voter?.status !== "VERIFIED",
                  },
                  { label: "Verify a Vote", to: "/elections" },
                  { label: "View Disputes", to: "/disputes" },
                ].map((a) => (
                  <Link
                    key={a.label}
                    to={a.to}
                    className={clsx(
                      "flex items-center justify-between p-3 bg-slate-50 border border-slate-200 hover:border-blue-600/40 transition-all group",
                      a.disabled && "opacity-40 pointer-events-none",
                    )}
                  >
                    <span className="text-sm text-slate-600 group-hover:text-slate-950">
                      {a.label}
                    </span>
                    <ChevronRight
                      size={13}
                      className="text-slate-400 group-hover:text-blue-700"
                    />
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="section-label">Active Elections</p>
                <Link
                  to="/elections"
                  className="text-xs text-blue-700 hover:underline"
                >
                  View all
                </Link>
              </div>
              {eL ? (
                <SkeletonCard rows={2} />
              ) : elections.length > 0 ? (
                <div className="space-y-3">
                  {elections.map((e) => (
                    <Link
                      key={e.id}
                      to={`/elections/${e.id}/vote`}
                      className="block bg-white border border-green/30 p-4 hover:-translate-y-0.5 transition-all group"
                    >
                      <p className="text-sm font-bold text-slate-950 group-hover:text-blue-700 transition-colors">
                        {e.title}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-slate-500">
                          {e.constituency}
                        </span>
                        <span className="text-xs text-green">
                          {formatTimeRemaining(e.endTime)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-slate-200 p-8 text-center">
                  <Vote size={28} className="text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No active elections</p>
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="section-label">Vote History</p>
                <span className="text-xs text-slate-500">
                  {votes.length} votes
                </span>
              </div>
              <div className="bg-white border border-slate-200">
                {hL ? (
                  <div className="p-4 space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="skeleton w-8 h-8 shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="skeleton h-3 w-3/4" />
                          <div className="skeleton h-3 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : votes.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {votes.slice(0, 5).map((v) => (
                      <div
                        key={v.voteId}
                        className="flex items-center gap-4 py-3 px-4"
                      >
                        <div className="w-8 h-8 bg-green/10 border border-green/30 flex items-center justify-center shrink-0">
                          <CheckCircle2 size={14} className="text-green" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-950 truncate">
                            {v.electionTitle}
                          </p>
                          <p className="text-xs text-slate-500">
                            {v.candidateName}
                          </p>
                        </div>
                        <p className="text-xs text-slate-500 shrink-0">
                          {formatRelative(v.castAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <BarChart3
                      size={28}
                      className="text-slate-400 mx-auto mb-2"
                    />
                    <p className="text-sm text-slate-500">No votes yet</p>
                  </div>
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="section-label">Certified Results</p>
                <Link
                  to="/elections"
                  className="text-xs text-blue-700 hover:underline"
                >
                  View all
                </Link>
              </div>
              {results.length > 0 ? (
                <div className="space-y-3">
                  {results.map((e) => {
                    const sorted = [...(e.candidates || [])].sort(
                      (a, b) =>
                        Number(b.voteCount || 0) - Number(a.voteCount || 0),
                    );
                    const winner = sorted[0];
                    const summary = e.resultSummary;
                    const isTie = summary?.isTie;
                    const winnerName = isTie
                      ? "Tie"
                      : summary?.winnerName || winner?.name || "Pending";
                    const winnerParty = summary?.winnerParty || winner?.party;
                    const winnerVotes =
                      summary?.winnerVotes ?? Number(winner?.voteCount || 0);
                    return (
                      <Link
                        key={e.id}
                        to={`/elections/${e.id}/results`}
                        className="block rounded-lg border border-blue-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-400"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">
                              {e.title}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {isTie ? "Top result: " : "Winner: "}
                              <span className="font-semibold text-blue-700">
                                {winnerName}
                              </span>
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {isTie
                                ? `${summary.tiedCandidates
                                    ?.map((c) => c.name)
                                    .join(", ")} tied at ${formatNumber(
                                    summary.tiedCandidates?.[0]?.voteCount || 0,
                                  )} votes`
                                : `${winnerParty || "Independent"} / ${formatNumber(
                                    winnerVotes,
                                  )} votes`}
                            </p>
                          </div>
                          <span className="text-xs font-semibold text-green">
                            {formatNumber(e.totalVotesCast || 0)} votes
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-white p-6 text-center">
                  <Award size={24} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-sm text-slate-500">
                    No certified results yet
                  </p>
                </div>
              )}
            </div>
            <div>
              <p className="section-label mb-3">Security Status</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Face", v: voter?.faceVerified },
                  { label: "ID", v: voter?.idVerified },
                  { label: "Liveness", v: voter?.livenessVerified },
                  { label: "NFT", v: !!voter?.nftTokenId },
                ].map((i) => (
                  <div
                    key={i.label}
                    className={clsx(
                      "flex flex-col items-center gap-2 p-4 border text-center",
                      i.v
                        ? "bg-green/5 border-green/30"
                        : "bg-white border-slate-200",
                    )}
                  >
                    <span className={i.v ? "text-green" : "text-slate-400"}>
                      <Shield size={16} />
                    </span>
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider">
                      {i.label}
                    </span>
                    <span
                      className={clsx(
                        "text-xs font-bold",
                        i.v ? "text-green" : "text-slate-400",
                      )}
                    >
                      {i.v ? "✓ Yes" : "✗ No"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
