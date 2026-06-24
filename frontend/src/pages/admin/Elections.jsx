import { Link } from "react-router-dom";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Vote,
} from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/Badge";
import { useElections } from "../../hooks/useElection";
import {
  formatDate,
  formatNumber,
  formatTimeRemaining,
} from "../../utils/formatters";
function getElectionAction(e) {
  if (e.status === "ACTIVE")
    return { label: "Live room", className: "btn-green btn-sm" };
  if (e.status === "PAUSED")
    return { label: "Resume", className: "btn-outline-green btn-sm" };
  if (e.status === "CLOSED")
    return { label: "Certify", className: "btn-outline-cyan btn-sm" };
  if (e.status === "RESULTS_DECLARED")
    return { label: "Certified", className: "btn-ghost btn-sm" };
  return { label: "Prepare", className: "btn-yellow btn-sm" };
}
function getWindowNote(e) {
  if (e.status === "ACTIVE") return formatTimeRemaining(e.endTime);
  if (e.status === "PAUSED") return `Paused, ${formatTimeRemaining(e.endTime)}`;
  if (["CLOSED", "RESULTS_DECLARED"].includes(e.status)) return "Voting ended";
  const start = new Date(e.startTime);
  return start > new Date() ? `Starts ${formatTimeRemaining(e.startTime).replace(" left","")}` : "Ready window";
}
export default function ElectionMgmtPage() {
  const { data, isLoading, refetch } = useElections({ limit: 50 });
  const elections = data?.data || [];
  const total = data?.pagination?.total || elections.length;
  const active = elections.filter((e) => e.status === "ACTIVE").length,
    draft = elections.filter((e) => e.status === "DRAFT").length,
    closed = elections.filter((e) =>
      ["CLOSED", "RESULTS_DECLARED"].includes(e.status),
    ).length;
  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <main className="flex-1 min-w-0 p-5 lg:pl-80 sm:p-8">
        <header className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="section-label mb-2">Election operations</p>
            <h1 className="text-3xl font-semibold text-slate-950">
              Election Management
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Create, prepare, govern, and certify elections from one workspace.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              icon={<RefreshCw size={15} />}
              onClick={() => refetch()}
            >
              Refresh
            </Button>
            <Link to="/admin/governance" className="btn-outline-yellow">
              <ShieldCheck size={15} />
              Governance
            </Link>
            <Link to="/admin/elections/new" className="btn-yellow">
              <Plus size={15} />
              New election
            </Link>
          </div>
        </header>
        <section className="mb-6 grid gap-4 md:grid-cols-3">
          {[
            {
              label: "Active elections",
              value: active,
              icon: <Vote size={18} />,
              tone: "text-green-700 bg-green-50",
            },
            {
              label: "Drafts preparing",
              value: draft,
              icon: <Clock size={18} />,
              tone: "text-blue-700 bg-blue-50",
            },
            {
              label: "Closed or certified",
              value: closed,
              icon: <CheckCircle2 size={18} />,
              tone: "text-slate-700 bg-slate-100",
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">
                  {card.label}
                </p>
                <span className={`rounded-md p-2 ${card.tone}`}>
                  {card.icon}
                </span>
              </div>
              <p className="mt-3 text-3xl font-semibold text-slate-950">
                {formatNumber(card.value)}
              </p>
            </div>
          ))}
        </section>
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-semibold text-slate-950">
                Election register
              </h2>
              <p className="text-sm text-slate-500">{total} records tracked</p>
            </div>
            <Input
              className="md:max-w-xs"
              placeholder="Search elections"
              icon={<Search size={15} />}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Election</th>
                  <th>Status</th>
                  <th>Window</th>
                  <th>Constituency</th>
                  <th className="text-right">Votes</th>
                  <th>Operations</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={6}>
                          <div className="skeleton h-9 w-full rounded" />
                        </td>
                      </tr>
                    ))
                  : elections.map((e) => {
                    const action = getElectionAction(e);
                    return (
                      <tr key={e.id}>
                        <td>
                          <div className="min-w-[220px]">
                            <p className="font-medium text-slate-950">
                              {e.title}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              ID {e.id.slice(0, 8)} / Chain{" "}
                              {e.blockchainId || "not linked"}
                            </p>
                          </div>
                        </td>
                        <td>
                          <StatusBadge status={e.status} />
                        </td>
                        <td>
                          <div className="flex items-start gap-2 text-sm text-slate-600">
                            <CalendarDays
                              size={15}
                              className="mt-0.5 text-slate-400"
                            />
                            <span>
                              {formatDate(e.startTime)}
                              <br />
                              <span className="text-xs text-slate-400">
                                to {formatDate(e.endTime)}
                              </span>
                              <br />
                              <span className="text-xs font-medium text-blue-700">
                                {getWindowNote(e)}
                              </span>
                            </span>
                          </div>
                        </td>
                        <td className="text-slate-600">{e.constituency}</td>
                        <td className="text-right font-mono">
                          {formatNumber(e.totalVotesCast || 0)}
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <Link
                              to={`/admin/elections/${e.id}/conduct`}
                              className={action.className}
                            >
                              {action.label}
                            </Link>
                            <Link
                              to={`/admin/elections/${e.id}/roll`}
                              className="btn-ghost btn-sm"
                            >
                              Voter roll
                            </Link>
                            <Link
                              to={`/elections/${e.id}/results`}
                              className="btn-ghost btn-sm"
                            >
                              Results
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
