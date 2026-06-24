import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  RefreshCw,
  Search,
  ShieldCheck,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import Input, { Select } from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Badge, { StatusBadge } from "../../components/ui/Badge";
import { electionService } from "../../services/election.service";
import { formatDate, formatNumber } from "../../utils/formatters";

export default function ElectionRollPage() {
  const { id } = useParams();
  const [tab, setTab] = useState("selectable");
  const [search, setSearch] = useState("");
  const [rollStatus, setRollStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [election, setElection] = useState(null);
  const [selectable, setSelectable] = useState({
    data: [],
    total: 0,
    pages: 1,
  });
  const [roll, setRoll] = useState({ data: [], total: 0, pages: 1 });

  const params = useMemo(
    () => ({ limit: 50, search: search || undefined }),
    [search],
  );

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [e, sel, r] = await Promise.all([
        electionService.getById(id),
        electionService.getSelectableVoters(id, params),
        electionService.getElectionRoll(id, {
          ...params,
          status: rollStatus || undefined,
        }),
      ]);
      setElection(e.data.data);
      setSelectable(sel.data.data);
      setRoll(r.data.data);
    } catch (e) {
      setError(
        e.response?.data?.message ||
          e.message ||
          "Unable to load election roll",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id, params, rollStatus]);

  const action = async (type, voterId) => {
    const reason =
      type === "select"
        ? "Selected by Election Commission"
        : window.prompt(
            type === "reject"
              ? "Reason for rejecting voter from this election"
              : "Reason for revoking voter from this election",
          ) || `${type} by Election Commission`;
    setBusy(`${type}:${voterId}`);
    setError("");
    try {
      if (type === "select")
        await electionService.selectVoter(id, voterId, reason);
      if (type === "reject")
        await electionService.rejectVoter(id, voterId, reason);
      if (type === "revoke")
        await electionService.revokeVoter(id, voterId, reason);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Action failed");
    } finally {
      setBusy("");
    }
  };

  const rebuild = async () => {
    setBusy("rebuild");
    setError("");
    try {
      await electionService.rebuildEligibility(id);
      await load();
    } catch (e) {
      setError(
        e.response?.data?.message ||
          e.message ||
          "Unable to rebuild eligibility root",
      );
    } finally {
      setBusy("");
    }
  };

  const selectedCount = roll.data.filter((r) => r.status === "SELECTED").length;
  const canEdit = election?.status === "DRAFT";

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <main className="flex-1 min-w-0 p-5 lg:pl-80 sm:p-8">
        <header className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="section-label mb-2">Election Commission voter roll</p>
            <h1 className="text-3xl font-semibold text-slate-950">
              {election?.title || "Election roll"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Select the exact voters allowed to receive eligibility commitments
              for this election.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/elections" className="btn-ghost">
              Back
            </Link>
            <Button
              variant="ghost"
              icon={<RefreshCw size={15} />}
              onClick={load}
            >
              Refresh
            </Button>
            <Button
              icon={<KeyRound size={15} />}
              loading={busy === "rebuild"}
              disabled={!canEdit}
              onClick={rebuild}
            >
              Rebuild root
            </Button>
          </div>
        </header>

        <section className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Election status
            </p>
            <div className="mt-3">
              <StatusBadge status={election?.status} />
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Selected voters
            </p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">
              {formatNumber(election?.totalRegistered || selectedCount)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Eligibility root
            </p>
            <p className="mt-3 truncate font-mono text-sm text-slate-700">
              {election?.merkleRoot || "Not built"}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Voting window</p>
            <p className="mt-3 text-sm text-slate-700">
              {election
                ? `${formatDate(election.startTime)} to ${formatDate(election.endTime)}`
                : "Loading"}
            </p>
          </div>
        </section>

        {!canEdit && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            <ShieldCheck size={16} />
            The roll is locked after activation. Voters can only vote inside the
            configured election timeline.
          </div>
        )}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex gap-2">
              <button
                className={`rounded-md px-3 py-2 text-sm font-semibold ${tab === "selectable" ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50"}`}
                onClick={() => setTab("selectable")}
              >
                <Users size={15} className="mr-2 inline" />
                Selectable voters
              </button>
              <button
                className={`rounded-md px-3 py-2 text-sm font-semibold ${tab === "roll" ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50"}`}
                onClick={() => setTab("roll")}
              >
                <CheckCircle2 size={15} className="mr-2 inline" />
                Election roll
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-[260px_180px]">
              <Input
                placeholder="Search voters"
                icon={<Search size={15} />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {tab === "roll" && (
                <Select
                  value={rollStatus}
                  onChange={(e) => setRollStatus(e.target.value)}
                  options={[
                    { value: "", label: "All roll statuses" },
                    { value: "SELECTED", label: "Selected" },
                    { value: "REJECTED", label: "Rejected" },
                    { value: "REVOKED", label: "Revoked" },
                  ]}
                />
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            {tab === "selectable" ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>Voter</th>
                    <th>Status</th>
                    <th>Identity</th>
                    <th>Current roll state</th>
                    <th className="text-right">Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 6 }).map((_, i) => (
                        <tr key={i}>
                          <td colSpan={5}>
                            <div className="skeleton h-9 rounded" />
                          </td>
                        </tr>
                      ))
                    : selectable.data.map((v) => (
                        <tr key={v.id}>
                          <td>
                            <p className="font-medium text-slate-950">
                              {v.firstName} {v.lastName}
                            </p>
                            <p className="font-mono text-xs text-slate-500">
                              {v.voterIdNumber || v.id.slice(0, 10)}
                            </p>
                          </td>
                          <td>
                            <StatusBadge status={v.status} />
                          </td>
                          <td>
                            {v.identityComplete ? (
                              <Badge variant="green">Complete</Badge>
                            ) : (
                              <Badge variant="orange">Incomplete</Badge>
                            )}
                          </td>
                          <td>
                            {v.electionSelection ? (
                              <StatusBadge
                                status={v.electionSelection.status}
                              />
                            ) : (
                              <Badge>Not selected</Badge>
                            )}
                          </td>
                          <td>
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline-green"
                                icon={<UserPlus size={14} />}
                                disabled={
                                  !canEdit ||
                                  v.electionSelection?.status === "SELECTED"
                                }
                                loading={busy === `select:${v.id}`}
                                onClick={() => action("select", v.id)}
                              >
                                Select
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                icon={<UserMinus size={14} />}
                                disabled={
                                  !canEdit ||
                                  v.electionSelection?.status === "REJECTED"
                                }
                                loading={busy === `reject:${v.id}`}
                                onClick={() => action("reject", v.id)}
                              >
                                Reject
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Voter</th>
                    <th>Roll status</th>
                    <th>Reason</th>
                    <th>Updated</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 6 }).map((_, i) => (
                        <tr key={i}>
                          <td colSpan={5}>
                            <div className="skeleton h-9 rounded" />
                          </td>
                        </tr>
                      ))
                    : roll.data.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <p className="font-medium text-slate-950">
                              {row.voter.firstName} {row.voter.lastName}
                            </p>
                            <p className="font-mono text-xs text-slate-500">
                              {row.voter.voterIdNumber ||
                                row.voter.id.slice(0, 10)}
                            </p>
                          </td>
                          <td>
                            <StatusBadge status={row.status} />
                          </td>
                          <td className="max-w-sm text-slate-500">
                            {row.reason || "No reason recorded"}
                          </td>
                          <td className="text-slate-500">
                            {formatDate(row.updatedAt)}
                          </td>
                          <td>
                            <div className="flex justify-end">
                              <Button
                                size="sm"
                                variant="outline-red"
                                disabled={!canEdit || row.status !== "SELECTED"}
                                loading={busy === `revoke:${row.voterId}`}
                                onClick={() => action("revoke", row.voterId)}
                              >
                                Revoke
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
