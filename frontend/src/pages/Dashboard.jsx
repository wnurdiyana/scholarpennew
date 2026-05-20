import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, FileText, Plus, Trash2 } from "lucide-react";
import api from "@/lib/api";
import Sidebar from "@/components/Sidebar";

const formatDate = (iso) => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  } catch { return "—"; }
};

const Dashboard = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/manuscripts");
      setItems(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const remove = async (mid) => {
    if (!window.confirm("Delete this manuscript? This cannot be undone.")) return;
    await api.delete(`/manuscripts/${mid}`);
    load();
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="min-h-screen" data-testid="dashboard-page">
        <header className="border-b border-zinc-200 bg-white">
          <div className="max-w-6xl mx-auto px-8 py-8 flex items-end justify-between">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Workspace</div>
              <h1 className="mt-1 text-3xl tracking-tight font-semibold text-zinc-900" data-testid="dashboard-title">
                Your manuscripts
              </h1>
              <p className="mt-2 text-sm text-zinc-600 max-w-2xl">
                Open a manuscript to continue drafting section by section, or start a new one from your research notes.
              </p>
            </div>
            <button onClick={() => navigate("/new")} className="btn-brand inline-flex items-center gap-2" data-testid="dashboard-new-btn">
              <Plus className="w-4 h-4" /> New manuscript
            </button>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-8 py-10">
          {loading ? (
            <div className="text-sm font-mono uppercase tracking-widest text-zinc-500" data-testid="dashboard-loading">Loading…</div>
          ) : items.length === 0 ? (
            <EmptyState onCreate={() => navigate("/new")} />
          ) : (
            <ul className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-zinc-200 border border-zinc-200" data-testid="manuscripts-list">
              {items.map((it) => (
                <li key={it.manuscript_id} className="bg-white p-6 flex flex-col gap-3 hover:bg-[#fcfcfc] transition-colors"
                    data-testid={`manuscript-card-${it.manuscript_id}`}>
                  <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                    <span>{formatDate(it.updated_at)}</span>
                    <span>{it.generated_sections}/{it.total_sections} sections</span>
                  </div>
                  <Link to={`/manuscript/${it.manuscript_id}`} className="block group" data-testid={`manuscript-open-${it.manuscript_id}`}>
                    <h3 className="text-lg font-medium text-zinc-900 leading-snug group-hover:text-[#0033A0] transition-colors">
                      {it.title || "Untitled manuscript"}
                    </h3>
                    <p className="mt-1 text-xs text-zinc-500 font-mono truncate">
                      {it.inputs?.field || "Field unspecified"} · {it.inputs?.journal_target || "No target journal"}
                    </p>
                  </Link>
                  <div className="mt-2 h-1 bg-zinc-100 relative overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-[#0033A0]"
                      style={{ width: `${Math.round((it.generated_sections / it.total_sections) * 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
                    <Link
                      to={`/manuscript/${it.manuscript_id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#0033A0] hover:text-[#002370]"
                      data-testid={`manuscript-continue-${it.manuscript_id}`}
                    >
                      Continue <ArrowRight className="w-3 h-3" />
                    </Link>
                    <button
                      onClick={() => remove(it.manuscript_id)}
                      className="text-xs text-zinc-400 hover:text-red-600 inline-flex items-center gap-1"
                      data-testid={`manuscript-delete-${it.manuscript_id}`}
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
};

const EmptyState = ({ onCreate }) => (
  <div className="border border-dashed border-zinc-300 bg-white p-16 text-center" data-testid="dashboard-empty">
    <FileText className="w-8 h-8 text-zinc-300 mx-auto" strokeWidth={1.5} />
    <h3 className="mt-4 text-lg font-medium text-zinc-900">No manuscripts yet</h3>
    <p className="mt-2 text-sm text-zinc-600 max-w-md mx-auto">
      Start a new manuscript by entering your research title, objectives, methodology and data — ManuscriptForge will
      handle the Q1-grade prose.
    </p>
    <button onClick={onCreate} className="mt-6 btn-brand inline-flex items-center gap-2" data-testid="empty-create-btn">
      <Plus className="w-4 h-4" /> Start your first manuscript
    </button>
  </div>
);

export default Dashboard;
