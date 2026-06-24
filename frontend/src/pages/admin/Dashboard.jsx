import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
  UserRoundCheck,
  Shield,
  Users,
  Vote,
} from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import { StatusBadge } from "../../components/ui/Badge";
import { SkeletonStat } from "../../components/ui/Skeleton";
import CountUp from "../../components/ui/CountUp";
import { formatNumber, formatRelative } from "../../utils/formatters";
import { usePlatformOverview } from "../../hooks/useAnalytics";
import { useFraudDashboard } from "../../hooks/useFraud";
import { useElections } from "../../hooks/useElection";
function Metric({ label, value, sub, icon, to, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
    slate: "bg-slate-100 text-slate-700",
  };
  return (
    <Link
      to={to || "#"}
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={`rounded-md p-2 ${tones[tone]}`}>{icon}</span>
      </div>
      <p className="mt-4 text-3xl font-semibold text-slate-950">
        <CountUp end={value || 0} />
      </p>
      <p className="mt-1 text-sm text-slate-500">{sub}</p>
    </Link>
  );
}
export default function AdminDashboard() {
  const { data: platform, isLoading: pL } = usePlatformOverview();
  const { data: fraud, isLoading: fL } = useFraudDashboard();
  const { data: ed, isLoading: eL } = useElections({ limit: 6 });
  const elections = ed?.data || [];
  const fraudLogs = fraud?.recentLogs?.slice(0, 5) || [];
  const loading = pL || fL;
  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <main className="flex-1 min-w-0 p-5 lg:pl-80 sm:p-8">
        <header className="mb-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="page-kicker mb-2">Command center</p>
            <h1 className="page-title">Administrative dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Monitor voter readiness, election activity, fraud review, and
              audit health.
            </p>
          </div>
          <Link to="/admin/governance" className="btn-yellow">
            <Shield size={15} />
            Open governance
          </Link>
          </div>
        </header>
        {fraud?.summary?.unresolvedAlerts > 0 && (
          <div className="mb-6 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-red-700" size={18} />
              <p className="text-sm font-semibold text-red-800">
                {fraud.summary.unresolvedAlerts} unresolved fraud alert
                {fraud.summary.unresolvedAlerts > 1 ? "s" : ""}
              </p>
            </div>
            <Link
              to="/admin/fraud"
              className="text-sm font-semibold text-red-700 hover:underline"
            >
              Review
            </Link>
          </div>
        )}
        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonStat key={i} />)
          ) : (
            <>
              <Metric
                label="Total voters"
                value={platform?.voters?.total}
                sub={`${platform?.voters?.VERIFIED || 0} verified`}
                icon={<Users size={18} />}
                to="/admin/voters"
              />
              <Metric
                label="Votes recorded"
                value={platform?.totalVotesCast}
                sub={`${platform?.elections?.ACTIVE || 0} active elections`}
                icon={<Vote size={18} />}
                to="/admin/elections"
                tone="green"
              />
              <Metric
                label="Fraud alerts"
                value={fraud?.summary?.unresolvedAlerts}
                sub={`${fraud?.summary?.flaggedVoters || 0} flagged voters`}
                icon={<AlertTriangle size={18} />}
                to="/admin/fraud"
                tone={fraud?.summary?.unresolvedAlerts > 0 ? "red" : "slate"}
              />
              <Metric
                label="Credentials"
                value={platform?.nftCredentials}
                sub="issued voter credentials"
                icon={<CheckCircle2 size={18} />}
                to="/admin/voters"
                tone="slate"
              />
              <Metric
                label="Candidate applications"
                value={platform?.candidateApplications?.SUBMITTED || 0}
                sub={`${platform?.candidateApplications?.APPROVED || 0} approved`}
                icon={<UserRoundCheck size={18} />}
                to="/admin/candidates"
                tone="blue"
              />
            </>
          )}
        </section>
        <section className="mb-6 grid gap-3 md:grid-cols-4">
          <Link to="/admin/elections/new" className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/40">
            <p className="text-sm font-semibold text-slate-950">Create election</p>
            <p className="mt-1 text-xs text-slate-500">Open a new EC-controlled election shell.</p>
          </Link>
          <Link to="/admin/candidates" className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/40">
            <p className="text-sm font-semibold text-slate-950">Review candidates</p>
            <p className="mt-1 text-xs text-slate-500">Approve participants into official lists.</p>
          </Link>
          <Link to="/admin/voters" className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/40">
            <p className="text-sm font-semibold text-slate-950">Verify voters</p>
            <p className="mt-1 text-xs text-slate-500">Approve identity before election selection.</p>
          </Link>
          <Link to="/admin/elections" className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/40">
            <p className="text-sm font-semibold text-slate-950">Conduct election</p>
            <p className="mt-1 text-xs text-slate-500">Activate, pause, close, and certify.</p>
          </Link>
        </section>
        <div className="grid gap-6 xl:grid-cols-3">
          <section className="xl:col-span-2 rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <div>
                <h2 className="font-semibold text-slate-950">
                  Election activity
                </h2>
                <p className="text-sm text-slate-500">
                  Recent election records and status
                </p>
              </div>
              <Link to="/admin/elections" className="btn-ghost btn-sm">
                Manage
                <ArrowRight size={14} />
              </Link>
            </div>
            {eL ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton h-12 rounded" />
                ))}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {elections.map((e) => (
                  <Link
                    key={e.id}
                    to={`/admin/elections/${e.id}/conduct`}
                    className="flex items-center gap-4 p-4 hover:bg-slate-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-950">
                        {e.title}
                      </p>
                      <p className="text-sm text-slate-500">{e.constituency}</p>
                    </div>
                    <span className="font-mono text-sm text-slate-500">
                      {formatNumber(e.totalVotesCast || 0)}
                    </span>
                    <StatusBadge status={e.status} />
                  </Link>
                ))}
              </div>
            )}
          </section>
          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <div>
                <h2 className="font-semibold text-slate-950">Review queue</h2>
                <p className="text-sm text-slate-500">Latest security events</p>
              </div>
              <FileText className="text-slate-400" size={18} />
            </div>
            {fraudLogs.length ? (
              <div className="divide-y divide-slate-100">
                {fraudLogs.map((log) => (
                  <div key={log.id} className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-semibold text-slate-950">
                        {log.fraudType?.replace(/_/g, " ")}
                      </p>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                        {log.severity}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                      {log.description}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      {formatRelative(log.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <CheckCircle2
                  className="mx-auto mb-3 text-green-700"
                  size={30}
                />
                <p className="font-semibold text-slate-950">
                  No open review items
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Fraud monitoring is quiet.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
