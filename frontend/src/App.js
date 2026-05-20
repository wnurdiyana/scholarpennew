import "@/App.css";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Login, Register } from "@/pages/Auth";
import AuthCallback from "@/pages/AuthCallback";
import Dashboard from "@/pages/Dashboard";
import NewManuscript from "@/pages/NewManuscript";
import Editor from "@/pages/Editor";
import Settings from "@/pages/Settings";

// Root redirector — sends authenticated users to /dashboard, anonymous to /login.
const RootRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="inline-block w-2 h-2 bg-[#0033A0] animate-pulse mb-3" />
          <p className="text-xs font-mono uppercase tracking-widest text-zinc-500">Checking session…</p>
        </div>
      </div>
    );
  }
  return <Navigate to={user ? "/dashboard" : "/login"} replace />;
};

const AppRouter = () => {
  const location = useLocation();
  // CRITICAL: handle OAuth session_id during render to avoid race conditions
  const hash = location.hash || (typeof window !== "undefined" ? window.location.hash : "");
  if (hash && hash.includes("session_id=")) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/library" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/new" element={<ProtectedRoute><NewManuscript /></ProtectedRoute>} />
      <Route path="/manuscript/:id" element={<ProtectedRoute><Editor /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App = () => (
  <div className="App">
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  </div>
);

export default App;
