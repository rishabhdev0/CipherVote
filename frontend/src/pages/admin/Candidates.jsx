import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  UserRoundCheck,
  UserRoundX,
} from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import Input, { Select } from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Badge, { StatusBadge } from "../../components/ui/Badge";
import { candidateService } from "../../services/candidate.service";
import { electionService } from "../../services/election.service";
import { formatDate, formatNumber } from "../../utils/formatters";
import PartyMark from "../../components/ui/PartyMark";

export default function CandidateReviewPage() {
  const [status, setStatus] = useState("SUBMITTED");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [data, setData] = useState({ data: [], total: 0, pages: 1 });
  const [elections, setElections] = useState([]);
  const params = useMemo(
    () => ({
      limit: 50,
      status: status || undefined,
      search: search || undefined,
    }),
    [status, search],
  );

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [apps, els] = await Promise.all([
        candidateService.list(params),
        electionService.getAll({ status: "DRAFT", limit: 100 }),
      ]);
      setData(apps.data.data);
      setElections(els.data.data.data || []);
    } catch (e) {
      setError(
        e.response?.data?.message ||
          e.message ||
          "Unable to load candidate applications",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, [params]);

  const approve = async (app) => {
    const reason =
      window.prompt("Approval note") || "Approved by Election Commission";
    setBusy(`approve:${app.id}`);
    setError("");
    try {
      await candidateService.approve(app.id, reason);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Approval failed");
    } finally {
      setBusy("");
    }
  };
  const reject = async (app) => {
    const reason =
      window.prompt("Rejection reason") || "Rejected by Election Commission";
    setBusy(`reject:${app.id}`);
    setError("");
    try {
      await candidateService.reject(app.id, reason);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Rejection failed");
    } finally {
      setBusy("");
    }
  };
  const assign = async (app, electionId) => {
    if (!electionId) return;
    setBusy(`assign:${app.id}`);
    setError("");
    try {
      await candidateService.assignElection(app.id, electionId);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Assignment failed");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <main className="flex-1 min-w-0 p-5 lg:pl-80 sm:p-8">
        <header className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="section-label mb-2">Election Commission office</p>
            <h1 className="text-3xl font-semibold text-slate-950">
              Candidate Review
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Approve participants into official election candidate lists.
            </p>
          </div>
          <Button variant="ghost" icon={<RefreshCw size={15} />} onClick={load}>
            Refresh
          </Button>
        </header>
        <section className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Applications in view
            </p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">
              {formatNumber(data.total)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Draft elections available
            </p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">
              {formatNumber(elections.length)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Review rule</p>
            <p className="mt-3 text-sm text-slate-600">
              Approval creates an official candidate only while the election is
              DRAFT.
            </p>
          </div>
        </section>
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="font-semibold text-slate-950">
                Candidate applications
              </h2>
              <p className="text-sm text-slate-500">
                EC reviewed participation queue
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-[240px_180px]">
              <Input
                placeholder="Search candidate or party"
                icon={<Search size={15} />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={[
                  { value: "", label: "All statuses" },
                  { value: "SUBMITTED", label: "Submitted" },
                  { value: "APPROVED", label: "Approved" },
                  { value: "REJECTED", label: "Rejected" },
                ]}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Status</th>
                  <th>Election</th>
                  <th>Constituency</th>
                  <th>Submitted</th>
                  <th className="text-right">Decision</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={6}>
                          <div className="skeleton h-9 rounded" />
                        </td>
                      </tr>
                    ))
                  : data.data.map((app) => (
                      <tr key={app.id}>
                        <td>
                          <div className="flex min-w-[240px] items-center gap-3">
                            <PartyMark
                              party={app.party}
                              logoUrl={app.partyLogoUrl}
                              size="sm"
                            />
                            <div>
                              <p className="font-medium text-slate-950">
                                {app.fullName}
                              </p>
                              <p className="text-xs text-slate-500">
                                {app.party} /{" "}
                                {app.contactEmail ||
                                  app.user?.email ||
                                  "No email"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <StatusBadge status={app.status} />
                        </td>
                        <td>
                          {app.election ? (
                            <div>
                              <p className="text-sm font-medium text-slate-700">
                                {app.election.title}
                              </p>
                              <p className="text-xs text-slate-400">
                                {app.election.status}
                              </p>
                            </div>
                          ) : (
                            <select
                              className="input min-w-[220px]"
                              disabled={
                                busy === `assign:${app.id}` ||
                                app.status !== "SUBMITTED"
                              }
                              defaultValue=""
                              onChange={(e) => assign(app, e.target.value)}
                            >
                              <option value="">Assign draft election</option>
                              {elections
                                .filter(
                                  (e) =>
                                    e.constituency === "ALL" ||
                                    e.constituency === app.constituency,
                                )
                                .map((e) => (
                                  <option key={e.id} value={e.id}>
                                    {e.title}
                                  </option>
                                ))}
                            </select>
                          )}
                        </td>
                        <td className="text-slate-600">{app.constituency}</td>
                        <td className="text-slate-500">
                          {formatDate(app.submittedAt)}
                        </td>
                        <td>
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline-green"
                              icon={<UserRoundCheck size={14} />}
                              disabled={
                                app.status !== "SUBMITTED" || !app.electionId
                              }
                              loading={busy === `approve:${app.id}`}
                              onClick={() => approve(app)}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-red"
                              icon={<UserRoundX size={14} />}
                              disabled={app.status !== "SUBMITTED"}
                              loading={busy === `reject:${app.id}`}
                              onClick={() => reject(app)}
                            >
                              Reject
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                {!loading && data.data.length === 0 && (
                  <tr>
                    <td colSpan={6}>
                      <div className="py-10 text-center text-sm text-slate-500">
                        No candidate applications match this view.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
