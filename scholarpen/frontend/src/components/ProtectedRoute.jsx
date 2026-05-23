import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white" data-testid="protected-loading">
        <div className="text-center">
          <div className="inline-block w-2 h-2 bg-[#0033A0] animate-pulse mb-3" />
          <p className="text-xs font-mono uppercase tracking-widest text-zinc-500">Loading workspace…</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

export default ProtectedRoute;
