import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle, BarChart3, Check, FileSpreadsheet, Image as ImageIcon, Loader2,
  Plus, Sparkles, Upload, X,
} from "lucide-react";
import api from "@/lib/api";

const PLOT_TYPE_LABEL = {
  boxplot: "Box plot",
  violin: "Violin",
  histogram: "Histogram",
  scatter: "Scatter",
  bar: "Bar (mean ± CI)",
  line: "Line",
  correlation_heatmap: "Correlation heatmap",
};

/**
 * DataLab — CSV/Excel upload, AI analysis suggestions, plot rendering, and image critique.
 *
 * Props:
 *   manuscriptId
 *   onInsertIntoSection({markdown, base64?}) — invoked when the user clicks "Insert into Results"
 */
const DataLab = ({ manuscriptId, onInsertIntoSection }) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("data"); // "data" | "figure"

  return (
    <div className="mt-4 border-t border-zinc-100 pt-3" data-testid="datalab-wrap">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-zinc-500 hover:text-[#0033A0] transition-colors"
        data-testid="datalab-toggle"
      >
        <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />
        <span>{open ? "Hide Data Lab" : "Data Lab — upload data, get AI analysis"}</span>
      </button>

      {open && (
        <div className="mt-3 border border-zinc-200 bg-[#fcfcfc]" data-testid="datalab-panel">
          <div className="px-4 py-2.5 border-b border-zinc-200 flex items-center justify-between">
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 inline-flex items-center gap-2">
              <Sparkles className="w-3 h-3 text-[#0033A0]" /> AI Data Analyst
            </div>
            <div className="flex border border-zinc-200">
              <button
                type="button"
                onClick={() => setTab("data")}
                className={`px-3 py-1 text-[11px] font-mono uppercase tracking-widest border-r border-zinc-200 ${tab === "data" ? "bg-[#0033A0] text-white" : "bg-white text-zinc-600 hover:bg-zinc-50"}`}
                data-testid="datalab-tab-data"
              >
                <FileSpreadsheet className="w-3 h-3 inline -mt-0.5 mr-1" /> Dataset
              </button>
              <button
                type="button"
                onClick={() => setTab("figure")}
                className={`px-3 py-1 text-[11px] font-mono uppercase tracking-widest ${tab === "figure" ? "bg-[#0033A0] text-white" : "bg-white text-zinc-600 hover:bg-zinc-50"}`}
                data-testid="datalab-tab-figure"
              >
                <ImageIcon className="w-3 h-3 inline -mt-0.5 mr-1" /> Figure critique
              </button>
            </div>
          </div>

          {tab === "data" ? (
            <DatasetTab manuscriptId={manuscriptId} onInsertIntoSection={onInsertIntoSection} />
          ) : (
            <FigureTab manuscriptId={manuscriptId} onInsertIntoSection={onInsertIntoSection} />
          )}
        </div>
      )}
    </div>
  );
};

// ----------------- Dataset tab -----------------

const DatasetTab = ({ manuscriptId, onInsertIntoSection }) => {
  const [uploading, setUploading] = useState(false);
  const [dataset, setDataset] = useState(null); // {dataset_id, filename, summary}
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [error, setError] = useState("");
  const [plot, setPlot] = useState(null); // {plot_base64, caption, plot_type, params}
  const [renderingPlot, setRenderingPlot] = useState(null); // plot_type currently rendering
  const fileRef = useRef(null);

  const upload = async (file) => {
    setError(""); setUploading(true); setDataset(null); setSuggestions(null); setPlot(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post(`/manuscripts/${manuscriptId}/datalab/upload`, fd);
      setDataset(data);
    } catch (e) {
      setError(e?.response?.data?.detail || "Upload failed");
    } finally { setUploading(false); }
  };

  const suggest = async () => {
    if (!dataset) return;
    setSuggesting(true); setError("");
    try {
      const { data } = await api.post(`/manuscripts/${manuscriptId}/datalab/suggest`, {
        dataset_id: dataset.dataset_id, focus: "publication impact",
      });
      setSuggestions(data);
    } catch (e) {
      setError(e?.response?.data?.detail || "AI suggestion failed");
    } finally { setSuggesting(false); }
  };

  const renderPlot = async (fig) => {
    if (!dataset) return;
    setRenderingPlot(fig.plot_type + ":" + (fig.x || "") + ":" + (fig.y || ""));
    setError("");
    try {
      const { data } = await api.post(`/manuscripts/${manuscriptId}/datalab/plot`, {
        dataset_id: dataset.dataset_id,
        plot_type: fig.plot_type,
        x: fig.x || null,
        y: fig.y || null,
        hue: fig.hue || null,
        title: fig.title || null,
      });
      setPlot({ ...data, source: fig });
    } catch (e) {
      setError(e?.response?.data?.detail || "Plot failed");
    } finally { setRenderingPlot(null); }
  };

  const insertPlot = () => {
    if (!plot) return;
    const md = `\n\n_Fig. ${(plot.source?.title || plot.caption).replace(/[\n\r]/g, " ")}_\n\n![${plot.caption}](data:image/png;base64,${plot.plot_base64})\n`;
    onInsertIntoSection?.({ markdown: md });
  };

  const insertAnalysisNarrative = (a) => {
    const md = `\n\n**${a.title}.** ${a.method ? a.method + " " : ""}${a.rationale || ""}${a.impact ? " (" + a.impact + ")" : ""}\n`;
    onInsertIntoSection?.({ markdown: md });
  };

  return (
    <div className="p-4 space-y-4">
      {/* Upload */}
      <div className="border border-dashed border-zinc-300 p-4 bg-white">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-zinc-600">
            Upload a <strong>CSV</strong>, <strong>TSV</strong>, or <strong>Excel</strong> file. We'll analyse columns, summary
            statistics, and ask Claude Opus to suggest reviewer-grade analyses & figures.
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.tsv,.txt,.xlsx,.xls,.xlsm"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
              data-testid="datalab-file-input"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="btn-brand inline-flex items-center gap-2"
              data-testid="datalab-upload-btn"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {uploading ? "Uploading…" : "Upload dataset"}
            </button>
          </div>
        </div>
        {dataset && (
          <div className="mt-3 text-[11px] font-mono text-zinc-600" data-testid="datalab-dataset-meta">
            Loaded <span className="text-zinc-900">{dataset.filename}</span> — {dataset.summary.shape.rows} rows × {dataset.summary.shape.cols} cols
          </div>
        )}
      </div>

      {error && (
        <div className="text-[11px] font-mono text-red-600 inline-flex items-center gap-1" data-testid="datalab-error">
          <AlertTriangle className="w-3 h-3" /> {error}
        </div>
      )}

      {dataset && (
        <>
          {/* Column inspector */}
          <div className="border border-zinc-200 bg-white">
            <div className="px-4 py-2 border-b border-zinc-200 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
              Columns
            </div>
            <div className="max-h-56 overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-zinc-50 sticky top-0 z-0">
                  <tr className="text-left text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                    <th className="px-3 py-1.5">Column</th>
                    <th className="px-3 py-1.5">Type</th>
                    <th className="px-3 py-1.5">Missing</th>
                    <th className="px-3 py-1.5">Unique</th>
                    <th className="px-3 py-1.5">Stats / Sample</th>
                  </tr>
                </thead>
                <tbody data-testid="datalab-columns">
                  {dataset.summary.columns.map((c) => {
                    const ns = dataset.summary.numeric_summary[c.name];
                    return (
                      <tr key={c.name} className="border-t border-zinc-100">
                        <td className="px-3 py-1.5 font-mono text-zinc-900">{c.name}</td>
                        <td className="px-3 py-1.5 font-mono text-zinc-500">{c.dtype}</td>
                        <td className="px-3 py-1.5 font-mono text-zinc-500">{c.n_missing}</td>
                        <td className="px-3 py-1.5 font-mono text-zinc-500">{c.unique_count}</td>
                        <td className="px-3 py-1.5 text-zinc-600">
                          {ns ? (
                            <span className="font-mono text-[11px]">μ={fmt(ns.mean)} σ={fmt(ns.std)} [{fmt(ns.min)} – {fmt(ns.max)}]</span>
                          ) : (
                            <span className="font-mono text-[11px]">{(c.sample_values || []).slice(0, 3).join(" · ")}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* AI suggestions */}
          <div>
            <button
              type="button"
              onClick={suggest}
              disabled={suggesting}
              className="btn-brand inline-flex items-center gap-2"
              data-testid="datalab-suggest-btn"
            >
              {suggesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {suggesting ? "Asking AI…" : "AI: suggest analyses & figures"}
            </button>
          </div>

          {suggestions && (
            <div className="grid md:grid-cols-2 gap-4" data-testid="datalab-suggestions">
              <div className="border border-zinc-200 bg-white p-4">
                <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">Suggested analyses</div>
                <ul className="space-y-3">
                  {suggestions.analyses.map((a, i) => (
                    <li key={i} className="text-sm" data-testid={`datalab-analysis-${i}`}>
                      <div className="font-medium text-zinc-900">{a.title}</div>
                      {a.method && <div className="text-xs text-zinc-600 mt-0.5">{a.method}</div>}
                      {a.impact && <div className="text-xs text-emerald-700 italic mt-0.5">Impact: {a.impact}</div>}
                      <button
                        type="button"
                        onClick={() => insertAnalysisNarrative(a)}
                        className="mt-1 text-[11px] text-[#0033A0] hover:text-[#002370] inline-flex items-center gap-1"
                        data-testid={`datalab-insert-analysis-${i}`}
                      >
                        <Plus className="w-3 h-3" /> Insert narrative into section
                      </button>
                    </li>
                  ))}
                </ul>
                {suggestions.missing_analyses?.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-zinc-100">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-amber-700 mb-1">Reviewers will likely ask</div>
                    <ul className="text-xs text-zinc-700 list-disc pl-4 space-y-0.5">
                      {suggestions.missing_analyses.map((m, i) => <li key={i}>{m}</li>)}
                    </ul>
                  </div>
                )}
                {suggestions.impact_notes && (
                  <div className="mt-3 text-[11px] italic text-zinc-600 border-l-2 border-[#0033A0] pl-2">
                    {suggestions.impact_notes}
                  </div>
                )}
              </div>

              <div className="border border-zinc-200 bg-white p-4">
                <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">Suggested figures</div>
                <ul className="space-y-2">
                  {suggestions.figures.map((f, i) => (
                    <li key={i} className="text-sm flex items-start justify-between gap-2 border-b border-zinc-100 pb-2" data-testid={`datalab-figure-${i}`}>
                      <div className="min-w-0">
                        <div className="font-medium text-zinc-900">
                          {PLOT_TYPE_LABEL[f.plot_type] || f.plot_type}
                          <span className="text-zinc-500 font-mono text-[10px] ml-1">
                            {f.x ? `x=${f.x}` : ""} {f.y ? ` y=${f.y}` : ""} {f.hue ? ` hue=${f.hue}` : ""}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-600 mt-0.5">{f.title}</div>
                        {f.rationale && <div className="text-[11px] text-zinc-500 italic mt-0.5">{f.rationale}</div>}
                      </div>
                      <button
                        type="button"
                        onClick={() => renderPlot(f)}
                        disabled={!!renderingPlot}
                        className="btn-ghost text-[11px] shrink-0 inline-flex items-center gap-1"
                        data-testid={`datalab-render-figure-${i}`}
                      >
                        {renderingPlot ? <Loader2 className="w-3 h-3 animate-spin" /> : <BarChart3 className="w-3 h-3" />}
                        Render
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {plot && (
            <div className="border border-zinc-200 bg-white p-4" data-testid="datalab-rendered-plot">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                  {PLOT_TYPE_LABEL[plot.plot_type] || plot.plot_type}
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={insertPlot} className="btn-brand inline-flex items-center gap-1.5" data-testid="datalab-insert-plot-btn">
                    <Plus className="w-3.5 h-3.5" /> Insert into section
                  </button>
                  <button type="button" onClick={() => setPlot(null)} className="btn-ghost inline-flex items-center gap-1" data-testid="datalab-dismiss-plot-btn">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <img
                src={`data:image/png;base64,${plot.plot_base64}`}
                alt={plot.caption}
                className="w-full border border-zinc-200"
              />
              <div className="mt-2 text-[11px] italic text-zinc-600">{plot.caption}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ----------------- Figure critique tab -----------------

const FigureTab = ({ manuscriptId, onInsertIntoSection }) => {
  const [datasets, setDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/manuscripts/${manuscriptId}/datalab/datasets`);
        setDatasets(data.datasets || []);
        if (data.datasets?.length) setSelectedDataset(data.datasets[data.datasets.length - 1].dataset_id);
      } catch (_) {/* ignore */}
    })();
  }, [manuscriptId]);

  const onFile = (file) => {
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    if (!imageFile) return;
    setError(""); setSubmitting(true); setResult(null);
    try {
      const fd = new FormData();
      fd.append("image", imageFile);
      if (selectedDataset) fd.append("dataset_id", selectedDataset);
      const { data } = await api.post(`/manuscripts/${manuscriptId}/figure/critique`, fd);
      setResult(data);
    } catch (e) {
      setError(e?.response?.data?.detail || "Critique failed");
    } finally { setSubmitting(false); }
  };

  const insertReplacement = () => {
    if (!result?.replacement_plot) return;
    const r = result.replacement_plot;
    const md = `\n\n_Fig. ${result.suggested_replacement?.title || r.caption}_\n\n![${r.caption}](data:image/png;base64,${r.plot_base64})\n`;
    onInsertIntoSection?.({ markdown: md });
  };

  return (
    <div className="p-4 space-y-4">
      <div className="border border-dashed border-zinc-300 p-4 bg-white space-y-3">
        <div className="text-xs text-zinc-600">
          Upload an image of a figure you've drafted (bar chart, scatter, etc.) and Claude Opus will critique it,
          suggest a stronger visualization, and propose extra analyses for reviewer impact.
        </div>
        <div className="grid sm:grid-cols-2 gap-3 items-end">
          <div>
            <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block mb-1">Image (PNG/JPG)</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
              data-testid="figure-image-input"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="btn-ghost w-full inline-flex items-center justify-center gap-2"
              data-testid="figure-pick-btn"
            >
              <Upload className="w-3.5 h-3.5" /> {imageFile ? imageFile.name : "Choose image"}
            </button>
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block mb-1">
              Pair with dataset (optional)
            </label>
            <select
              value={selectedDataset}
              onChange={(e) => setSelectedDataset(e.target.value)}
              className="w-full border border-zinc-200 bg-white px-2 py-2 text-sm focus:outline-none focus:border-[#0033A0]"
              data-testid="figure-dataset-select"
            >
              <option value="">— none —</option>
              {datasets.map((d) => (
                <option key={d.dataset_id} value={d.dataset_id}>
                  {d.filename} ({d.rows}×{d.cols})
                </option>
              ))}
            </select>
          </div>
        </div>
        {imagePreview && (
          <div className="mt-2">
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">Your figure</div>
            <img src={imagePreview} alt="preview" className="max-h-64 border border-zinc-200" data-testid="figure-preview" />
          </div>
        )}
        <div>
          <button
            type="button"
            onClick={submit}
            disabled={!imageFile || submitting}
            className="btn-brand inline-flex items-center gap-2"
            data-testid="figure-critique-btn"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {submitting ? "Critiquing…" : "Critique this figure"}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-[11px] font-mono text-red-600 inline-flex items-center gap-1" data-testid="figure-error">
          <AlertTriangle className="w-3 h-3" /> {error}
        </div>
      )}

      {result && (
        <div className="space-y-4" data-testid="figure-critique-result">
          <div className="border border-zinc-200 bg-white p-4">
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">AI critique</div>
            <p className="text-sm text-zinc-800 leading-relaxed">{result.critique}</p>
            {result.improvements?.length > 0 && (
              <ul className="mt-3 text-xs text-zinc-700 list-disc pl-4 space-y-1">
                {result.improvements.map((it, i) => <li key={i}>{it}</li>)}
              </ul>
            )}
            {result.impact_notes && (
              <div className="mt-3 text-[11px] italic text-zinc-600 border-l-2 border-[#0033A0] pl-2">{result.impact_notes}</div>
            )}
          </div>

          {result.replacement_plot ? (
            <div className="border border-zinc-200 bg-white p-4" data-testid="figure-replacement-plot">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-700 inline-flex items-center gap-1">
                  <Check className="w-3 h-3" /> Suggested replacement — {PLOT_TYPE_LABEL[result.replacement_plot.plot_type] || result.replacement_plot.plot_type}
                </div>
                <button type="button" onClick={insertReplacement} className="btn-brand inline-flex items-center gap-1.5" data-testid="figure-insert-replacement-btn">
                  <Plus className="w-3.5 h-3.5" /> Insert into section
                </button>
              </div>
              <img
                src={`data:image/png;base64,${result.replacement_plot.plot_base64}`}
                alt={result.replacement_plot.caption}
                className="w-full border border-zinc-200"
              />
              <div className="mt-2 text-[11px] italic text-zinc-600">{result.replacement_plot.caption}</div>
              {result.suggested_replacement?.rationale && (
                <div className="mt-2 text-[11px] text-zinc-600">{result.suggested_replacement.rationale}</div>
              )}
            </div>
          ) : (
            result.suggested_replacement?.plot_type && result.suggested_replacement.plot_type !== "none" && (
              <div className="border border-zinc-200 bg-white p-4 text-xs text-zinc-600" data-testid="figure-replacement-suggestion-only">
                <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">Suggested replacement</div>
                The AI recommends a <strong>{PLOT_TYPE_LABEL[result.suggested_replacement.plot_type] || result.suggested_replacement.plot_type}</strong>
                ({[result.suggested_replacement.x && `x=${result.suggested_replacement.x}`, result.suggested_replacement.y && `y=${result.suggested_replacement.y}`, result.suggested_replacement.hue && `hue=${result.suggested_replacement.hue}`].filter(Boolean).join(", ")}).
                Attach a dataset above to render it automatically.
              </div>
            )
          )}

          {result.additional_analyses?.length > 0 && (
            <div className="border border-zinc-200 bg-white p-4">
              <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">Additional analyses for publication impact</div>
              <ul className="text-xs text-zinc-700 list-disc pl-4 space-y-1">
                {result.additional_analyses.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const fmt = (v) => {
  if (v == null || Number.isNaN(v)) return "—";
  const a = Math.abs(v);
  if (a !== 0 && (a < 0.01 || a >= 10000)) return v.toExponential(2);
  return Number(v).toFixed(2);
};

export default DataLab;
