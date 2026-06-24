import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FileText,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import Input, { Select } from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Badge, { StatusBadge } from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import { voterService } from "../../services/voter.service";
import {
  formatAddress,
  formatDate,
  formatDateTime,
  formatNumber,
} from "../../utils/formatters";

const statusOptions = [
  { value: "", label: "All statuses" },
  { value: "PENDING", label: "Pending review" },
  { value: "VERIFIED", label: "Verified" },
  { value: "REJECTED", label: "Rejected" },
  { value: "BLACKLISTED", label: "Blacklisted" },
];

function identityBadge(voter) {
  const complete =
    voter.faceVerified && voter.idVerified && voter.livenessVerified;
  if (complete) return <Badge variant="green">Identity complete</Badge>;
  const missing = ["face", "ID", "liveness"].filter(
    (label, i) =>
      ![voter.faceVerified, voter.idVerified, voter.livenessVerified][i],
  );
  return <Badge variant="orange">Missing {missing.join(", ")}</Badge>;
}
function DetailRow({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium text-slate-900">
        {value || "-"}
      </p>
    </div>
  );
}
export default function VoterMgmtPage() {
  const [status, setStatus] = useState("PENDING");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [review, setReview] = useState(null);
  const [data, setData] = useState({ data: [], total: 0, pages: 1 });
  const [stats, setStats] = useState({
    total: 0,
    flaggedVoters: 0,
    byStatus: {},
  });

  const params = useMemo(
    () => ({
      page,
      limit: 20,
      status: status || undefined,
      search: search || undefined,
    }),
    [page, status, search],
  );

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [voters, summary] = await Promise.all([
        voterService.getAll(params),
        voterService.getStats(),
      ]);
      setData(voters.data.data);
      setStats(summary.data.data);
    } catch (e) {
      setError(
        e.response?.data?.message || e.message || "Unable to load voters",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [params]);

  const openReview = async (voter) => {
    setReviewOpen(true);
    setReviewLoading(true);
    setError("");
    try {
      const res = await voterService.getReviewDetail(voter.id);
      setReview(res.data.data);
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Unable to load review file");
      setReviewOpen(false);
    } finally {
      setReviewLoading(false);
    }
  };

  const act = async (voter, action) => {
    const reason =
      action === "reject"
        ? window.prompt("Reason for rejection") ||
          "Rejected by Election Commission"
        : action === "blacklist"
          ? window.prompt("Reason for blacklist") ||
            "Blacklisted by Election Commission"
          : "Approved by Election Commission";
    setBusy(`${action}:${voter.id}`);
    setError("");
    try {
      if (action === "verify")
        await voterService.verify(voter.id, {
          reason,
          faceVerified: true,
          idVerified: true,
          livenessVerified: true,
        });
      if (action === "reject") await voterService.reject(voter.id, reason);
      if (action === "blacklist")
        await voterService.blacklist(voter.id, reason);
      await load();
      if (reviewOpen) setReviewOpen(false);
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Action failed");
    } finally {
      setBusy("");
    }
  };

  const cards = [
    {
      label: "Registered voters",
      value: stats.total,
      icon: <Users size={18} />,
      tone: "text-blue-700 bg-blue-50",
    },
    {
      label: "Pending review",
      value: stats.byStatus?.PENDING || 0,
      icon: <ClipboardCheck size={18} />,
      tone: "text-orange-700 bg-orange-50",
    },
    {
      label: "Verified",
      value: stats.byStatus?.VERIFIED || 0,
      icon: <UserCheck size={18} />,
      tone: "text-green-700 bg-green-50",
    },
    {
      label: "Flagged",
      value: stats.flaggedVoters || 0,
      icon: <ShieldAlert size={18} />,
      tone: "text-red-700 bg-red-50",
    },
  ];

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <main className="flex-1 min-w-0 p-5 lg:pl-80 sm:p-8">
        <header className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="section-label mb-2">Election Commission office</p>
            <h1 className="text-3xl font-semibold text-slate-950">
              Voter Review
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Approve, reject, and protect the voter register before election
              rolls are built.
            </p>
          </div>
          <Button
            variant="ghost"
            icon={<RefreshCw size={15} />}
            onClick={load}
            loading={loading}
          >
            Refresh
          </Button>
        </header>

        <section className="mb-6 grid gap-4 md:grid-cols-4">
          {cards.map((card) => (
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
                Registration queue
              </h2>
              <p className="text-sm text-slate-500">
                {formatNumber(data.total)} voters in the current view
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-[240px_180px]">
              <Input
                placeholder="Search voter ID, name, wallet"
                icon={<Search size={15} />}
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
              />
              <Select
                value={status}
                onChange={(e) => {
                  setPage(1);
                  setStatus(e.target.value);
                }}
                options={statusOptions}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Voter</th>
                  <th>Status</th>
                  <th>Identity</th>
                  <th>Constituency</th>
                  <th>Registered</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={6}>
                          <div className="skeleton h-9 w-full rounded" />
                        </td>
                      </tr>
                    ))
                  : data.data.map((v) => (
                      <tr key={v.id}>
                        <td>
                          <div className="min-w-[230px]">
                            <p className="font-medium text-slate-950">
                              {v.firstName} {v.lastName}
                            </p>
                            <p className="mt-0.5 font-mono text-xs text-slate-500">
                              {v.voterIdNumber || v.id.slice(0, 10)}
                            </p>
                          </div>
                        </td>
                        <td>
                          <StatusBadge status={v.status} />
                        </td>
                        <td>{identityBadge(v)}</td>
                        <td className="text-slate-600">{v.constituency}</td>
                        <td className="text-slate-500">
                          {formatDate(v.registeredAt)}
                        </td>
                        <td>
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              icon={<Eye size={14} />}
                              onClick={() => openReview(v)}
                            >
                              Check details
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                {!loading && data.data.length === 0 && (
                  <tr>
                    <td colSpan={6}>
                      <div className="py-10 text-center text-sm text-slate-500">
                        No voters match this view.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 p-4 text-sm text-slate-500">
            <span>
              Page {page} of {Math.max(data.pages || 1, 1)}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={page >= data.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </section>
        <Modal
          open={reviewOpen}
          onClose={() => setReviewOpen(false)}
          title="Voter review file"
          subtitle="Inspect identity data and document metadata before making an EC decision."
          size="xl"
          accent="cyan"
          footer={
            review?.voter ? (
              <>
                <Button
                  variant="ghost"
                  onClick={() => setReviewOpen(false)}
                  disabled={!!busy}
                >
                  Close
                </Button>
                <Button
                  variant="outline-red"
                  icon={<ShieldAlert size={14} />}
                  loading={busy === `blacklist:${review.voter.id}`}
                  disabled={review.voter.status === "BLACKLISTED"}
                  onClick={() => act(review.voter, "blacklist")}
                >
                  Blacklist
                </Button>
                <Button
                  variant="ghost"
                  icon={<UserX size={14} />}
                  loading={busy === `reject:${review.voter.id}`}
                  disabled={review.voter.status === "REJECTED"}
                  onClick={() => act(review.voter, "reject")}
                >
                  Reject
                </Button>
                <Button
                  variant="outline-green"
                  icon={<CheckCircle2 size={14} />}
                  loading={busy === `verify:${review.voter.id}`}
                  disabled={review.voter.status === "VERIFIED"}
                  onClick={() => act(review.voter, "verify")}
                >
                  Approve voter
                </Button>
              </>
            ) : null
          }
        >
          {reviewLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton h-12 rounded" />
              ))}
            </div>
          ) : review?.voter ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div>
                  <p className="text-lg font-semibold text-slate-950">
                    {review.voter.firstName} {review.voter.lastName}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Voter ID {review.voter.voterIdNumber || "-"} /{" "}
                    {review.voter.constituency}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={review.voter.status} />
                  {identityBadge(review.voter)}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <DetailRow label="Date of birth" value={formatDate(review.voter.dateOfBirth)} />
                <DetailRow label="Gender" value={review.voter.gender} />
                <DetailRow label="Wallet" value={formatAddress(review.voter.walletAddress, 6)} />
                <DetailRow label="Registered" value={formatDateTime(review.voter.registeredAt)} />
                <DetailRow label="Risk score" value={String(review.voter.riskScore || 0)} />
                <DetailRow label="Flag status" value={review.voter.isFlagged ? review.voter.flagReason || "Flagged" : "Clear"} />
              </div>

              <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
                  <ShieldCheck size={16} className="text-blue-700" />
                  <h3 className="font-semibold text-slate-950">
                    Identity checks
                  </h3>
                </div>
                <div className="grid gap-3 p-4 md:grid-cols-3">
                  {[
                    ["Face", review.voter.faceVerified],
                    ["ID document", review.voter.idVerified],
                    ["Liveness", review.voter.livenessVerified],
                  ].map(([label, ok]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5"
                    >
                      <span className="text-sm font-medium text-slate-700">
                        {label}
                      </span>
                      <Badge variant={ok ? "green" : "orange"}>
                        {ok ? "Passed" : "Needs review"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
                  <FileText size={16} className="text-blue-700" />
                  <h3 className="font-semibold text-slate-950">
                    Submitted evidence
                  </h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {review.voter.uploadedDocuments?.length ? (
                    review.voter.uploadedDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[1fr_140px_120px]"
                      >
                        <div>
                          <p className="font-medium text-slate-900">
                            {doc.originalName || doc.type}
                          </p>
                          <p className="mt-1 font-mono text-xs text-slate-500">
                            SHA-256 {String(doc.sha256).slice(0, 24)}...
                          </p>
                        </div>
                        <span className="text-slate-600">{doc.mimeType}</span>
                        <Badge variant={doc.encrypted ? "green" : "orange"}>
                          {doc.encrypted ? "Encrypted" : "Not encrypted"}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-slate-500">
                      No document metadata found for this voter.
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-4 py-3">
                  <h3 className="font-semibold text-slate-950">
                    Review history
                  </h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {review.voter.identityReviews?.length ? (
                    review.voter.identityReviews.map((item) => (
                      <div key={item.id} className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-medium text-slate-900">
                              {item.provider}
                            </p>
                            <p className="text-xs text-slate-500">
                              Submitted {formatDateTime(item.submittedAt)}
                            </p>
                          </div>
                          <StatusBadge status={item.status} />
                        </div>
                        {item.decisionReason && (
                          <p className="mt-2 text-sm text-slate-600">
                            {item.decisionReason}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-slate-500">
                      No prior review record. Approval will create a manual EC review record.
                    </div>
                  )}
                </div>
              </section>
            </div>
          ) : (
            <div className="text-sm text-slate-500">No voter selected.</div>
          )}
        </Modal>
      </main>
    </div>
  );
}
