"""Data Lab: CSV/Excel ingestion, summary statistics, server-side plotting,
and image-based figure critique using Claude vision.
"""
from __future__ import annotations

import base64
import io
import json
import math
import os
import re
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import matplotlib

matplotlib.use("Agg")  # non-interactive backend
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns

UPLOAD_ROOT = Path(os.environ.get("MANUSCRIPT_UPLOAD_ROOT", "/app/backend/_uploads"))
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)

MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB
MAX_ROWS_FOR_PLOT = 10_000


# ---------- Persistence ----------

def _user_dir(user_id: str) -> Path:
    d = UPLOAD_ROOT / user_id
    d.mkdir(parents=True, exist_ok=True)
    return d


def save_dataset(user_id: str, filename: str, content: bytes) -> Tuple[str, Path]:
    if len(content) > MAX_FILE_BYTES:
        raise ValueError(f"File too large (max {MAX_FILE_BYTES // (1024 * 1024)} MB)")
    safe = re.sub(r"[^A-Za-z0-9._-]+", "_", filename)[:80] or "dataset"
    dataset_id = f"ds_{uuid.uuid4().hex[:12]}"
    path = _user_dir(user_id) / f"{dataset_id}__{safe}"
    path.write_bytes(content)
    return dataset_id, path


def find_dataset_path(user_id: str, dataset_id: str) -> Optional[Path]:
    d = _user_dir(user_id)
    for p in d.iterdir():
        if p.name.startswith(f"{dataset_id}__"):
            return p
    return None


# ---------- Loading & summary ----------

def load_dataframe(path: Path) -> pd.DataFrame:
    suffix = path.suffix.lower()
    if suffix in {".csv", ".tsv", ".txt"}:
        sep = "\t" if suffix == ".tsv" else None  # let pandas sniff for CSV/TXT
        return pd.read_csv(path, sep=sep, engine="python")
    if suffix in {".xlsx", ".xls", ".xlsm"}:
        return pd.read_excel(path)
    # Last-ditch attempt at CSV
    return pd.read_csv(path)


def _safe_number(v: Any) -> Optional[float]:
    if v is None:
        return None
    try:
        f = float(v)
        if math.isnan(f) or math.isinf(f):
            return None
        return f
    except (TypeError, ValueError):
        return None


def summarize_dataframe(df: pd.DataFrame, max_rows_preview: int = 8) -> Dict[str, Any]:
    n_rows, n_cols = df.shape
    cols: List[Dict[str, Any]] = []
    numeric_summary: Dict[str, Dict[str, Any]] = {}
    for col in df.columns:
        s = df[col]
        dtype = str(s.dtype)
        nonnull = s.dropna()
        unique = int(nonnull.nunique())
        info: Dict[str, Any] = {
            "name": str(col),
            "dtype": dtype,
            "n_missing": int(s.isna().sum()),
            "unique_count": unique,
        }
        if pd.api.types.is_numeric_dtype(s) and nonnull.size:
            desc = nonnull.describe()
            numeric_summary[str(col)] = {
                "mean": _safe_number(desc.get("mean")),
                "std": _safe_number(desc.get("std")),
                "min": _safe_number(desc.get("min")),
                "q1": _safe_number(desc.get("25%")),
                "median": _safe_number(desc.get("50%")),
                "q3": _safe_number(desc.get("75%")),
                "max": _safe_number(desc.get("max")),
            }
            info["sample_values"] = [_safe_number(x) for x in nonnull.head(5).tolist()]
        else:
            samples = nonnull.astype(str).head(5).tolist()
            info["sample_values"] = samples
            info["top_values"] = (
                nonnull.astype(str).value_counts().head(5).to_dict() if unique <= 50 else {}
            )
        cols.append(info)

    # Numeric correlation (Pearson) where applicable
    numeric_cols = df.select_dtypes(include="number")
    correlations: Dict[str, Dict[str, float]] = {}
    if numeric_cols.shape[1] >= 2 and numeric_cols.shape[0] >= 3:
        corr = numeric_cols.corr(method="pearson").round(3)
        for c1 in corr.columns:
            correlations[str(c1)] = {str(c2): _safe_number(corr.loc[c1, c2]) for c2 in corr.columns}

    # Head preview (string-converted for safe JSON)
    head_df = df.head(max_rows_preview).copy()
    for c in head_df.columns:
        head_df[c] = head_df[c].astype(object).where(pd.notna(head_df[c]), None)
    head_records = head_df.to_dict(orient="records")
    # Coerce numpy types to plain
    for row in head_records:
        for k, v in list(row.items()):
            if isinstance(v, (np.integer,)):
                row[k] = int(v)
            elif isinstance(v, (np.floating,)):
                row[k] = _safe_number(v)
            elif isinstance(v, (np.bool_,)):
                row[k] = bool(v)

    return {
        "shape": {"rows": int(n_rows), "cols": int(n_cols)},
        "columns": cols,
        "numeric_summary": numeric_summary,
        "correlations": correlations,
        "head": head_records,
    }


def summary_to_llm_text(summary: Dict[str, Any], filename: str) -> str:
    """Compact textual representation suitable to send to an LLM."""
    lines: List[str] = [
        f"Dataset: {filename}",
        f"Shape: {summary['shape']['rows']} rows × {summary['shape']['cols']} columns",
        "",
        "Columns:",
    ]
    for c in summary["columns"]:
        ns = summary["numeric_summary"].get(c["name"])
        if ns:
            lines.append(
                f"  - {c['name']} [{c['dtype']}] missing={c['n_missing']} unique={c['unique_count']} "
                f"mean={ns['mean']} std={ns['std']} min={ns['min']} q1={ns['q1']} median={ns['median']} q3={ns['q3']} max={ns['max']}"
            )
        else:
            lines.append(
                f"  - {c['name']} [{c['dtype']}] missing={c['n_missing']} unique={c['unique_count']} samples={c.get('sample_values')}"
            )

    if summary["correlations"]:
        lines.append("")
        lines.append("Pearson correlation matrix (numeric columns):")
        cols = list(summary["correlations"].keys())
        header = "    " + "  ".join(f"{c[:8]:>10}" for c in cols)
        lines.append(header)
        for c1 in cols:
            row_vals = " ".join(f"{(summary['correlations'][c1].get(c2) or 0):>10.3f}" for c2 in cols)
            lines.append(f"  {c1[:8]:<10}{row_vals}")

    if summary["head"]:
        lines.append("")
        lines.append("Head (first rows):")
        head_keys = list(summary["head"][0].keys())
        lines.append("  | " + " | ".join(head_keys) + " |")
        for row in summary["head"]:
            lines.append("  | " + " | ".join(str(row.get(k, "")) for k in head_keys) + " |")
    return "\n".join(lines)


# ---------- Plotting ----------

PLOT_TYPES = {"boxplot", "violin", "histogram", "scatter", "bar", "correlation_heatmap", "line"}


def _fig_to_base64(fig) -> str:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=130, bbox_inches="tight")
    plt.close(fig)
    return base64.b64encode(buf.getvalue()).decode("ascii")


def render_plot(
    df: pd.DataFrame,
    plot_type: str,
    x: Optional[str] = None,
    y: Optional[str] = None,
    hue: Optional[str] = None,
    title: Optional[str] = None,
) -> Dict[str, Any]:
    if plot_type not in PLOT_TYPES:
        raise ValueError(f"Unsupported plot_type. Allowed: {sorted(PLOT_TYPES)}")
    if df.shape[0] > MAX_ROWS_FOR_PLOT:
        df = df.sample(n=MAX_ROWS_FOR_PLOT, random_state=42)

    sns.set_theme(style="whitegrid", context="paper")
    fig, ax = plt.subplots(figsize=(7.5, 4.5))

    numeric_cols = df.select_dtypes(include="number").columns.tolist()

    def _need(col: Optional[str], label: str) -> str:
        if not col or col not in df.columns:
            raise ValueError(f"Plot '{plot_type}' requires a valid '{label}' column.")
        return col

    if plot_type == "boxplot":
        y_col = _need(y, "y")
        if x and x in df.columns:
            sns.boxplot(data=df, x=x, y=y_col, hue=hue if hue in df.columns else None, ax=ax)
        else:
            sns.boxplot(data=df[numeric_cols] if numeric_cols else df, ax=ax)
    elif plot_type == "violin":
        y_col = _need(y, "y")
        if x and x in df.columns:
            sns.violinplot(data=df, x=x, y=y_col, hue=hue if hue in df.columns else None, ax=ax, inner="box")
        else:
            sns.violinplot(data=df[numeric_cols] if numeric_cols else df, ax=ax)
    elif plot_type == "histogram":
        col = _need(x or y, "x")
        sns.histplot(data=df, x=col, hue=hue if hue in df.columns else None, kde=True, ax=ax)
    elif plot_type == "scatter":
        x_col = _need(x, "x")
        y_col = _need(y, "y")
        sns.scatterplot(data=df, x=x_col, y=y_col, hue=hue if hue in df.columns else None, ax=ax, s=42)
    elif plot_type == "bar":
        y_col = _need(y, "y")
        x_col = _need(x, "x")
        sns.barplot(data=df, x=x_col, y=y_col, hue=hue if hue in df.columns else None, ax=ax, errorbar="ci")
    elif plot_type == "line":
        y_col = _need(y, "y")
        x_col = _need(x, "x")
        sns.lineplot(data=df, x=x_col, y=y_col, hue=hue if hue in df.columns else None, ax=ax, marker="o")
    elif plot_type == "correlation_heatmap":
        if len(numeric_cols) < 2:
            raise ValueError("Correlation heatmap requires at least 2 numeric columns.")
        corr = df[numeric_cols].corr(method="pearson")
        sns.heatmap(corr, annot=True, fmt=".2f", cmap="vlag", center=0, ax=ax, cbar_kws={"shrink": 0.8})

    if title:
        ax.set_title(title, fontsize=11)
    fig.tight_layout()

    caption = _suggest_caption(plot_type, x, y, hue, title)
    return {"plot_base64": _fig_to_base64(fig), "plot_type": plot_type, "caption": caption}


def _suggest_caption(plot_type: str, x: Optional[str], y: Optional[str], hue: Optional[str], title: Optional[str]) -> str:
    parts = {
        "boxplot": "Distribution of {y}" + (" by {x}" if x else "") + (", stratified by {hue}" if hue else ""),
        "violin": "Density distribution of {y}" + (" by {x}" if x else "") + (", stratified by {hue}" if hue else ""),
        "histogram": "Frequency distribution of {x}" + (", stratified by {hue}" if hue else ""),
        "scatter": "Relationship between {x} and {y}" + (", stratified by {hue}" if hue else ""),
        "bar": "Mean {y} (with 95% CI) across {x}" + (", stratified by {hue}" if hue else ""),
        "line": "{y} as a function of {x}" + (", stratified by {hue}" if hue else ""),
        "correlation_heatmap": "Pearson correlation matrix across numeric variables",
    }
    tpl = parts.get(plot_type, "Plot")
    return tpl.format(x=x or "?", y=y or "?", hue=hue or "?")


# ---------- LLM helpers ----------

def parse_json_object(raw: str) -> Optional[Dict[str, Any]]:
    if not raw:
        return None
    text = raw.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*\n?", "", text)
        text = re.sub(r"\n?```$", "", text).strip()
    try:
        obj = json.loads(text)
        return obj if isinstance(obj, dict) else None
    except Exception:
        m = re.search(r"\{.*\}", text, re.DOTALL)
        if m:
            try:
                obj = json.loads(m.group(0))
                return obj if isinstance(obj, dict) else None
            except Exception:
                return None
    return None


DATA_SUGGEST_SYSTEM = """You are a senior reviewer for a Q1 WoS-indexed journal. The user has shared a dataset summary. Your job is to:
1. Propose 4–7 specific, high-impact analyses that would strengthen the manuscript's Results section.
2. Recommend 3–5 specific figures (box plot, violin, histogram, scatter with regression, correlation heatmap, etc.), each tied to a column from the dataset.
3. Flag any analyses that reviewers would consider mandatory but are currently missing.
4. Identify any analyses or visualizations that would substantially improve publication impact (effect size reporting, distribution-based plots over bar plots, mixed-effects models for nested data, etc.).

Respond ONLY with a single JSON object on a single line — no code fences, no preamble:
{
  "analyses": [{"title": "...", "rationale": "...", "method": "...", "impact": "..."}, ...],
  "figures": [{"plot_type": "boxplot|violin|histogram|scatter|bar|correlation_heatmap|line", "x": "<col or null>", "y": "<col or null>", "hue": "<col or null>", "title": "...", "rationale": "..."}, ...],
  "missing_analyses": ["...", "..."],
  "impact_notes": "1-3 short sentences on what would most increase reviewer acceptance."
}

Use the exact column names from the dataset summary in x/y/hue. Set fields to null when not applicable. plot_type values MUST be from the allowed list."""


FIGURE_CRITIQUE_SYSTEM = """You are a senior figure-design reviewer for a Q1 WoS-indexed journal. The user has uploaded an image of a figure from their manuscript. Critique it with concrete, actionable feedback.

Cover, where applicable:
- Information density and chart-type appropriateness (bar plot hiding distributions → recommend box/violin; missing error bars; pie chart inappropriate; etc.)
- Statistical clarity (effect sizes, confidence intervals, significance markers, sample sizes per group)
- Axis labels, units, legends, gridlines, colour-blind safety
- Comparability across panels / consistency
- What additional analysis or figure would substantially raise the paper's chance of acceptance

Respond ONLY with a single JSON object — no code fences:
{
  "critique": "2-4 sentence high-level critique",
  "improvements": ["actionable improvement #1", "...", ...],
  "suggested_replacement": {"plot_type": "boxplot|violin|histogram|scatter|bar|correlation_heatmap|line|none", "x": null, "y": null, "hue": null, "title": "...", "rationale": "..."},
  "additional_analyses": ["analysis the author should add to strengthen the paper", "..."],
  "impact_notes": "1-3 sentences on publication-acceptance impact"
}

If a dataset summary is provided (with concrete column names), populate x/y/hue using those names. If you cannot determine the columns from the image alone and no dataset is provided, set them to null. plot_type 'none' means the existing chart is good as-is."""
