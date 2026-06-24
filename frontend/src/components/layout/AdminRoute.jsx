import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ShieldOff } from "lucide-react";
export default function AdminRoute() {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading)
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 border border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin())
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center text-center">
        <div>
          <ShieldOff size={48} className="text-slate-400 mx-auto mb-4" />
          <h2 className="font-semibold text-3xl text-slate-600 mb-2">
            ACCESS DENIED
          </h2>
          <p className="text-sm text-slate-500">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  return <Outlet />;
}
