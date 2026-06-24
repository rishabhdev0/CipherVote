import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Trophy,
  BarChart3,
  Users,
  ChevronLeft,
  Share2,
  ExternalLink,
  CheckCircle2,
  Shield,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import PageWrapper from "../../components/layout/PageWrapper";
import { useElection, useElectionResults } from "../../hooks/useElection";
import { SkeletonCard } from "../../components/ui/Skeleton";
import HashDisplay from "../../components/ui/HashDisplay";
import CountUp from "../../components/ui/CountUp";
import { StatusBadge } from "../../components/ui/Badge";
import LiveIndicator from "../../components/ui/LiveIndicator";
import { formatDate, formatNumber } from "../../utils/formatters";
import { clsx } from "clsx";
import PartyMark from "../../components/ui/PartyMark";
import toast from "react-hot-toast";
const PIE_COLORS = [
  "#2563eb",
  "#00D4FF",
  "#15803d",
  "#FF8C00",
  "#9B6DFF",
  "#dc2626",
];
const CT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 px-3 py-2 text-xs">
      {label && <p className="text-slate-500 mb-1">{label}</p>}
      {payload.map((p) => (
        <p
          key={p.name}
          className="font-bold"
          style={{ color: p.color || p.fill }}
        >
          {p.name}: {formatNumber(p.value)}
        </p>
      ))}
    </div>
  );
};
export default function ResultsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: election, isLoading: eL } = useElection(id);
  const { data: results, isLoading: rL } = useElectionResults(id);
  const isDeclared = election?.status === "RESULTS_DECLARED";
  const isActive = election?.status === "ACTIVE";
  const sorted = results?.candidateResults || [];
  const resultRows = [
    ...sorted,
    ...(results?.notaResult ? [results.notaResult] : []),
  ];
  const totalVotes = results?.totalVotes || 0;
  const isTie = Boolean(results?.isTie);
  const topVotes = isTie
    ? results?.tiedCandidates?.[0]?.voteCount || 0
    : results?.winnerVotes || 0;
  const resultTitle = isTie
    ? (results?.tiedCandidates || []).map((c) => c.candidateName).join(", ")
    : results?.winnerName;
  const barData = resultRows.map((c) => ({
    name: c.candidateName?.split(" ")[0],
    votes: c.voteCount,
    pct: c.percentage,
  }));
  const pieData = resultRows.map((c) => ({
    name: c.candidateName,
    value: c.voteCount,
  }));
  if (eL || rL)
    return (
      <PageWrapper>
        <div className="max-w-5xl mx-auto space-y-4">
          <SkeletonCard rows={4} />
          <SkeletonCard rows={6} />
        </div>
      </PageWrapper>
    );
  return (
    <PageWrapper>
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => navigate("/elections")}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-700 transition-colors mb-6"
        >
          <ChevronLeft size={14} />
          Back
        </button>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <StatusBadge status={election?.status} />
              {isActive && <LiveIndicator size="sm" />}
            </div>
            <h1 className="font-semibold text-4xl md:text-5xl text-slate-950">
              {election?.title}
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success("Copied!");
              }}
              className="btn-ghost btn-sm"
            >
              <Share2 size={12} />
              Share
            </button>
          </div>
        </div>
        {isDeclared && results && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-blue-600 overflow-hidden mb-8 relative"
          >
            <div className="h-2 bg-blue-600" />
            <div className="p-8 text-center relative z-10">
              <div className="w-16 h-16 bg-blue-600/10 border border-blue-600/50 flex items-center justify-center mx-auto mb-4">
                <Trophy size={32} className="text-blue-700" />
              </div>
              <p className="text-[9px] font-bold tracking-normal uppercase text-blue-700 mb-2">
                Election Winner
              </p>
              <h2 className="font-semibold text-5xl text-slate-950 mb-1">
                {resultTitle}
              </h2>
              <p className="text-lg text-slate-500 mb-5">
                {isTie ? `${topVotes} votes each` : results?.winnerParty}
              </p>
              <div className="flex flex-wrap justify-center gap-8">
                {[
                  {
                    v: topVotes,
                    l: isTie ? "Top Votes Each" : "Winner Votes",
                    c: "text-blue-700",
                  },
                  {
                    v:
                      totalVotes > 0
                        ? (topVotes / totalVotes) * 100
                        : 0,
                    l: "Vote Share",
                    c: "text-cyan",
                    d: 1,
                    s: "%",
                  },
                  {
                    v: results?.winMargin || 0,
                    l: "Win Margin",
                    c: "text-green",
                  },
                ].map((s) => (
                  <div key={s.l} className="text-center">
                    <p className={clsx("font-semibold text-4xl", s.c)}>
                      <CountUp
                        end={s.v}
                        decimals={s.d || 0}
                        suffix={s.s || ""}
                      />
                    </p>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">
                      {s.l}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { l: "Total Votes", v: totalVotes, c: "text-blue-700" },
            { l: "Registered", v: election?.totalRegistered, c: "text-cyan" },
            {
              l: "Turnout",
              v: +(results?.turnoutPercentage || 0).toFixed(1),
              s: "%",
              c: "text-green",
            },
            {
              l: "Candidates",
              v: election?.candidates?.length || 0,
              c: "text-orange",
            },
          ].map((s) => (
            <div
              key={s.l}
              className="bg-white border border-slate-200 p-5 text-center"
            >
              <p className={clsx("font-semibold text-4xl", s.c)}>
                <CountUp
                  end={+s.v || 0}
                  suffix={s.s || ""}
                  decimals={s.s === "%" ? 1 : 0}
                />
              </p>
              <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-wider">
                {s.l}
              </p>
            </div>
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white border border-slate-200 p-5">
            <h3 className="section-label mb-5">Vote Distribution</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={barData}
                margin={{ top: 5, right: 5, bottom: 5, left: 0 }}
              >
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#505050", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#505050", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={45}
                />
                <Tooltip content={<CT />} />
                <Bar dataKey="votes" radius={0} maxBarSize={48}>
                  {barData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={
                        i === 0 && isDeclared
                          ? "#2563eb"
                          : PIE_COLORS[i % PIE_COLORS.length]
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white border border-slate-200 p-5">
            <h3 className="section-label mb-5">Vote Share</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={PIE_COLORS[i % PIE_COLORS.length]}
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CT />} />
                <Legend
                  formatter={(v) => (
                    <span style={{ color: "#64748b", fontSize: 11 }}>{v}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        {isDeclared && resultRows.length > 0 && (
          <div className="bg-white border border-slate-200 mb-8">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50">
              <h3 className="section-label">Final Results</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Candidate</th>
                    <th>Party</th>
                    <th className="text-right">Votes</th>
                    <th className="text-right">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {resultRows.map((c, i) => (
                    <tr key={c.candidateId}>
                      <td>
                        <div
                          className={clsx(
                            "w-7 h-7 flex items-center justify-center border-2 font-semibold text-base",
                            i === 0 && !c.isNota
                              ? "bg-blue-600 border-blue-600 text-white"
                              : "border-slate-200 text-slate-500",
                          )}
                        >
                          {c.isNota
                            ? "N"
                            : i === 0
                              ? <Trophy size={13} />
                              : c.rank}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <PartyMark
                            party={c.partyName}
                            logoUrl={c.partyLogoUrl}
                            size="sm"
                          />
                          <p
                            className={clsx(
                              "font-medium text-sm",
                              i === 0 && !c.isNota
                                ? "text-blue-700"
                                : "text-slate-950",
                            )}
                          >
                            {c.candidateName}
                          </p>
                        </div>
                      </td>
                      <td>
                        <span className="text-xs text-slate-500">
                          {c.partyName}
                        </span>
                      </td>
                      <td className="text-right font-mono text-sm font-bold">
                        {formatNumber(c.voteCount)}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-slate-50 overflow-hidden">
                            <div
                              className="h-full"
                              style={{
                                width: `${c.percentage}%`,
                                background: PIE_COLORS[i % PIE_COLORS.length],
                              }}
                            />
                          </div>
                          <span
                            className="text-xs font-bold w-10 text-right"
                            style={{ color: PIE_COLORS[i % PIE_COLORS.length] }}
                          >
                            {c.percentage?.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {!isDeclared && election?.candidates?.length > 0 && (
          <div className="bg-white border border-slate-200 mb-8">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50">
              <h3 className="section-label">Official Candidate List</h3>
              <p className="mt-1 text-xs text-slate-500">
                Vote counts stay sealed until the election is closed and certified.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Party</th>
                    <th>Constituency</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {election.candidates.filter(c=>c.isActive).map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <PartyMark
                            party={c.party}
                            logoUrl={c.partyLogoUrl}
                            size="sm"
                          />
                          <span className="font-medium text-slate-950">
                            {c.name}
                          </span>
                        </div>
                      </td>
                      <td className="text-slate-600">{c.party}</td>
                      <td className="text-slate-500">{c.constituency || election.constituency}</td>
                      <td><StatusBadge status="ACTIVE" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {isDeclared && results?.blockchainTxHash && (
          <div className="bg-white border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-green animate-pulse" />
              <span className="text-xs text-green font-mono tracking-normal">
                BLOCKCHAIN CERTIFIED
              </span>
              <Shield size={12} className="text-green ml-1" />
            </div>
            <HashDisplay
              label="Results TX Hash"
              hash={results.blockchainTxHash}
              explorer={`https://sepolia.etherscan.io/tx/${results.blockchainTxHash}`}
            />
            <a
              href={`https://sepolia.etherscan.io/tx/${results.blockchainTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline-cyan btn-sm mt-4 inline-flex"
            >
              <ExternalLink size={12} />
              Verify on Etherscan
            </a>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
