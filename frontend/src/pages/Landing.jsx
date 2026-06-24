import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck2,
  CheckCircle2,
  Database,
  FileCheck2,
  Fingerprint,
  Gavel,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  Vote,
} from "lucide-react";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import BrandMark from "../components/ui/BrandMark";
import CountUp from "../components/ui/CountUp";
import api from "../services/api";

const steps = [
  {
    title: "Register",
    text: "Voters and candidates submit their role-specific profile.",
    icon: <Fingerprint size={18} />,
  },
  {
    title: "EC review",
    text: "Election Commission verifies identity, eligibility, and candidate applications.",
    icon: <FileCheck2 size={18} />,
  },
  {
    title: "Conduct",
    text: "The official roll, candidates, timeline, and eligibility root are prepared.",
    icon: <CalendarCheck2 size={18} />,
  },
  {
    title: "Vote",
    text: "Verified voters cast one ballot during the active election window.",
    icon: <Vote size={18} />,
  },
  {
    title: "Certify",
    text: "Results are declared after closure, checks, and governance approval.",
    icon: <Gavel size={18} />,
  },
];

const controls = [
  {
    label: "Wallet-bound access",
    detail: "Login is paired with registered wallet ownership.",
    icon: <BadgeCheck size={18} />,
  },
  {
    label: "Contract authority",
    detail: "Critical election and vote state is checked against configured contracts.",
    icon: <ShieldCheck size={18} />,
  },
  {
    label: "Encrypted ballot path",
    detail: "Ballot data is separated from public receipt material.",
    icon: <LockKeyhole size={18} />,
  },
  {
    label: "Tamper-evident records",
    detail: "Audit logs and receipts preserve review history.",
    icon: <ReceiptText size={18} />,
  },
];

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-3xl font-semibold text-slate-950">
        <CountUp end={Number(value || 0)} duration={1400} />
      </p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
    </div>
  );
}

function StepCard({ item, index }) {
  return (
    <div className="relative rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
          {item.icon}
        </span>
        <span className="font-mono text-xs font-semibold text-slate-300">
          0{index + 1}
        </span>
      </div>
      <h3 className="text-base font-semibold text-slate-950">{item.title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{item.text}</p>
    </div>
  );
}

export default function LandingPage() {
  const { data: platform } = useQuery({
    queryKey: ["analytics", "platform"],
    queryFn: () => api.get("/analytics/platform").then((r) => r.data.data),
    staleTime: 30000,
    retry: false,
  });

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />

      <main className="pt-16">
        <section className="surface-grid border-b border-slate-200 bg-white">
          <div className="page-shell grid min-h-[calc(100vh-4rem)] items-center gap-12 py-16 lg:grid-cols-[1.05fr_.95fr]">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                <CheckCircle2 size={14} />
                Blockchain-backed election operations
              </div>
              <h1 className="max-w-3xl text-5xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-6xl">
                Secure voting with official review, private ballots, and public
                verification.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                CipherVote helps an Election Commission register voters,
                approve candidates, conduct elections, and publish verifiable
                results through a clean civic workflow.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/register" className="btn-yellow btn-lg">
                  Create account
                  <ArrowRight size={17} />
                </Link>
                <Link to="/elections" className="btn-ghost btn-lg">
                  View elections
                  <Vote size={17} />
                </Link>
              </div>
              <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
                <Stat
                  label="Verified voters"
                  value={platform?.voters?.VERIFIED || 0}
                />
                <Stat label="Votes cast" value={platform?.totalVotesCast || 0} />
                <Stat
                  label="Elections"
                  value={platform?.elections?.total || 0}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BrandMark size="md" />
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        Election control room
                      </p>
                      <p className="text-xs text-slate-500">
                        Active governance workspace
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                    Live
                  </span>
                </div>

                <div className="space-y-3">
                  {[
                    ["Voter roll verified", "4 selected voters", "Complete"],
                    ["Candidate list sealed", "2 candidates + NOTA", "Ready"],
                    ["Eligibility root anchored", "Contract checked", "Synced"],
                    ["Tally visibility", "Hidden until declaration", "Sealed"],
                  ].map(([title, meta, state]) => (
                    <div
                      key={title}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-950">
                          {title}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">{meta}</p>
                      </div>
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                        {state}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-start gap-3">
                    <Database className="mt-0.5 text-blue-700" size={18} />
                    <div>
                      <p className="text-sm font-semibold text-blue-900">
                        Database is workflow storage. Contract state is checked
                        before critical vote actions.
                      </p>
                      <p className="mt-1 text-xs leading-5 text-blue-700">
                        The app is moving toward a blockchain-first authority
                        model while keeping the UI fast and reviewable.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="page-shell py-16">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="page-kicker">Election workflow</p>
              <h2 className="page-title mt-2">From application to result</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-500">
              Every participant goes through the Election Commission path before
              reaching an official ballot.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-5">
            {steps.map((item, index) => (
              <StepCard key={item.title} item={item} index={index} />
            ))}
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white py-16">
          <div className="page-shell">
            <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
              <div>
                <p className="page-kicker">Security posture</p>
                <h2 className="page-title mt-2">Designed for controlled elections</h2>
                <p className="mt-4 text-sm leading-7 text-slate-500">
                  CipherVote combines familiar web application controls with
                  blockchain-backed receipts and election lifecycle checks. Full
                  production use still requires audits, final ZK proof
                  hardening, and operational governance.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {controls.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-5"
                  >
                    <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white text-blue-700 shadow-sm">
                      {item.icon}
                    </span>
                    <h3 className="font-semibold text-slate-950">
                      {item.label}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="page-shell py-16">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="page-kicker">Start</p>
                <h2 className="page-title mt-2">Register as voter or candidate</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
                  Create your account, connect your wallet, and continue into
                  the correct workspace. The Election Commission controls final
                  approval before participation becomes official.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link to="/register" className="btn-yellow">
                  Create account
                </Link>
                <Link to="/login" className="btn-ghost">
                  Log in
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
