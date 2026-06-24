import { Link } from "react-router-dom";
import {
  Briefcase,
  Landmark,
  ShieldCheck,
  UserCheck,
  Vote,
} from "lucide-react";
import PageWrapper from "../components/layout/PageWrapper";
import { useAuth } from "../context/AuthContext";

export default function ParticipationDashboard() {
  const { user, voter } = useAuth();
  const hasVoterProfile = Boolean(voter);
  const voterStatus = voter?.status || "Not registered";
  const voterTitle = hasVoterProfile
    ? "Continue to voter workspace"
    : "Register as voter";
  const voterDescription = hasVoterProfile
    ? "View your voter status, check election eligibility, and cast ballots only during the official voting window."
    : "Submit identity details, wait for EC verification, receive eligibility for selected elections, and vote only during the election timeline.";
  const voterAction = hasVoterProfile
    ? "Open voter dashboard"
    : "Start voter registration";

  return (
    <PageWrapper showFooter={false}>
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <p className="section-label mb-2">Participation dashboard</p>
          <h1 className="text-4xl font-semibold text-slate-950">
            Choose your workspace
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Continue with your verified voter profile, or open the candidate
            workspace if you want to apply for an election. Election Commission
            approval controls both voter eligibility and candidate
            participation.
          </p>
        </header>
        <section className="grid gap-5 lg:grid-cols-2">
          <Link
            to={hasVoterProfile ? "/voter/dashboard" : "/voter/register"}
            className="group rounded-lg border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <UserCheck size={24} />
            </div>
            <h2 className="text-2xl font-semibold text-slate-950">
              {voterTitle}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {voterDescription}
            </p>
            <div className="mt-6 flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 text-sm">
              <span className="font-medium text-slate-600">
                Current voter status
              </span>
              <span className="font-semibold text-blue-700">{voterStatus}</span>
            </div>
            <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700">
              {voterAction}
              <Vote size={15} />
            </div>
          </Link>
          <Link
            to="/candidate/dashboard"
            className="group rounded-lg border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-green-50 text-green-700">
              <Briefcase size={24} />
            </div>
            <h2 className="text-2xl font-semibold text-slate-950">
              Candidate application workspace
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Submit candidate details and manifesto for EC review. Once
              approved, your profile is added to the official candidate list for
              a draft election.
            </p>
            <div className="mt-6 flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 text-sm">
              <span className="font-medium text-slate-600">
                Application workspace
              </span>
              <span className="font-semibold text-green-700">Open</span>
            </div>
          </Link>
        </section>
        {[
          "EC verifies voters and candidates",
          "EC builds election voter roll",
          "Votes remain private from EC/backend",
          "Results are sealed until close/certification",
        ].map((text, i) => (
          <div
            key={text}
            className="mt-4 inline-flex mr-3 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600"
          >
            <ShieldCheck size={13} className="text-blue-700" />
            {text}
          </div>
        ))}
        {[
          "SUPER_ADMIN",
          "ELECTION_COMMISSION",
          "AUDITOR",
          "FRAUD_ANALYST",
        ].includes(user?.role) && (
          <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-5">
            <div className="flex items-center gap-3">
              <Landmark className="text-blue-700" />
              <div>
                <p className="font-semibold text-blue-900">
                  Administrative access detected
                </p>
                <p className="text-sm text-blue-700">
                  Use the Election Commission dashboard for governance, voter
                  review, candidate approval, and election conduct.
                </p>
              </div>
              <Link to="/admin" className="btn-yellow ml-auto">
                <Vote size={15} />
                Open EC dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
