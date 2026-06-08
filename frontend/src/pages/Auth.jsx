import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const GoogleButton = () => {
  const handleGoogle = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };
  return (
    <button
      type="button"
      onClick={handleGoogle}
      className="w-full btn-ghost flex items-center justify-center gap-3"
      data-testid="google-signin-btn"
    >
      <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z" />
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 7.1 29.3 5 24 5 16.3 5 9.7 9.4 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 43c5.2 0 9.9-2 13.4-5.2l-6.2-5.1C29.1 34.6 26.7 35.5 24 35.5c-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.5 38.6 16.2 43 24 43z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.7l6.2 5.1C40.7 35.7 44 30.3 44 24c0-1.2-.1-2.4-.4-3.5z" />
      </svg>
      Continue with Google
    </button>
  );
};

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (e2) {
      setErr(e2?.response?.data?.detail || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Sign in" subtitle="Resume your manuscripts.">
      <form onSubmit={submit} className="space-y-5" data-testid="login-form">
        <div>
          <label className="text-xs font-mono uppercase tracking-widest text-zinc-500">Email</label>
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="under-input" autoComplete="email" data-testid="login-email-input"
          />
        </div>
        <div>
          <label className="text-xs font-mono uppercase tracking-widest text-zinc-500">Password</label>
          <input
            type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="under-input" autoComplete="current-password" data-testid="login-password-input"
          />
        </div>
        {err && <div className="text-xs text-red-600 font-mono" data-testid="login-error">{err}</div>}
        <button className="btn-brand w-full" disabled={busy} data-testid="login-submit-btn">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <Divider />
      <GoogleButton />
      <p className="mt-8 text-sm text-zinc-600">
        No account?{" "}
        <Link to="/register" className="text-[#0033A0] underline underline-offset-4" data-testid="goto-register-link">
          Create one
        </Link>
      </p>
    </AuthShell>
  );
};

export const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await register(email, password, name);
      navigate("/dashboard");
    } catch (e2) {
      setErr(e2?.response?.data?.detail || "Registration failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Create account" subtitle="Registration is invite-only. Please use the email you purchased access with.">
      <form onSubmit={submit} className="space-y-5" data-testid="register-form">
        <div>
          <label className="text-xs font-mono uppercase tracking-widest text-zinc-500">Full name</label>
          <input
            required value={name} onChange={(e) => setName(e.target.value)}
            className="under-input" data-testid="register-name-input"
          />
        </div>
        <div>
          <label className="text-xs font-mono uppercase tracking-widest text-zinc-500">Email</label>
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="under-input" data-testid="register-email-input"
          />
        </div>
        <div>
          <label className="text-xs font-mono uppercase tracking-widest text-zinc-500">Password</label>
          <input
            type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
            className="under-input" data-testid="register-password-input"
          />
        </div>
        {err && <div className="text-xs text-red-600 font-mono" data-testid="register-error">{err}</div>}
        <button className="btn-brand w-full" disabled={busy} data-testid="register-submit-btn">
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
      <Divider />
      <GoogleButton />
      <p className="mt-8 text-sm text-zinc-600">
        Already have an account?{" "}
        <Link to="/login" className="text-[#0033A0] underline underline-offset-4" data-testid="goto-login-link">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
};

const Divider = () => (
  <div className="my-6 flex items-center gap-3">
    <div className="h-px bg-zinc-200 flex-1" />
    <span className="text-[10px] uppercase tracking-widest font-mono text-zinc-400">or</span>
    <div className="h-px bg-zinc-200 flex-1" />
  </div>
);

const AuthShell = ({ title, subtitle, children }) => (
  <div className="min-h-screen bg-white grid lg:grid-cols-2">
    <div className="hidden lg:flex flex-col justify-between bg-[#fafafa] border-r border-zinc-200 p-12">
      <Link to="/" className="flex items-center gap-2 text-zinc-900" data-testid="auth-logo-link">
        <span className="inline-block w-2.5 h-2.5 bg-[#0033A0]" />
        <span className="font-semibold tracking-tight">ManuscriptForge</span>
      </Link>
      <blockquote className="max-w-md">
        <p className="text-2xl tracking-tight font-medium text-zinc-900 leading-snug" style={{ fontFamily: "Spectral, serif" }}>
          “The discipline of writing for a Q1 journal is not in the prose — it is in the structural rigor that supports it.”
        </p>
        <footer className="mt-4 text-xs font-mono uppercase tracking-widest text-zinc-500">
          — Editorial calibration, ManuscriptForge
        </footer>
      </blockquote>
      <div className="text-xs font-mono text-zinc-400">© 2026 ManuscriptForge · Built for scholarly authors</div>
    </div>
    <div className="flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl tracking-tight font-semibold text-zinc-900">{title}</h1>
        <p className="mt-2 text-sm text-zinc-600">{subtitle}</p>
        <div className="mt-10">{children}</div>
      </div>
    </div>
  </div>
);

export default Login;
