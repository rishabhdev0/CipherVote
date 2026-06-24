import Sidebar from "../../components/layout/Sidebar";
import ModuleNotice from "../../components/ui/ModuleNotice";

export default function AnalyticsPage() {
  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <div className="flex-1 min-w-0 p-6 lg:pl-80">
        <ModuleNotice
          tone="governance"
          title="Analytics Console Coming Soon"
          message="Advanced election analytics are intentionally restricted. A production election system should not expose live candidate trends, voter behavior patterns, or sensitive turnout slices before certification."
          bullets={[
            "Governance permission required for advanced reports.",
            "Live candidate counts remain sealed until close or result certification.",
            "Future reports should publish only privacy-safe aggregate statistics.",
          ]}
        />
      </div>
    </div>
  );
}
