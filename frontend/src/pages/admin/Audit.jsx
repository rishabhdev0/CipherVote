import { useEffect, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import api from "../../services/api";
import { formatDate } from "../../utils/formatters";

export default function Page() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api
      .get("/admin/audit?limit=50")
      .then((r) => setLogs(r.data.data.logs || []))
      .finally(() => setLoading(false));
  }, []);
  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <div className="flex-1 min-w-0 p-6 lg:pl-80">
        <div className="mb-8">
          <h1 className="font-semibold text-4xl text-slate-950">
            AUDIT <span className="text-green">TRAIL</span>
          </h1>
        </div>
        <div className="bg-white border border-slate-200 overflow-hidden">
          {loading ? (
            <p className="p-6 text-slate-500">Loading audit trail...</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left p-3">Time</th>
                  <th className="text-left p-3">Action</th>
                  <th className="text-left p-3">Resource</th>
                  <th className="text-left p-3">Hash</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-t border-slate-200">
                    <td className="p-3 text-slate-500">
                      {formatDate(l.createdAt)}
                    </td>
                    <td className="p-3 text-slate-950 font-bold">{l.action}</td>
                    <td className="p-3 text-slate-600">{l.resource || "-"}</td>
                    <td className="p-3 font-mono text-xs text-green">
                      {l.entryHash?.slice(0, 16) || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
