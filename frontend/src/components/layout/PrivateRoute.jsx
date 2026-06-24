import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
export default function PrivateRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  if (loading)
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 border border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  if (!isAuthenticated)
    return <Navigate to="/login" state={{ from: location }} replace />;
  return <Outlet />;
}
