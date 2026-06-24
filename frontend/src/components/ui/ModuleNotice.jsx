import { ShieldCheck, Clock3, LockKeyhole, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const tones = {
  soon: {
    icon: <Clock3 size={28} />,
    box: "border-blue-200 bg-blue-50 text-blue-700",
    eyebrow: "Module scheduled",
  },
  restricted: {
    icon: <LockKeyhole size={28} />,
    box: "border-amber-200 bg-amber-50 text-amber-700",
    eyebrow: "Permission controlled",
  },
  governance: {
    icon: <ShieldCheck size={28} />,
    box: "border-green-200 bg-green-50 text-green-700",
    eyebrow: "Governance required",
  },
};

export default function ModuleNotice({
  tone = "soon",
  title,
  message,
  bullets = [],
  backTo = "/admin",
  backLabel = "Back to dashboard",
}) {
  const c = tones[tone] || tones.soon;
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mx-auto max-w-2xl text-center">
        <div
          className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-lg border ${c.box}`}
        >
          {c.icon}
        </div>
        <p className="section-label mb-2">{c.eyebrow}</p>
        <h1 className="text-3xl font-semibold text-slate-950">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">{message}</p>
        {bullets.length > 0 && (
          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-left">
            {bullets.map((b) => (
              <div key={b} className="flex gap-2 py-1.5 text-sm text-slate-600">
                <ShieldCheck size={14} className="mt-0.5 shrink-0 text-blue-700" />
                <span>{b}</span>
              </div>
            ))}
          </div>
        )}
        <Link to={backTo} className="btn-ghost mt-6 inline-flex">
          <ArrowLeft size={14} />
          {backLabel}
        </Link>
      </div>
    </section>
  );
}
