# ScholarPen

> An AI manuscript writer for Q1 WoS-indexed journal publications.
> Section-by-section generation, per-section AI chat, Crossref DOI lookup,
> a Data Lab (CSV/Excel upload → suggested analyses → matplotlib plots →
> Claude-vision figure critique), and DOCX / PDF / Markdown export.

ScholarPen is a portable, self-hostable alternative to platform-locked manuscript
writers. It depends on **only standard open-source packages** and the official
**Anthropic SDK**. No proprietary integrations.

---

## Tech stack

| Layer    | Tech                                                          |
| -------- | ------------------------------------------------------------- |
| Frontend | React 19 + CRA + Craco · Tailwind + shadcn/ui · React Router  |
| Backend  | FastAPI + Motor (async MongoDB) · PyJWT + bcrypt · httpx      |
| LLM      | Anthropic Claude (default `claude-opus-4-5-20251101`)         |
| Data Lab | pandas · NumPy · matplotlib · seaborn · openpyxl              |
| Export   | python-docx · reportlab                                       |
| Auth     | JWT email + password (extensible)                             |

---

## Recommended deployment (free tier)

```
┌────────────────┐    HTTPS    ┌──────────────────┐   MongoDB+srv  ┌──────────────────┐
│  Vercel (FE)   │ ──────────▶ │  Railway (API)   │ ─────────────▶ │ MongoDB Atlas M0 │
│  React SPA     │             │  FastAPI         │                │ 512 MB free      │
└────────────────┘             │  Anthropic SDK   │                └──────────────────┘
                               └──────────────────┘
```

Estimated cost: **$0/month for hobby usage** (Vercel hobby, Railway free trial credit, Atlas M0).
The only paid item is your Anthropic API usage.

---

## Repository layout

```
scholarpen/
├── README.md                  ← you are here
├── .gitignore
├── docker-compose.yml         ← one-shot local stack
├── backend/
│   ├── server.py              ← FastAPI app
│   ├── llm.py                 ← Anthropic SDK wrapper
│   ├── datalab.py             ← CSV/Excel parsing + matplotlib plotting
│   ├── exporters.py           ← Markdown / DOCX / PDF numbered exporters
│   ├── requirements.txt
│   ├── runtime.txt            ← python version pin
│   ├── Procfile               ← Railway / Render / Heroku-style
│   ├── railway.json           ← Railway service config
│   ├── Dockerfile             ← optional containerized deploy
│   └── .env.example
└── frontend/
    ├── package.json
    ├── craco.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── vercel.json            ← Vercel project config
    ├── public/
    ├── src/
    └── .env.example
```

---

## Step 1 · Create the cloud accounts you'll need

1. **GitHub** — to host the repository.
2. **MongoDB Atlas** — <https://www.mongodb.com/cloud/atlas/register>.
3. **Anthropic Console** — <https://console.anthropic.com> → create an API key.
4. **Railway** — <https://railway.com> (sign in with GitHub).
5. **Vercel** — <https://vercel.com> (sign in with GitHub).

---

## Step 2 · Push this repo to GitHub

```bash
cd scholarpen
git init
git add .
git commit -m "ScholarPen: initial commit"
git branch -M main
git remote add origin https://github.com/<your-user>/scholarpen.git
git push -u origin main
```

> The provided `.gitignore` already excludes `.env`, `node_modules`, `_uploads/`, etc.
> **Never commit your `.env` files or your Anthropic API key.**

---

## Step 3 · Create a MongoDB Atlas free cluster

1. In Atlas, **Build a Database → M0 (Free)**.
2. Cloud provider: any. Region: closest to your Railway deploy region.
3. **Database Access** → add a database user (e.g. `scholarpen`) with a strong password.
4. **Network Access** → *Add IP* → `0.0.0.0/0` (allow from anywhere). For production
   you can restrict to Railway's egress IPs later.
5. **Connect → Drivers → Python → Copy connection string**, e.g.
   `mongodb+srv://scholarpen:<PASSWORD>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
6. Keep this string handy — it becomes `MONGO_URL` in Railway.

---

## Step 4 · Deploy the backend to Railway

1. In Railway: **New Project → Deploy from GitHub repo → select your ScholarPen repo**.
2. After Railway detects the project, **Add a Service → Empty Service → Connect Repo**.
3. **Settings → Root Directory** → `backend`.
4. Railway's Nixpacks builder will read `runtime.txt`, `requirements.txt`, and
   `railway.json`. Build & start commands are auto-set from `railway.json`.
5. **Variables tab** → add the following (no quotes, no spaces around `=`):

   | Key                   | Value                                                      |
   | --------------------- | ---------------------------------------------------------- |
   | `MONGO_URL`           | your Atlas connection string                               |
   | `DB_NAME`             | `scholarpen`                                               |
   | `JWT_SECRET`          | a long random string (run `openssl rand -hex 48`)          |
   | `ANTHROPIC_API_KEY`   | `sk-ant-…` from console.anthropic.com                      |
   | `CORS_ORIGINS`        | `https://<your-vercel-domain>.vercel.app` (set after step 5)|
   | `CROSSREF_CONTACT_EMAIL` | your email (polite contact for Crossref)                |

6. **Settings → Networking → Generate Domain** → Railway gives you a URL like
   `scholarpen-api-production.up.railway.app`. **Copy it.**
7. **Deploy**. Confirm the logs show `Application startup complete.` and that
   `GET https://<your-railway-domain>/api/` returns
   `{"app":"ScholarPen","ok":true,"sections":[…]}`.

> Railway free credit ($5/mo) easily covers a low-traffic ScholarPen.
> If you exhaust credit you can switch to the `hobby` plan ($5/mo) or use Render
> Free (cold-starts after 15 min idle) — same `Procfile` works there too.

---

## Step 5 · Deploy the frontend to Vercel

1. In Vercel: **Add New → Project → Import Git Repository → select your repo**.
2. **Configure Project:**
   * **Root Directory:** `frontend`
   * **Framework Preset:** *Create React App* (Vercel auto-detects).
   * **Build Command:** `yarn build` (default).
   * **Output Directory:** `build` (default).
3. **Environment Variables → add:**

   | Key                       | Value                                                   |
   | ------------------------- | ------------------------------------------------------- |
   | `REACT_APP_BACKEND_URL`   | `https://<your-railway-domain>` (no trailing slash)     |

4. **Deploy.** You'll get a URL like `scholarpen.vercel.app`.
5. **Go back to Railway → Variables → update `CORS_ORIGINS`** to your Vercel domain
   (comma-separated for multiple, or `*` for no restriction in dev only).
   Re-deploy the Railway service so CORS picks up.

---

## Step 6 · Smoke test

1. Visit `https://<your-vercel-domain>` → you should be redirected to `/login`.
2. Click *Create one* → register with email + password → you land on `/dashboard`.
3. Click *New manuscript* → fill in the 5-step wizard → submit → editor opens.
4. Click *Generate* on **Abstract** → after ~15-40 s, an Abstract appears.
5. Scroll to **Results** → click *Data Lab* → upload a CSV → click
   *AI: suggest analyses & figures* → render a box plot → *Insert into section*.
6. Click **Export → PDF** → numbered manuscript downloads.

If anything is off, see *Troubleshooting* below.

---

## Local development

### Option A — Docker (single command)

```bash
cd scholarpen
echo "JWT_SECRET=$(openssl rand -hex 48)" > .env
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env
docker compose up --build
# API at http://localhost:8001  ·  Mongo at localhost:27017
```

Then, in another terminal, run the frontend:

```bash
cd frontend
cp .env.example .env       # already points to http://localhost:8001
yarn install
yarn start
```

### Option B — Plain Python + Node (recommended for active dev)

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env       # fill in MONGO_URL, ANTHROPIC_API_KEY, JWT_SECRET
uvicorn server:app --reload --port 8001
```

```bash
# Frontend
cd frontend
cp .env.example .env       # REACT_APP_BACKEND_URL=http://localhost:8001
yarn install && yarn start
```

You need a local MongoDB. The simplest way is:

```bash
docker run -d --name mongo -p 27017:27017 mongo:7
```

…or use your Atlas connection string in `backend/.env` even for local dev.

---

## API surface (reference)

All endpoints are prefixed with `/api`. JWT bearer required for everything
except `/auth/register`, `/auth/login`, `/`.

| Method | Path                                                      | Purpose                                  |
| ------ | --------------------------------------------------------- | ---------------------------------------- |
| POST   | `/auth/register`                                          | Create user                              |
| POST   | `/auth/login`                                             | Issue JWT                                |
| GET    | `/auth/me`                                                | Current user                             |
| POST   | `/auth/logout`                                            | No-op (drop the token client-side)       |
| GET    | `/sections/catalog`                                       | The 18 manuscript section keys           |
| GET    | `/manuscripts`                                            | List my manuscripts                      |
| POST   | `/manuscripts`                                            | Create new manuscript                    |
| GET    | `/manuscripts/{id}`                                       | Read one                                 |
| PATCH  | `/manuscripts/{id}`                                       | Update inputs / section overrides        |
| DELETE | `/manuscripts/{id}`                                       | Delete                                   |
| POST   | `/manuscripts/{id}/sections/{key}/generate`               | Generate a section with Claude           |
| POST   | `/manuscripts/{id}/sections/{key}/chat`                   | Chat / refine a section                  |
| POST   | `/manuscripts/{id}/datalab/upload`                        | Upload a CSV/Excel dataset (multipart)   |
| POST   | `/manuscripts/{id}/datalab/suggest`                       | AI suggested analyses + figures          |
| POST   | `/manuscripts/{id}/datalab/plot`                          | Render a matplotlib plot, returns PNG b64|
| GET    | `/manuscripts/{id}/datalab/datasets`                      | List uploaded datasets                   |
| POST   | `/manuscripts/{id}/figure/critique`                       | Vision critique of a figure image        |
| GET    | `/references/search?q=…`                                  | Crossref DOI search                      |
| GET    | `/manuscripts/{id}/export?format=md\|docx\|pdf`           | Export numbered manuscript               |

---

## Environment variables (summary)

### Backend (`backend/.env`)

| Variable                    | Required | Description                                                 |
| --------------------------- | -------- | ----------------------------------------------------------- |
| `MONGO_URL`                 | ✅       | MongoDB connection string                                   |
| `DB_NAME`                   |          | Database name (default `scholarpen`)                        |
| `JWT_SECRET`                | ✅       | Long random string for JWT signing                          |
| `JWT_EXPIRY_DAYS`           |          | Token lifetime (default `7`)                                |
| `ANTHROPIC_API_KEY`         | ✅       | From <https://console.anthropic.com>                        |
| `ANTHROPIC_MODEL`           |          | Override model (default `claude-opus-4-5-20251101`)         |
| `ANTHROPIC_VISION_MODEL`    |          | Override vision model                                       |
| `LLM_MAX_TOKENS_LONG`       |          | Max tokens for long generations (default `8000`)            |
| `LLM_MAX_TOKENS_CHAT`       |          | Max tokens for chat replies (default `4000`)                |
| `CORS_ORIGINS`              |          | Comma-separated allowed origins (default `*`)               |
| `CROSSREF_CONTACT_EMAIL`    |          | Polite contact header for the Crossref API                  |
| `SCHOLARPEN_UPLOAD_ROOT`    |          | Path for uploaded datasets (default `./_uploads`)           |

### Frontend (`frontend/.env`)

| Variable                  | Required | Description                                                 |
| ------------------------- | -------- | ----------------------------------------------------------- |
| `REACT_APP_BACKEND_URL`   | ✅       | Base URL of the deployed backend (no trailing slash)        |

---

## File-storage caveat (Data Lab uploads)

The Data Lab writes uploaded CSV/Excel files to `SCHOLARPEN_UPLOAD_ROOT`
(`./_uploads` by default). **On most free PaaS plans the filesystem is
ephemeral** — files are lost on every deploy/restart. Options:

| Need                          | Solution                                                                 |
| ----------------------------- | ------------------------------------------------------------------------ |
| Just want it to work          | Re-upload after restart; the manuscript document tracks dataset metadata |
| Persistent storage on Railway | Add a **Volume** (Settings → Volumes → mount to `/data`) and set `SCHOLARPEN_UPLOAD_ROOT=/data` |
| Cloud object storage          | Replace `save_dataset` / `find_dataset_path` in `datalab.py` with S3 / Cloudinary / Supabase Storage |

The MongoDB document and any inserted plot images (embedded as base64) survive
restarts regardless — only the original raw CSV is at risk.

---

## Switching LLM provider

The whole codebase calls only three functions:
`llm.generate_text(...)`, `llm.chat_text(...)`, `llm.vision_text(...)`.
Swap `backend/llm.py` for an OpenAI / Gemini / Mistral implementation that
exposes the same signatures and the rest of the app continues to work.

---

## Troubleshooting

| Symptom                                              | Likely cause / fix                                                                 |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `RuntimeError: ANTHROPIC_API_KEY not set`            | Add `ANTHROPIC_API_KEY` in Railway → Variables and redeploy                        |
| `CORS error` in browser console                      | `CORS_ORIGINS` in Railway must contain your Vercel domain (no trailing slash)      |
| `502` from `/api/manuscripts/.../generate`           | Anthropic rate limit or invalid key — check Railway logs                           |
| First Render request takes 30 s                      | Free Render dynos sleep after 15 min — switch to Railway hobby or Fly.io           |
| `MongoDB ServerSelectionTimeoutError`                | Atlas Network Access does not include the deploy host — temporarily allow `0.0.0.0/0` |
| Build fails: `gcc not found`                         | If using a custom Docker image, add `build-essential` (already present in the supplied Dockerfile) |
| Data Lab plot rendering fails on Vercel              | Plots are rendered on the **backend** (Railway). Vercel never runs matplotlib.     |

---

## Security notes

* JWT secret must be > 32 random bytes. Rotate on suspicion of leak — all tokens
  invalidate.
* The Anthropic key is held only on the backend; the React bundle never sees it.
* For multi-tenant production: add password reset, rate-limiting (e.g. SlowAPI),
  audit logging, and consider per-user usage caps on Anthropic spend.

---

## Roadmap

* Streaming (SSE) responses for long section generation.
* Per-section version history & diff view.
* One-click "insert citation" into the active section from Crossref results.
* LaTeX export.
* Multi-author shared manuscripts.

---

## License

MIT — do whatever you want; attribution appreciated but not required.

Built originally as an iteration of *ManuscriptForge*, repackaged as ScholarPen
for portable self-hosting.
