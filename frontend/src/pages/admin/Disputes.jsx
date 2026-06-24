import { useAuth } from "../../context/AuthContext";
import Sidebar from "../../components/layout/Sidebar";
import PageWrapper from "../../components/layout/PageWrapper";
import ModuleNotice from "../../components/ui/ModuleNotice";

function DisputeNotice({ admin = false }) {
  return (
    <ModuleNotice
      tone={admin ? "governance" : "soon"}
      title={admin ? "Dispute Review Requires Governance Approval" : "Public Dispute Filing Coming Soon"}
      message={
        admin
          ? "The dispute center is reserved for formal election challenges. In production, each dispute should enter a public challenge period, require evidence, and be resolved by an authorized Election Commission workflow."
          : "Public dispute filing is planned for the next release. For now, voters can view certified results, but formal objections must be handled by the Election Commission process."
      }
      bullets={[
        "Evidence submission, review status, and decision publication are not fully released yet.",
        "Certification-sensitive disputes should block result declaration until resolved.",
        "Every dispute action must be audit logged and visible to authorized reviewers.",
      ]}
      backTo={admin ? "/admin" : "/elections"}
      backLabel={admin ? "Back to admin dashboard" : "Back to elections"}
    />
  );
}

export default function Page() {
  const { isAdmin } = useAuth();
  const admin = isAdmin?.();

  if (!admin)
    return (
      <PageWrapper>
        <DisputeNotice />
      </PageWrapper>
    );

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <div className="flex-1 min-w-0 p-6 lg:pl-80">
        <DisputeNotice admin />
      </div>
    </div>
  );
}
