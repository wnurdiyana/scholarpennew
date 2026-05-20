import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, Database, FileText, Scale, Sparkles, Workflow } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const heroImage =
  "https://static.prod-images.emergentagent.com/jobs/68e5e7ec-0c3a-4f39-9e6f-4de5f69a381e/images/4e3e1a0213735aa06d1f3aa6a571141a4da09087d9bbc59de151719c59173b78.png";

const Landing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white" data-testid="landing-page">
      {/* Top nav */}
      <header className="border-b border-zinc-200">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" data-testid="landing-logo">
            <span className="inline-block w-2.5 h-2.5 bg-[#0033A0]" />
            <span className="font-semibold tracking-tight text-zinc-900">ManuscriptForge</span>
            <span className="text-xs text-zinc-500 font-mono ml-2 hidden sm:inline">Q1 academic writing</span>
          </Link>
          <nav className="flex items-center gap-2">
            {user ? (
              <button onClick={() => navigate("/dashboard")} className="btn-brand" data-testid="nav-dashboard-btn">
                Go to Dashboard
              </button>
            ) : (
              <>
                <Link to="/login" className="btn-ghost" data-testid="nav-login-btn">Sign in</Link>
                <Link to="/register" className="btn-brand" data-testid="nav-register-btn">Start writing</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="grain" />
        <div className="mx-auto max-w-6xl px-6 py-20 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 border border-zinc-200 bg-white px-3 py-1.5 text-xs font-mono text-zinc-600 mb-6">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              Powered by Claude Sonnet 4.5 — Q1 journal calibration
            </div>
            <h1 className="text-5xl md:text-6xl tracking-tight font-semibold text-zinc-900 leading-[1.05]" data-testid="hero-title">
              Draft Q1-grade manuscripts <span className="text-[#0033A0]">section by section.</span>
            </h1>
            <p className="mt-6 text-lg text-zinc-600 max-w-2xl leading-relaxed">
              ManuscriptForge converts your research notes — objectives, methodology, datasets, ML models, results — into
              a publication-ready manuscript structured to the standards of Elsevier, Springer Nature, Wiley and MDPI.
              Search Crossref for real citations. Export to DOCX, PDF, or Markdown.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <button
                onClick={() => navigate(user ? "/dashboard" : "/register")}
                className="btn-brand inline-flex items-center gap-2"
                data-testid="hero-cta-primary"
              >
                Start a manuscript <ArrowRight className="w-4 h-4" />
              </button>
              <Link to="/login" className="btn-ghost" data-testid="hero-cta-secondary">
                I already have an account
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-6 text-xs font-mono text-zinc-500 uppercase tracking-widest">
              <span>20 sections</span>
              <span>·</span>
              <span>Crossref DOI lookup</span>
              <span>·</span>
              <span>APA / IEEE / Harvard / Vancouver</span>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="border border-zinc-200 bg-zinc-50 p-3" data-testid="hero-image-frame">
              <img src={heroImage} alt="Structured academic research illustration" className="w-full h-auto" />
              <div className="mt-3 px-2 text-xs font-mono text-zinc-500 uppercase tracking-widest">
                Fig. 1 — Manuscript composition pipeline
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature row */}
      <section className="border-t border-zinc-200 bg-[#fafafa]">
        <div className="mx-auto max-w-6xl px-6 py-16 grid md:grid-cols-3 gap-10">
          {[
            { icon: Workflow, title: "Structured input wizard", desc: "Title, objectives, methodology, datasets, ML models, equations, target journal — all in one place." },
            { icon: Sparkles, title: "Section-by-section generation", desc: "Independent regeneration for Abstract, Methodology, Results, Discussion and 16 more sections." },
            { icon: BookOpen, title: "Crossref reference search", desc: "Insert real DOIs and Q1-indexed citations directly into the active section." },
            { icon: FileText, title: "Export anywhere", desc: "Download as DOCX (Word), PDF, or Markdown for direct submission or further editing." },
            { icon: Database, title: "Manuscript library", desc: "Save, revisit, and iterate across multiple ongoing projects from a single workspace." },
            { icon: Scale, title: "Scholarly tone, calibrated", desc: "Trained instructions enforce evidence-based prose, quantitative findings, and reviewer-grade rigor." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="border-l border-zinc-200 pl-5" data-testid={`feature-${title.toLowerCase().replace(/\s+/g, "-")}`}>
              <Icon className="w-5 h-5 text-[#0033A0]" strokeWidth={1.5} />
              <h3 className="mt-3 font-semibold text-zinc-900">{title}</h3>
              <p className="mt-2 text-sm text-zinc-600 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section catalog showcase */}
      <section className="border-t border-zinc-200">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-4">
              <div className="text-xs uppercase tracking-widest font-mono text-zinc-500">The 20-section spine</div>
              <h2 className="mt-3 text-3xl tracking-tight font-semibold text-zinc-900">
                Every section a reviewer expects, in order.
              </h2>
              <p className="mt-4 text-sm text-zinc-600 leading-relaxed">
                Each block is generated independently with the full manuscript context so coherence holds across
                Abstract → Conclusion. Regenerate any section without losing the rest.
              </p>
            </div>
            <ol className="md:col-span-8 grid grid-cols-2 gap-x-8 gap-y-2 font-mono text-sm text-zinc-700">
              {[
                "Title", "Abstract", "Keywords", "Introduction", "Literature Review", "Research Gap",
                "Novelty Statement", "Methodology", "Experimental Setup", "Mathematical Modeling",
                "ML Framework", "Results", "Discussion", "Comparison w/ Literature",
                "Practical Implications", "Limitations", "Conclusion", "Future Recommendations",
                "Nomenclature", "References",
              ].map((n, i) => (
                <li key={n} className="flex items-baseline gap-3 border-b border-zinc-100 py-2">
                  <span className="text-zinc-400 w-6">{String(i + 1).padStart(2, "0")}</span>
                  <span>{n}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-[#0033A0]" />
            <span className="font-semibold text-zinc-700">ManuscriptForge</span>
            <span>— a research productivity tool for scholarly authors.</span>
          </div>
          <div className="font-mono">Built for editor screening · 2026</div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
