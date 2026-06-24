import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, Clock, Plus, ShieldCheck, Play } from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import Button from "../../components/ui/Button";
import Input, { Select, Textarea } from "../../components/ui/Input";
import { governanceService } from "../../services/governance.service";
import toast from "react-hot-toast";
const actionTypes = [
  "CREATE_ELECTION",
  "REBUILD_ELIGIBILITY",
  "ACTIVATE_ELECTION",
  "PAUSE_ELECTION",
  "RESUME_ELECTION",
  "CLOSE_ELECTION",
  "DECLARE_RESULTS",
];
export default function GovernancePage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    actionType: "ACTIVATE_ELECTION",
    resource: "ELECTION",
    resourceId: "",
    requiredApprovals: 2,
    payload: "{}",
  });
  const { data, isLoading } = useQuery({
    queryKey: ["governance-actions"],
    queryFn: () => governanceService.list(100).then((r) => r.data.data.actions),
    refetchInterval: 15000,
  });
  const refresh = () =>
    qc.invalidateQueries({ queryKey: ["governance-actions"] });
  const propose = useMutation({
    mutationFn: () =>
      governanceService.propose({
        ...form,
        requiredApprovals: Number(form.requiredApprovals || 2),
        payload: JSON.parse(form.payload || "{}"),
      }),
    onSuccess: () => {
      toast.success("Governance action proposed");
      refresh();
    },
    onError: (e) =>
      toast.error(e.response?.data?.message || e.message || "Failed"),
  });
  const approve = useMutation({
    mutationFn: (id) => governanceService.approve(id),
    onSuccess: () => {
      toast.success("Approved");
      refresh();
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  });
  const execute = useMutation({
    mutationFn: (id) => governanceService.execute(id),
    onSuccess: () => {
      toast.success("Executed");
      refresh();
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  });
  const actions = data || [];
  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <main className="flex-1 min-w-0 p-6 lg:pl-80">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-semibold text-4xl text-slate-950">
              GOVERNANCE
            </h1>
            <p className="text-sm text-slate-500">
              Multi-approval, timelock, and lifecycle execution controls
            </p>
          </div>
          <ShieldCheck className="text-blue-700" size={28} />
        </div>
        <section className="bg-white border border-slate-200 p-5 mb-6">
          <h2 className="section-label mb-4">Propose Action</h2>
          <div className="grid md:grid-cols-4 gap-3 mb-3">
            <Select
              label="Action"
              value={form.actionType}
              onChange={(e) => setForm({ ...form, actionType: e.target.value })}
              options={actionTypes.map((v) => ({
                value: v,
                label: v.replaceAll("_", " "),
              }))}
            />
            <Input
              label="Resource"
              value={form.resource}
              onChange={(e) => setForm({ ...form, resource: e.target.value })}
            />
            <Input
              label="Resource ID"
              value={form.resourceId}
              onChange={(e) => setForm({ ...form, resourceId: e.target.value })}
              placeholder="Election ID or NEW"
            />
            <Input
              label="Required Approvals"
              type="number"
              min="2"
              value={form.requiredApprovals}
              onChange={(e) =>
                setForm({ ...form, requiredApprovals: e.target.value })
              }
            />
          </div>
          <Textarea
            label="Payload JSON"
            rows={3}
            value={form.payload}
            onChange={(e) => setForm({ ...form, payload: e.target.value })}
          />
          <Button
            className="mt-4"
            icon={<Plus size={14} />}
            loading={propose.isPending}
            onClick={() => propose.mutate()}
          >
            Propose
          </Button>
        </section>
        <section className="bg-white border border-slate-200">
          <div className="px-5 py-3 border-b border-slate-200">
            <h2 className="section-label">Actions</h2>
          </div>
          {isLoading ? (
            <div className="p-6 text-sm text-slate-500">
              Loading governance actions...
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {actions.map((a) => (
                <div
                  key={a.id}
                  className="p-5 flex flex-col lg:flex-row lg:items-center gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-slate-950">
                        {a.actionType}
                      </span>
                      <span className="text-[10px] border border-blue-600/30 text-blue-700 px-2 py-0.5">
                        {a.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {a.resource}:{a.resourceId || "-"} · approvals{" "}
                      {(a.approvals || []).length}/{a.requiredApprovals}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                      <Clock size={10} />
                      Not before{" "}
                      {a.notBefore
                        ? new Date(a.notBefore).toLocaleString()
                        : "now"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline-green"
                      icon={<CheckCircle2 size={12} />}
                      loading={approve.isPending}
                      disabled={a.status !== "PENDING"}
                      onClick={() => approve.mutate(a.id)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-yellow"
                      icon={<Play size={12} />}
                      loading={execute.isPending}
                      disabled={a.status !== "APPROVED"}
                      onClick={() => execute.mutate(a.id)}
                    >
                      Mark Executed
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
