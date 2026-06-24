import Sidebar from "../../components/layout/Sidebar";
import ModuleNotice from "../../components/ui/ModuleNotice";

export default function Page() {
  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <div className="flex-1 min-w-0 p-6 lg:pl-80">
        <ModuleNotice
          tone="restricted"
          title="Fraud Review Module Coming Soon"
          message="This workspace is reserved for Election Commission fraud analysts. The current prototype records fraud signals, but the review queue, adjudication workflow, and emergency escalation console are not fully released yet."
          bullets={[
            "Requires FRAUD_ANALYST or SUPER_ADMIN permission.",
            "Future workflow: risk scoring, evidence review, final decision, and audit log publication.",
            "Emergency pause actions must go through governance before production use.",
          ]}
        />
      </div>
    </div>
  );
}
