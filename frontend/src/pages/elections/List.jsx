import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Vote,
  Search,
  Clock,
  Users,
  ChevronRight,
  Lock,
  CheckCircle2,
  Eye,
} from "lucide-react";
import { clsx } from "clsx";
import { useElections } from "../../hooks/useElection";
import { useMyVoterProfile } from "../../hooks/useVoter";
import { useAuth } from "../../context/AuthContext";
import PageWrapper from "../../components/layout/PageWrapper";
import Input from "../../components/ui/Input";
import { StatusBadge } from "../../components/ui/Badge";
import { SkeletonCard } from "../../components/ui/Skeleton";
import LiveIndicator from "../../components/ui/LiveIndicator";
import Pagination from "../../components/ui/Pagination";
import {
  formatDate,
  formatTimeRemaining,
  formatNumber,
} from "../../utils/formatters";
import { useDebounce } from "../../hooks/useDebounce";
const TABS = [
  { label: "All", value: "" },
  { label: "Active", value: "ACTIVE" },
  { label: "Draft", value: "DRAFT" },
  { label: "Closed", value: "CLOSED" },
  { label: "Declared", value: "RESULTS_DECLARED" },
];
export default function ElectionListPage() {
  const [sf, setSF] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const ds = useDebounce(search, 400);
  const { isAuthenticated } = useAuth();
  const { data: vd } = useMyVoterProfile(isAuthenticated);
  const canVote = isAuthenticated && vd?.status === "VERIFIED";
  const { data, isLoading } = useElections({
    status: sf || undefined,
    page,
    limit: 9,
  });
  const elections = data?.data || [];
  const total = data?.pagination?.total || 0;
  const pages = data?.pagination?.pages || 1;
  return (
    <PageWrapper>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="font-semibold text-5xl text-slate-950">
              <span className="text-blue-700">ELECTIONS</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {total} election{total !== 1 ? "s" : ""} found
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Input
            placeholder="Search..."
            icon={<Search size={14} />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="flex-1"
          />
          <div className="flex border border-slate-200 overflow-hidden shrink-0">
            {TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => {
                  setSF(t.value);
                  setPage(1);
                }}
                className={clsx(
                  "px-3 py-2.5 text-xs font-bold transition-all border-r border-slate-200 last:border-r-0",
                  sf === t.value
                    ? "bg-blue-600 text-white"
                    : "text-slate-500 hover:text-slate-950 hover:bg-slate-50",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} rows={4} />
            ))}
          </div>
        ) : elections.length === 0 ? (
          <div className="text-center py-16">
            <Vote size={40} className="text-slate-400 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No elections found</p>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {elections.map((e) => {
                const isA = e.status === "ACTIVE";
                const isD = e.status === "RESULTS_DECLARED";
                const target = isD
                  ? `/elections/${e.id}/results`
                  : isA
                    ? canVote
                      ? `/elections/${e.id}/vote`
                      : isAuthenticated
                        ? "/voter/register"
                        : "/login"
                    : `/elections/${e.id}`;
                return (
                  <motion.div
                    key={e.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Link
                      to={target}
                      className={clsx(
                        "block bg-white border transition-all duration-200 hover:-translate-y-0.5 overflow-hidden",
                        isA
                          ? "border-green/40 hover:border-green/70"
                          : isD
                            ? "border-cyan/30 hover:border-cyan/60"
                            : "border-slate-200 hover:border-blue-600/40",
                      )}
                    >
                      <div
                        className={clsx(
                          "h-1",
                          isA ? "bg-green" : isD ? "bg-cyan" : "bg-blue-600",
                        )}
                      />
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex-1 min-w-0">
                            <StatusBadge status={e.status} />
                            <h3 className="font-semibold text-2xl text-slate-950 mt-1.5 group-hover:text-blue-700 leading-tight">
                              {e.title}
                            </h3>
                          </div>
                          {isA && <LiveIndicator size="sm" />}
                        </div>
                        <div className="flex flex-wrap gap-3 mb-3">
                          <span className="text-xs text-slate-500">
                            {e.constituency}
                          </span>
                          <span className="text-xs text-slate-500">
                            {e.candidateCount || 0} candidates
                          </span>
                          <span className="text-xs text-slate-500">
                            {formatNumber(e.totalVotesCast || 0)} votes
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                          <span className="text-xs text-slate-500">
                            {isA
                              ? formatTimeRemaining(e.endTime)
                              : formatDate(e.endTime)}
                          </span>
                          <div className="flex gap-2">
                            {isD && (
                              <span
                                className="btn-outline-cyan btn-sm"
                              >
                                <Eye size={12} />
                                Results
                              </span>
                            )}
                            {isA &&
                              (canVote ? (
                                <span className="btn-yellow btn-sm">
                                  <Vote size={12} />
                                  Vote
                                  <ChevronRight size={11} />
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                  <Lock size={11} />
                                  Verify
                                </span>
                              ))}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
            {pages > 1 && (
              <div className="mt-6">
                <Pagination
                  page={page}
                  pages={pages}
                  total={total}
                  limit={9}
                  onPage={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>
    </PageWrapper>
  );
}
