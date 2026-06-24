import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FilePlus2,
  Lock,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import PageWrapper from "../../components/layout/PageWrapper";
import Button from "../../components/ui/Button";
import Badge, { StatusBadge } from "../../components/ui/Badge";
import { candidateService } from "../../services/candidate.service";
import { formatDate, formatNumber } from "../../utils/formatters";
import PartyMark from "../../components/ui/PartyMark";

function StatCard({ label, value, icon, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    amber: "bg-amber-50 text-amber-700",
    slate: "bg-slate-100 text-slate-600",
  };
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={`rounded-lg p-2 ${tones[tone]}`}>{icon}</span>
      </div>
      <p className="text-3xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function ApplicationCard({ app }) {
  const approved = app.status === "APPROVED";
  const assigned = Boolean(app.election);
  const candidate = app.candidate;
  const tallySealed = app.election?.tallySealed ?? true;
  const visibleVotes = candidate?.voteCount ?? 0;
  const result = app.election?.result;
  const resultOpen = approved && assigned && !tallySealed && result;

  return (
    <article className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <PartyMark
              party={app.party}
              logoUrl={candidate?.partyLogoUrl || app.partyLogoUrl}
              size="lg"
            />
            <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={app.status} />
              {candidate?.isActive && (
                <Badge variant="green">Official candidate</Badge>
              )}
            </div>
            <h2 className="text-2xl font-semibold text-slate-950">
              {app.fullName}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{app.party}</p>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <p className="text-xs font-semibold uppercase text-slate-400">
              Public vote status
            </p>
            {approved && assigned ? (
              tallySealed ? (
                <div className="mt-2 flex items-center gap-2 font-semibold text-blue-700">
                  <Lock size={14} />
                  Sealed until results
                </div>
              ) : (
                <div className="mt-2 flex items-center gap-2 font-semibold text-green-700">
                  <BarChart3 size={14} />
                  {formatNumber(visibleVotes)} votes
                </div>
              )
            ) : (
              <p className="mt-2 font-semibold text-slate-600">Not available</p>
            )}
          </div>
        </div>
        {resultOpen && (
          <div
            className={`mt-4 rounded-lg border p-4 ${
              result.isWinner
                ? "border-green-200 bg-green-50"
                : result.isTie
                  ? "border-blue-200 bg-blue-50"
                  : "border-slate-200 bg-slate-50"
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`rounded-lg p-2 ${
                  result.isWinner ? "bg-green-100 text-green-700" : "bg-white text-blue-700"
                }`}
              >
                <Trophy size={18} />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  {result.isTie
                    ? result.isWinner
                      ? "Result: tied for winner"
                      : "Result: tie declared"
                    : result.isWinner
                      ? "Result: you won this election"
                      : "Result: not elected"}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {result.isTie
                    ? `Top tied candidates: ${result.tiedCandidates
                        .map((c) => c.name)
                        .join(", ")}`
                    : `Winner: ${result.winnerName || "Pending"}${
                        result.winnerParty ? ` (${result.winnerParty})` : ""
                      }`}
                </p>
                {result.ownRank && (
                  <p className="mt-1 text-xs text-slate-500">
                    Your rank: #{result.ownRank} / Total votes:{" "}
                    {formatNumber(result.totalVotes || 0)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 p-5 md:grid-cols-3">
        <div className="rounded-lg bg-slate-50 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-slate-400">
            <MapPin size={13} />
            Constituency
          </div>
          <p className="font-medium text-slate-800">{app.constituency}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-slate-400">
            <CalendarDays size={13} />
            Election
          </div>
          {assigned ? (
            <>
              <p className="font-medium text-slate-800">{app.election.title}</p>
              <p className="mt-1 text-xs text-slate-500">
                {app.election.status} / {app.election.constituency}
              </p>
            </>
          ) : (
            <p className="font-medium text-slate-500">Awaiting EC assignment</p>
          )}
        </div>
        <div className="rounded-lg bg-slate-50 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-slate-400">
            <Clock3 size={13} />
            Submitted
          </div>
          <p className="font-medium text-slate-800">
            {formatDate(app.submittedAt)}
          </p>
        </div>
      </div>

      <div className="border-t border-slate-200 p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
          <div>
            <p className="text-sm font-semibold text-slate-950">EC review</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {app.reviewReason ||
                "Waiting for Election Commission review. You will see the final approval or rejection here."}
            </p>
          </div>
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-900">
              <ShieldCheck size={15} />
              Privacy rule
            </div>
            <p className="text-xs leading-5 text-blue-700">
              Candidate-level vote counts stay sealed while voting is active.
              Only certified/public result stages reveal totals.
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function CandidateDashboard() {
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const load = async () => {
    setLoading(true);
    try {
      const r = await candidateService.mine();
      setApplications(r.data.data.applications || []);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const approved = applications.filter((a) => a.status === "APPROVED").length;
    const pending = applications.filter((a) => a.status === "SUBMITTED").length;
    const official = applications.filter((a) => a.candidate?.isActive).length;
    const visibleVotes = applications.reduce(
      (sum, app) => sum + Number(app.candidate?.voteCount || 0),
      0,
    );
    return { approved, pending, official, visibleVotes };
  }, [applications]);

  return (
    <PageWrapper showFooter={false}>
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="page-kicker mb-2">Candidate workspace</p>
              <h1 className="page-title">Candidate dashboard</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Track your nomination, EC decision, election assignment, and
                public result status without exposing live vote counts.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                icon={<RefreshCw size={15} />}
                onClick={load}
              >
                Refresh
              </Button>
              <Link to="/candidate/register" className="btn-yellow">
                <FilePlus2 size={15} />
                New application
              </Link>
            </div>
          </div>
        </header>

        <section className="mb-6 grid gap-4 md:grid-cols-4">
          <StatCard
            label="Applications"
            value={loading ? "..." : applications.length}
            icon={<Briefcase size={18} />}
          />
          <StatCard
            label="Approved"
            value={loading ? "..." : stats.approved}
            icon={<CheckCircle2 size={18} />}
            tone="green"
          />
          <StatCard
            label="Pending review"
            value={loading ? "..." : stats.pending}
            icon={<Clock3 size={18} />}
            tone="amber"
          />
          <StatCard
            label="Visible votes"
            value={loading ? "..." : formatNumber(stats.visibleVotes)}
            icon={<BarChart3 size={18} />}
            tone="slate"
          />
        </section>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="skeleton h-56 rounded-lg" />
            ))}
          </div>
        ) : applications.length ? (
          <div className="space-y-5">
            {applications.map((app) => (
              <ApplicationCard key={app.id} app={app} />
            ))}
          </div>
        ) : (
          <section className="rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm">
            <Briefcase size={32} className="mx-auto mb-3 text-slate-300" />
            <h2 className="text-xl font-semibold text-slate-950">
              No candidate applications yet
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Submit a candidate application for EC review. If approved, your
              candidate profile is added to an official draft election.
            </p>
            <Link to="/candidate/register" className="btn-yellow mt-5">
              Apply as candidate
            </Link>
          </section>
        )}
      </div>
    </PageWrapper>
  );
}
