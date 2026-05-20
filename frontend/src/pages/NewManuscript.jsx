import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import api from "@/lib/api";
import Sidebar from "@/components/Sidebar";

const STEPS = [
  {
    id: "core",
    title: "Project basics",
    desc: "Working title, research field, and target journal.",
    fields: [
      { key: "title", label: "Working title", placeholder: "e.g. Hybrid CNN-LSTM forecasting of maritime fuel consumption", textarea: false },
      { key: "field", label: "Research field", placeholder: "e.g. Maritime energy systems / Sustainable shipping", textarea: false },
      { key: "journal_target", label: "Target journal", placeholder: "e.g. Ocean Engineering (Elsevier, Q1)", textarea: false },
      { key: "citation_style", label: "Citation style", placeholder: "APA / IEEE / Harvard / Vancouver", textarea: false },
    ],
  },
  {
    id: "framing",
    title: "Framing the study",
    desc: "Idea, objectives, and hypothesis — the scholarly spine.",
    fields: [
      { key: "abstract_idea", label: "Abstract idea (1–2 paragraphs)", placeholder: "Describe the core idea in plain academic terms…", textarea: true },
      { key: "objectives", label: "Objectives", placeholder: "List the primary and secondary objectives of the study.", textarea: true },
      { key: "hypothesis", label: "Hypothesis (optional)", placeholder: "State your central hypothesis if applicable.", textarea: true },
      { key: "keywords", label: "Candidate keywords", placeholder: "Comma-separated; ManuscriptForge will refine for WoS indexing.", textarea: false },
    ],
  },
  {
    id: "methods",
    title: "Methodology & setup",
    desc: "Apparatus, procedure, datasets, models.",
    fields: [
      { key: "methodology", label: "Methodology", placeholder: "Outline the procedure, instruments, software, and statistical methods.", textarea: true },
      { key: "experimental_setup", label: "Experimental setup", placeholder: "Describe the apparatus, conditions, sampling and standards.", textarea: true },
      { key: "ml_models", label: "ML / AI models (optional)", placeholder: "Architectures, hyperparameters, training/test split.", textarea: true },
      { key: "equations", label: "Key equations (optional)", placeholder: "Paste in LaTeX-style or descriptive form.", textarea: true },
    ],
  },
  {
    id: "data",
    title: "Data & findings",
    desc: "Quantitative substance for a defensible draft.",
    fields: [
      { key: "data_summary", label: "Data summary", placeholder: "Sources, volume, variables, processing.", textarea: true },
      { key: "statistical_results", label: "Statistical results", placeholder: "Means, errors, R², p-values, confidence intervals…", textarea: true },
      { key: "figures_tables", label: "Figures & tables", placeholder: "Describe each figure/table the manuscript should reference.", textarea: true },
      { key: "findings", label: "Key findings", placeholder: "The 3–6 main quantitative findings of the study.", textarea: true },
    ],
  },
  {
    id: "discussion",
    title: "Discussion & limits",
    desc: "Reviewer-grade closure points.",
    fields: [
      { key: "discussion_points", label: "Discussion points", placeholder: "Mechanisms to explain, comparisons to draw, implications to argue.", textarea: true },
      { key: "limitations", label: "Limitations", placeholder: "Be candid — data scope, model assumptions, generalizability.", textarea: true },
      { key: "future_work", label: "Future work", placeholder: "Specific, feasible directions tied to limitations.", textarea: true },
      { key: "literature_sources", label: "Literature sources (optional)", placeholder: "Paste any DOIs, titles, or authors you want cited prominently.", textarea: true },
    ],
  },
];

const NewManuscript = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [inputs, setInputs] = useState({ citation_style: "APA" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const update = (k, v) => setInputs((p) => ({ ...p, [k]: v }));

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const submit = async () => {
    setErr("");
    setBusy(true);
    try {
      const { data } = await api.post("/manuscripts", { inputs });
      navigate(`/manuscript/${data.manuscript_id}`);
    } catch (e) {
      setErr(e?.response?.data?.detail || "Could not create manuscript");
    } finally { setBusy(false); }
  };

  const cur = STEPS[step];

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="min-h-screen" data-testid="new-manuscript-page">
        <header className="border-b border-zinc-200 bg-white">
          <div className="max-w-5xl mx-auto px-8 py-8">
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">New manuscript</div>
            <h1 className="mt-1 text-3xl tracking-tight font-semibold text-zinc-900">Project intake</h1>
            <p className="mt-2 text-sm text-zinc-600 max-w-2xl">
              Capture your research foundation. ManuscriptForge will use these inputs as the source of truth when
              generating each of the 20 manuscript sections.
            </p>
          </div>
        </header>

        <div className="max-w-5xl mx-auto px-8 py-10 grid grid-cols-12 gap-10">
          {/* Vertical step tracker */}
          <ol className="col-span-12 md:col-span-3 space-y-1 sticky top-8 self-start" data-testid="wizard-steps">
            {STEPS.map((s, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setStep(i)}
                    className="w-full text-left flex items-start gap-3 px-3 py-2.5 hover:bg-zinc-100 transition-colors"
                    data-testid={`wizard-step-${s.id}`}
                    data-active={active ? "true" : "false"}
                  >
                    <span className={`mt-0.5 w-5 h-5 inline-flex items-center justify-center text-[10px] font-mono border ${
                      done ? "bg-emerald-50 border-emerald-500 text-emerald-700" :
                      active ? "bg-[#0033A0] border-[#0033A0] text-white" :
                      "bg-white border-zinc-300 text-zinc-500"
                    }`}>
                      {done ? <Check className="w-3 h-3" /> : i + 1}
                    </span>
                    <div className="min-w-0">
                      <div className={`text-sm ${active ? "font-semibold text-zinc-900" : "text-zinc-700"}`}>{s.title}</div>
                      <div className="text-[11px] text-zinc-500 leading-snug">{s.desc}</div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>

          {/* Step form */}
          <div className="col-span-12 md:col-span-9">
            <div className="border border-zinc-200 bg-white p-8" data-testid={`wizard-panel-${cur.id}`}>
              <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Step {step + 1} of {STEPS.length}</div>
              <h2 className="mt-1 text-2xl tracking-tight font-medium text-zinc-900">{cur.title}</h2>
              <p className="mt-1 text-sm text-zinc-600">{cur.desc}</p>

              <div className="mt-8 space-y-6">
                {cur.fields.map((f) => (
                  <div key={f.key}>
                    <label className="text-xs font-mono uppercase tracking-widest text-zinc-500 block mb-1">{f.label}</label>
                    {f.textarea ? (
                      <textarea
                        value={inputs[f.key] || ""}
                        onChange={(e) => update(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        rows={5}
                        className="w-full border border-zinc-200 bg-white p-3 text-sm text-zinc-900 focus:outline-none focus:border-[#0033A0] rounded-sm"
                        data-testid={`input-${f.key}`}
                      />
                    ) : (
                      <input
                        value={inputs[f.key] || ""}
                        onChange={(e) => update(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        className="under-input"
                        data-testid={`input-${f.key}`}
                      />
                    )}
                  </div>
                ))}
              </div>

              {err && <div className="mt-6 text-xs text-red-600 font-mono" data-testid="wizard-error">{err}</div>}

              <div className="mt-10 pt-6 border-t border-zinc-100 flex items-center justify-between">
                <button
                  type="button"
                  disabled={step === 0}
                  onClick={back}
                  className="btn-ghost inline-flex items-center gap-2 disabled:opacity-50"
                  data-testid="wizard-back-btn"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                {step < STEPS.length - 1 ? (
                  <button type="button" onClick={next} className="btn-brand inline-flex items-center gap-2" data-testid="wizard-next-btn">
                    Continue <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button type="button" onClick={submit} disabled={busy} className="btn-brand inline-flex items-center gap-2" data-testid="wizard-submit-btn">
                    {busy ? "Creating…" : "Create manuscript"} <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NewManuscript;
