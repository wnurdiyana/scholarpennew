import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

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
        <Field label="Email">
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="under-input" autoComplete="email" data-testid="login-email-input"
          />
        </Field>
        <Field label="Password">
          <input
            type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="under-input" autoComplete="current-password" data-testid="login-password-input"
          />
        </Field>
        {err && <div className="text-xs text-red-600 font-mono" data-testid="login-error">{err}</div>}
        <button className="btn-brand w-full" disabled={busy} data-testid="login-submit-btn">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
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
    <AuthShell title="Create account" subtitle="Start drafting Q1-grade manuscripts in minutes.">
      <form onSubmit={submit} className="space-y-5" data-testid="register-form">
        <Field label="Full name">
          <input
            required value={name} onChange={(e) => setName(e.target.value)}
            className="under-input" data-testid="register-name-input"
          />
        </Field>
        <Field label="Email">
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="under-input" data-testid="register-email-input"
          />
        </Field>
        <Field label="Password">
          <input
            type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
            className="under-input" data-testid="register-password-input"
          />
        </Field>
        {err && <div className="text-xs text-red-600 font-mono" data-testid="register-error">{err}</div>}
        <button className="btn-brand w-full" disabled={busy} data-testid="register-submit-btn">
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
      <p className="mt-8 text-sm text-zinc-600">
        Already have an account?{" "}
        <Link to="/login" className="text-[#0033A0] underline underline-offset-4" data-testid="goto-login-link">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
};

const Field = ({ label, children }) => (
  <div>
    <label className="text-xs font-mono uppercase tracking-widest text-zinc-500 block mb-1">{label}</label>
    {children}
  </div>
);

const AuthShell = ({ title, subtitle, children }) => (
  <div className="min-h-screen bg-white grid lg:grid-cols-2">
    <div className="hidden lg:flex flex-col justify-between bg-[#fafafa] border-r border-zinc-200 p-12">
      <Link to="/" className="flex items-center gap-2 text-zinc-900" data-testid="auth-logo-link">
        <span className="inline-block w-2.5 h-2.5 bg-[#0033A0]" />
        <span className="font-semibold tracking-tight">ScholarPen</span>
      </Link>
      <blockquote className="max-w-md">
        <p className="text-2xl tracking-tight font-medium text-zinc-900 leading-snug" style={{ fontFamily: "Spectral, serif" }}>
          “The discipline of writing for a Q1 journal is not in the prose — it is in the structural rigor that supports it.”
        </p>
        <footer className="mt-4 text-xs font-mono uppercase tracking-widest text-zinc-500">
          — Editorial calibration, ScholarPen
        </footer>
      </blockquote>
      <div className="text-xs font-mono text-zinc-400">© ScholarPen · Built for scholarly authors</div>
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
