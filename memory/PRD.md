# ManuscriptForge — Product Requirements Document

## Original problem statement
Build an expert AI manuscript writer for Q1 WoS-indexed journal publications across engineering, maritime studies, environmental science, energy systems, machine learning, sustainability, and multidisciplinary research. Users supply research details (title, field, abstract idea, objectives, methodology, datasets, ML models, equations, findings, etc.) and receive a complete, publication-ready manuscript structured to top-tier journal standards (Elsevier, Springer Nature, Wiley, Taylor & Francis, MDPI).

## Architecture
- **Frontend**: React (CRA + Craco), Tailwind, shadcn/ui, React Router, axios, react-markdown, lucide-react. Typography: IBM Plex Sans (UI) + Spectral (manuscript body) + IBM Plex Mono (metadata). Brand color `#0033A0`. Swiss/editorial light theme.
- **Backend**: FastAPI + Motor (MongoDB), JWT (PyJWT) + bcrypt for password auth, Emergent Google OAuth pattern for social login, emergentintegrations.LlmChat for Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`), httpx for Crossref, python-docx + reportlab for exports.
- **Database collections**: `users`, `user_sessions`, `manuscripts` (all use `user_id` UUID; queries always `{_id: 0}`).

## User personas
1. **Researcher / PhD student** — drafts manuscripts iteratively, needs section-level regeneration.
2. **Professor / Lab PI** — manages multiple ongoing manuscript projects, exports final drafts to DOCX/PDF for submission.
3. **Postdoc collaborator** — fast triage of literature via Crossref to enrich a draft.

## Core requirements (static)
- 20-section manuscript spine (Title → References) with independent generation per section.
- Auth: JWT email/password AND Emergent-managed Google OAuth (single user pool).
- Crossref reference search with copy-as-APA.
- Export to Markdown / DOCX / PDF.
- Manuscript library (CRUD).
- Q1-grade scholarly prose calibration via Claude Sonnet 4.5.

## What's been implemented — 2026-01
- Landing page with hero, 6 feature blocks, 20-section catalog, footer.
- Auth (Login + Register pages, AuthCallback for Google OAuth, robust session handling).
- Dashboard manuscript library with progress bars, delete, empty-state.
- 5-step manuscript wizard for structured input (Project basics → Framing → Methodology → Data → Discussion).
- Editor: 3-column layout (TOC + manuscript canvas + Crossref reference panel) with:
  - Per-section status (empty / generating / drafted / error)
  - Generate / Regenerate / Copy / Edit per section
  - "Generate full draft" sequential generation
  - Real-time striped "generating" indicator + just-completed flash
  - Export menu (Markdown / DOCX / PDF)
  - In-editor sign-out
- Crossref search panel with formatted-APA copy (robust async + execCommand fallback).
- Settings page (read-only profile).
- ProtectedRoute + AuthProvider with OAuth race-condition handling.
- Backend: 16 `/api` endpoints, all secured, full CRUD + LLM + Crossref + export.

## Prioritized backlog (next sessions)
**P1** — Streaming/SSE for section generation (currently 30-90s synchronous).
**P1** — Real authority-ranked citation insertion (one-click "insert citation" into active section, not just clipboard).
**P2** — Diff view / version history per section (today only current content is stored).
**P2** — Multi-user collaboration / sharing.
**P2** — LaTeX export (in addition to DOCX/PDF/MD) for direct journal submission.
**P3** — Plagiarism / AI-detection self-check.
**P3** — Reference manager integration (Zotero, Mendeley).

## Known limitations
- Section generation is synchronous — long requests can hold the connection. Acceptable for MVP; future SSE upgrade noted.
- Editor.jsx is ~460 LOC; could be split into EditorCanvas / TocSidebar / ReferencePanel files (future refactor).
- Google OAuth requires real Google credentials — cannot e2e test in sandbox; UI/flow verified manually.

## Verified test runs
- Iteration 1 (backend): 23/23 PASS.
- Iteration 2 (frontend): 17/19 + 2 issues found.
- Iteration 3 (frontend retest): 3/4 fixes verified; copyRef partial.
- Iteration 4 (frontend retest): 100% PASS — all fixes verified.
