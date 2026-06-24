import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="text-center">
        <p className="font-mono text-blue-700 text-sm tracking-normal mb-3">
          ERROR 404
        </p>
        <h1 className="font-semibold text-8xl text-slate-950 mb-3">
          NOT FOUND
        </h1>
        <p className="text-slate-500 text-sm max-w-xs mx-auto mb-8">
          The page you're looking for doesn't exist.
        </p>
        <Link to="/" className="btn-yellow inline-flex items-center gap-2">
          <ArrowLeft size={14} />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
