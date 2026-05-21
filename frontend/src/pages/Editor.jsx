import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft, BookOpen, Check, ChevronDown, Copy, Download, Loader2, LogOut, Pencil,
  RefreshCw, Search, Sparkles, X,
} from "lucide-react";
import api, { API } from "@/lib/api";
import { copyToClipboard } from "@/lib/clipboard";
import { useAuth } from "@/context/AuthContext";
import SectionChat from "@/components/SectionChat";

const STATUS_META = {
  empty: { label: "Empty", color: "text-zinc-400" },
  generating: { label: "Generating…", color: "text-amber-600" },
  complete: { label: "Drafted", color: "text-emerald-700" },
  error: { label: "Failed", color: "text-red-600" },
};

const Editor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState([]);
  const [activeKey, setActiveKey] = useState(null);
  const [busy, setBusy] = useState({}); // {section_key: bool}
  const [justCompleted, setJustCompleted] = useState(null);
  const [editKey, setEditKey] = useState(null);
  const [editText, setEditText] = useState("");
  const [exporting, setExporting] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const editorRef = useRef(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [{ data: m }, { data: c }] = await Promise.all([
          api.get(`/manuscripts/${id}`),
          api.get(`/sections/catalog`),
        ]);
        setDoc(m);
        setCatalog(c);
        setActiveKey(c[0]?.key);
      } catch (e) {
        if (e?.response?.status === 404) navigate("/dashboard");
      } finally { setLoading(false); }
    })();
  }, [id, navigate]);

  const sectionsByKey = useMemo(() => doc?.sections || {}, [doc]);

  const generate = async (key) => {
    setBusy((b) => ({ ...b, [key]: true }));
    // Optimistic UI
    setDoc((d) => d && ({
      ...d,
      sections: { ...d.sections, [key]: { ...d.sections[key], status: "generating" } }
    }));
    try {
      const { data } = await api.post(`/manuscripts/${id}/sections/${key}/generate`, { extra_instructions: "" });
      setDoc((d) => d && ({
        ...d,
        title: data.manuscript_title || d.title,
        sections: { ...d.sections, [key]: data.section },
      }));
      setJustCompleted(key);
      setTimeout(() => setJustCompleted(null), 1500);
    } catch (e) {
      setDoc((d) => d && ({
        ...d,
        sections: { ...d.sections, [key]: { ...d.sections[key], status: "error" } }
      }));
      alert(e?.response?.data?.detail || "Generation failed");
    } finally {
      setBusy((b) => ({ ...b, [key]: false }));
    }
  };

  const generateAll = async () => {
    for (const s of catalog) {
      // eslint-disable-next-line no-await-in-loop
      if ((sectionsByKey[s.key]?.status || "empty") !== "complete") await generate(s.key);
    }
  };

  const saveEdit = async () => {
    if (!editKey) return;
    try {
      const { data } = await api.patch(`/manuscripts/${id}`, {
        section_overrides: { [editKey]: editText },
      });
      setDoc(data);
      setEditKey(null);
      setEditText("");
    } catch (e) {
      alert(e?.response?.data?.detail || "Save failed");
    }
  };

  const exportAs = async (fmt) => {
    setExporting(true);
    setShowExport(false);
    try {
      const token = localStorage.getItem("mf_token");
      const res = await fetch(`${API}/manuscripts/${id}/export?format=${fmt}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = fmt === "md" ? "md" : fmt;
      a.download = `${(doc?.title || "manuscript").replace(/[^A-Za-z0-9_-]+/g, "_")}.${ext}`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.message || "Export failed");
    } finally { setExporting(false); }
  };

  const generatedCount = useMemo(
    () => Object.values(sectionsByKey).filter((s) => s.status === "complete").length,
    [sectionsByKey]
  );

  if (loading || !doc) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white" data-testid="editor-loading">
        <div className="text-xs font-mono uppercase tracking-widest text-zinc-500">Loading manuscript…</div>
      </div>
    );
  }

  return (
    <div className="editor-shell">
      {/* Left TOC */}
      <aside className="left-nav border-r border-zinc-200 bg-[#fafafa] flex flex-col h-screen sticky top-0" data-testid="editor-toc">
        <div className="px-5 py-5 border-b border-zinc-200">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="text-xs text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1"
            data-testid="back-to-dashboard"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </button>
          <h2 className="mt-3 text-sm font-semibold tracking-tight text-zinc-900 line-clamp-2" data-testid="manuscript-title">
            {doc.title || "Untitled manuscript"}
          </h2>
          <div className="mt-2 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
            {generatedCount} / {catalog.length} sections
          </div>
          <div className="mt-2 h-1 bg-zinc-100">
            <div className="h-1 bg-[#0033A0]" style={{ width: `${Math.round((generatedCount / catalog.length) * 100)}%` }} />
          </div>
        </div>

        <div className="px-3 py-3 border-b border-zinc-200">
          <button onClick={generateAll} className="btn-brand w-full inline-flex items-center justify-center gap-2" data-testid="generate-all-btn">
            <Sparkles className="w-4 h-4" /> Generate full draft
          </button>
        </div>

        <nav className="overflow-y-auto flex-1 py-2" data-testid="editor-toc-list">
          {catalog.map((c, i) => {
            const s = sectionsByKey[c.key] || { status: "empty" };
            const meta = STATUS_META[s.status] || STATUS_META.empty;
            const active = activeKey === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => {
                  setActiveKey(c.key);
                  const el = document.getElementById(`section-${c.key}`);
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="toc-link w-full text-left flex items-start gap-3 px-4 py-2 text-sm"
                data-active={active ? "true" : "false"}
                data-testid={`toc-${c.key}`}
              >
                <span className="text-[10px] font-mono text-zinc-400 w-5 mt-0.5">{String(i + 1).padStart(2, "0")}</span>
                <span className="flex-1 min-w-0">
                  <span className="block truncate">{c.label}</span>
                  <span className={`block text-[10px] font-mono uppercase tracking-widest ${meta.color}`}>{meta.label}</span>
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Center editor */}
      <main className="min-h-screen overflow-x-hidden" ref={editorRef} data-testid="editor-canvas">
        {/* Top toolbar */}
        <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white">
          <div className="max-w-3xl mx-auto px-8 py-4 flex items-center justify-between gap-4">
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 truncate">
              {doc.inputs?.field || "Field unspecified"} · {doc.inputs?.journal_target || "No target journal"} · {doc.inputs?.citation_style || "APA"}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setShowExport((v) => !v)}
                  className="btn-ghost inline-flex items-center gap-2"
                  disabled={exporting}
                  data-testid="export-menu-btn"
                >
                  <Download className="w-3.5 h-3.5" /> Export <ChevronDown className="w-3 h-3" />
                </button>
                {showExport && (
                  <div className="absolute right-0 mt-1 bg-white border border-zinc-200 shadow-sm w-44 z-20" data-testid="export-menu">
                    {["md", "docx", "pdf"].map((f) => (
                      <button
                        key={f}
                        onClick={() => exportAs(f)}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-zinc-50 border-b last:border-b-0 border-zinc-100"
                        data-testid={`export-${f}-btn`}
                      >
                        {f === "md" ? "Markdown (.md)" : f === "docx" ? "Word (.docx)" : "PDF (.pdf)"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={async () => { await logout(); navigate("/"); }}
                className="btn-ghost inline-flex items-center gap-1.5"
                title={`Sign out (${user?.email || ""})`}
                data-testid="editor-logout-btn"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Sign out</span>
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-8 py-12">
          {catalog.map((c, i) => {
            const s = sectionsByKey[c.key] || { status: "empty", content: "" };
            const meta = STATUS_META[s.status] || STATUS_META.empty;
            const isBusy = !!busy[c.key] || s.status === "generating";
            const isEditing = editKey === c.key;
            const flashing = justCompleted === c.key;
            return (
              <section
                key={c.key}
                id={`section-${c.key}`}
                className={`section-block relative border-l ${isBusy ? "is-generating border-l-transparent" : "border-zinc-100"} ${flashing ? "just-completed" : ""} pl-8 pr-2 py-8 mb-2`}
                data-testid={`section-${c.key}`}
              >
                <header className="flex items-center justify-between flex-wrap gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-zinc-400">{String(i + 1).padStart(2, "0")}</span>
                    <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-500">{c.label}</h2>
                    <span className={`text-[10px] font-mono uppercase tracking-widest ${meta.color}`}>· {meta.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => generate(c.key)}
                      disabled={isBusy}
                      className="btn-ghost inline-flex items-center gap-1.5 disabled:opacity-60"
                      data-testid={`section-generate-${c.key}`}
                    >
                      {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : s.content ? <RefreshCw className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                      <span className="text-xs">{s.content ? (isBusy ? "Regenerating…" : "Regenerate") : (isBusy ? "Generating…" : "Generate")}</span>
                    </button>
                    {s.content && !isEditing && (
                      <>
                        <button
                          onClick={() => { copyToClipboard(s.content); }}
                          className="btn-ghost inline-flex items-center gap-1.5"
                          data-testid={`section-copy-${c.key}`}
                          title="Copy section"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { setEditKey(c.key); setEditText(s.content); }}
                          className="btn-ghost inline-flex items-center gap-1.5"
                          data-testid={`section-edit-${c.key}`}
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </header>

                {isEditing ? (
                  <div data-testid={`section-edit-panel-${c.key}`}>
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={Math.min(40, Math.max(8, editText.split("\n").length))}
                      className="w-full border border-zinc-200 bg-white p-4 text-sm font-mono text-zinc-900 leading-relaxed focus:outline-none focus:border-[#0033A0]"
                      data-testid={`section-edit-textarea-${c.key}`}
                    />
                    <div className="mt-3 flex items-center gap-2">
                      <button onClick={saveEdit} className="btn-brand inline-flex items-center gap-1.5" data-testid={`section-save-${c.key}`}>
                        <Check className="w-3.5 h-3.5" /> Save
                      </button>
                      <button onClick={() => { setEditKey(null); setEditText(""); }} className="btn-ghost" data-testid={`section-cancel-${c.key}`}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : s.content ? (
                  <div className="editor-prose" data-testid={`section-content-${c.key}`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{s.content}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="text-sm text-zinc-500 italic" data-testid={`section-empty-${c.key}`}>
                    Section not generated yet. Click <strong>Generate</strong> to draft this section using Claude Opus 4.5.
                  </div>
                )}

                {!isEditing && (
                  <SectionChat
                    manuscriptId={id}
                    sectionKey={c.key}
                    sectionLabel={c.label}
                    chat={s.chat || []}
                    onSectionUpdated={(updatedSection) => {
                      setDoc((d) => d && ({
                        ...d,
                        sections: { ...d.sections, [c.key]: updatedSection },
                      }));
                      setJustCompleted(c.key);
                      setTimeout(() => setJustCompleted(null), 1500);
                    }}
                  />
                )}
              </section>
            );
          })}

          <div className="py-12 border-t border-zinc-200 text-center" data-testid="editor-footer">
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">End of manuscript</div>
          </div>
        </div>
      </main>

      {/* Right reference panel */}
      <ReferencePanel manuscriptId={id} />
    </div>
  );
};

const formatAPA = (r) => {
  const authors = (r.authors || []).map((a) => a).join(", ");
  const year = r.year || "n.d.";
  const title = r.title || "";
  const journal = r.container || "";
  const vol = r.volume ? `, ${r.volume}` : "";
  const issue = r.issue ? `(${r.issue})` : "";
  const page = r.page ? `, ${r.page}` : "";
  const doi = r.doi ? ` https://doi.org/${r.doi}` : "";
  return `${authors} (${year}). ${title}. ${journal}${vol}${issue}${page}.${doi}`.trim();
};

const ReferencePanel = ({ manuscriptId }) => {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(null);

  const search = async (e) => {
    e?.preventDefault?.();
    if (q.trim().length < 2) return;
    setErr(""); setSearching(true);
    try {
      const { data } = await api.get(`/references/search`, { params: { q: q.trim(), rows: 12 } });
      setResults(data.results || []);
    } catch (e2) {
      setErr(e2?.response?.data?.detail || "Search failed");
    } finally { setSearching(false); }
  };

  const copyRef = async (r) => {
    const text = formatAPA(r);
    const ok = await copyToClipboard(text);
    setCopied(ok ? (r.doi || r.title) : `__fail__${r.doi || r.title}`);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <aside className="ref-panel border-l border-zinc-200 bg-[#fcfcfc] h-screen sticky top-0 flex flex-col" data-testid="reference-panel">
      <div className="px-5 py-5 border-b border-zinc-200">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#0033A0]" strokeWidth={1.5} />
          <h3 className="text-sm font-semibold text-zinc-900">References</h3>
        </div>
        <p className="mt-1 text-[11px] text-zinc-500 leading-relaxed">
          Search Crossref for verifiable DOIs. Copy formatted citations into your draft.
        </p>
      </div>

      <form onSubmit={search} className="px-5 py-4 border-b border-zinc-200">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400" strokeWidth={1.5} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. CNN-LSTM ship fuel"
            className="w-full pl-7 pr-2 py-2 text-sm border border-zinc-200 bg-white focus:outline-none focus:border-[#0033A0] rounded-sm"
            data-testid="reference-search-input"
          />
        </div>
        <button type="submit" disabled={searching} className="mt-2 btn-brand w-full" data-testid="reference-search-btn">
          {searching ? "Searching…" : "Search Crossref"}
        </button>
        {err && <div className="mt-2 text-[11px] text-red-600 font-mono">{err}</div>}
      </form>

      <div className="flex-1 overflow-y-auto" data-testid="reference-results">
        {results.length === 0 ? (
          <div className="px-5 py-8 text-[11px] text-zinc-500">No results yet. Try a topical query like "battery thermal runaway 2024".</div>
        ) : (
          <ul>
            {results.map((r, idx) => (
              <li key={`${r.doi || "no-doi"}-${idx}`} className="px-5 py-4 border-b border-zinc-100 hover:bg-white transition-colors" data-testid="reference-item">
                <a
                  href={r.url || (r.doi ? `https://doi.org/${r.doi}` : "#")}
                  target="_blank" rel="noopener noreferrer"
                  className="text-sm font-medium text-zinc-900 hover:text-[#0033A0] line-clamp-3"
                >
                  {r.title || "(untitled)"}
                </a>
                <div className="mt-1 text-[11px] font-mono text-zinc-500 line-clamp-1">
                  {(r.authors || []).slice(0, 3).join(", ")}{r.authors?.length > 3 ? " et al." : ""} · {r.year || "n.d."}
                </div>
                <div className="mt-1 text-[11px] text-zinc-500 italic line-clamp-1">{r.container || r.publisher}</div>
                {r.doi && <div className="mt-1 text-[10px] font-mono text-zinc-400">DOI: {r.doi}</div>}
                <button
                  onClick={() => copyRef(r)}
                  className="mt-2 inline-flex items-center gap-1 text-[11px] text-[#0033A0] hover:text-[#002370]"
                  data-testid="reference-copy-btn"
                >
                  {copied === (r.doi || r.title) ? (
                    <><Check className="w-3 h-3" /> Copied APA</>
                  ) : copied === `__fail__${r.doi || r.title}` ? (
                    <><X className="w-3 h-3" /> Copy blocked</>
                  ) : (
                    <><Copy className="w-3 h-3" /> Copy as APA</>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="px-5 py-3 border-t border-zinc-200 text-[10px] font-mono uppercase tracking-widest text-zinc-400">
        Crossref · DOI verified
      </div>
    </aside>
  );
};

export default Editor;
