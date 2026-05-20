import { useState } from "react";
import api from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";

const Settings = () => {
  const { user, refresh } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [msg, setMsg] = useState("");

  // No update endpoint required — minimal settings page; just show profile.
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="min-h-screen" data-testid="settings-page">
        <header className="border-b border-zinc-200 bg-white">
          <div className="max-w-3xl mx-auto px-8 py-8">
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Account</div>
            <h1 className="mt-1 text-3xl tracking-tight font-semibold text-zinc-900">Settings</h1>
          </div>
        </header>
        <div className="max-w-3xl mx-auto px-8 py-10">
          <div className="border border-zinc-200 bg-white p-8">
            <h2 className="text-sm font-mono uppercase tracking-widest text-zinc-500">Profile</h2>
            <div className="mt-4 grid grid-cols-2 gap-6">
              <div>
                <div className="text-xs font-mono uppercase tracking-widest text-zinc-500">Name</div>
                <div className="mt-1 text-base text-zinc-900">{user?.name}</div>
              </div>
              <div>
                <div className="text-xs font-mono uppercase tracking-widest text-zinc-500">Email</div>
                <div className="mt-1 text-base text-zinc-900">{user?.email}</div>
              </div>
              <div>
                <div className="text-xs font-mono uppercase tracking-widest text-zinc-500">Sign-in method</div>
                <div className="mt-1 text-base text-zinc-900">{user?.auth_provider === "google" ? "Google" : "Email & password"}</div>
              </div>
              <div>
                <div className="text-xs font-mono uppercase tracking-widest text-zinc-500">User ID</div>
                <div className="mt-1 text-xs font-mono text-zinc-700">{user?.user_id}</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
