import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const AuthCallback = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { completeGoogleSession } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const hash = location.hash || window.location.hash || "";
    const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
    const sessionId = params.get("session_id");

    if (!sessionId) {
      navigate("/login", { replace: true });
      return;
    }

    (async () => {
      try {
        const user = await completeGoogleSession(sessionId);
        // Clean URL fragment
        window.history.replaceState(null, "", "/dashboard");
        navigate("/dashboard", { replace: true, state: { user } });
      } catch (e) {
        navigate("/login?error=oauth", { replace: true });
      }
    })();
  }, [location, navigate, completeGoogleSession]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white" data-testid="auth-callback">
      <div className="text-center">
        <div className="inline-block w-2 h-2 bg-[#0033A0] animate-pulse mb-3" />
        <p className="text-sm font-mono uppercase tracking-widest text-zinc-500">Completing sign-in…</p>
      </div>
    </div>
  );
};

export default AuthCallback;
