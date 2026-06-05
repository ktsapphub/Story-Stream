# Content Studio — Development Plan (Updated)

## 1. Objectives
- Maintain a reliable **core AI content pipeline** end-to-end: multi-provider text gen → batch generation → AI images (Nano Banana) → quality scoring → blog→newsletter transform.
- Deliver a cohesive V1+ experience (React + FastAPI + MongoDB + shadcn/ui) with:
  - Studios (Blog + Newsletter), media insertion (upload / AI generate / URL / stock search), exports (CSV/HTML/PDF/TXT/MD), Knowledge Base sources.
- Provide a managed **Knowledge Base Topics repository** that supports:
  - CRUD topic management with descriptions
  - AI-assisted topic derivation (bulk) and per-topic description generation
  - Integration into prompt steering via the existing `TopicSelector`
- Add a **Settings / Connections hub** (Phase 5) that:
  - Shows **platform/tech stack** info
  - Manages API keys + params for integrations (saved in DB, user-scoped) and makes them **live**
  - Supports **show/hide secret** values
  - Supports **connection testing** per provider
  - Shows **usage limits** (live where possible; manual fallback)
- Ensure UI stays consistent with current **My Date Jar** styling constraints:
  - Black primary buttons
  - Purple `#835ef5` accents
  - No old heart logo; no brown/gold tones
- Keep the app English-only for generated/described topic content.

---

## 2. Implementation Steps

### Phase 1 — Core POC (Isolation; must pass before app build)
**Goal:** de-risk all external integrations + structured outputs.

1) **Integration playbook + best practices (web research)**
- Confirm emergentintegrations usage patterns for: multi-provider chat/completions + structured JSON output + image generation with Nano Banana.
- Confirm best practice for: robust JSON parsing/repair, rate limit handling, async batching, and prompt design for deterministic structure.

2) Build `test_core.py` (single script)
- Inputs: prompt(s), model/provider selection per run, batch size (5–10).
- **Text gen (3 providers):** generate blog JSON with fields: `title, slug, meta_description, tags[], excerpt, body_markdown, image_prompts[]`.
- **Batch generation:** asyncio concurrency (bounded semaphore), run 5 items.
- **Image gen:** Nano Banana header image + 1–2 content images from `image_prompts`.
- **Quality scoring:** LLM returns strict JSON: overall score (0–100) + rubric breakdown + actionable suggestions.
- **Transform:** blog JSON → newsletter JSON: `subject, preheader, sections[], cta, excerpt`.

3) Acceptance run + hardening
- Run POC with real prompts and 5-item batch.
- Add retries/backoff, JSON schema validation, and minimal “repair” step if model returns invalid JSON.
- Do not proceed until: all providers succeed + images generated + scores produced + transforms succeed.

**Phase 1 user stories**
1. As a user, I can generate a structured blog draft as valid JSON from a prompt.
2. As a user, I can choose GPT/Claude/Gemini per generation.
3. As a user, I can batch-generate 5 articles concurrently without failures.
4. As a user, I can generate a header + in-article images from Nano Banana.
5. As a user, I can get a numeric quality score with a rubric and improvement suggestions.

---

### Phase 2 — V1 App Development (no auth yet; build around proven core)
**Goal:** deliver working MVP UI + backend for creating/editing/exporting content.

1) Backend (FastAPI)
- Core endpoints (using Phase-1 proven code paths):
  - `POST /generate/blog` (single)
  - `POST /generate/blog/batch` (5–10)
  - `POST /generate/newsletter/from-blog`
  - `POST /score` (blog/newsletter)
- Draft persistence (MongoDB): content items, generation params, model used, assets, status.
- Media endpoints:
  - Upload image/video/gif/doc to object storage
  - Add media by URL (store/embed + optional download)
  - Generate image via Nano Banana
- Knowledge base endpoints:
  - Add URL source → scrape → store cleaned text + metadata
  - Upload docs/text → extract text → store
  - Retrieve sources + include selected sources as reference context in generation
- Export endpoints:
  - HTML, Markdown
  - WP-ready export bundle (markdown/html + featured image refs + frontmatter JSON)
  - CSV export for newsletter entries
  - TXT export
  - PDF export (server-side render from HTML)

2) Frontend (React + shadcn/ui)
- Layout + theme aligned to My Date Jar tone.
- Pages:
  - Dashboard: recent drafts, “New Blog”, “New Newsletter”, “Batch Generate”.
  - Blog Studio: prompt + model picker + batch mode; rich editor; image manager; embeds (YouTube/Giphy); quality panel; save/export.
  - Newsletter Studio: create from blog excerpt or prompt; section editor; quality panel; export (CSV/HTML/PDF/TXT).
  - Knowledge Base: add URL, upload doc, list sources, select sources for generation.
  - Media Library: browse uploaded/generated assets and insert into content.

3) Data flow & state handling
- Background job-style UI for batch: per-item progress, partial failures, retry button.
- Ensure content rendering supports: markdown + image blocks + video/gif embeds.

4) V1 testing
- One end-to-end pass with testing_agent_v3: generate → edit → add media → score → transform → export.

**Phase 2 user stories**
1. As a user, I can generate a blog post (single or batch 5–10) and see each result separately.
2. As a user, I can edit title/body/tags/meta and insert images/videos/gifs into the content.
3. As a user, I can add knowledge sources (URL or document) and use them to guide generation.
4. As a user, I can transform a blog post into a newsletter entry and edit it.
5. As a user, I can export blog/newsletter content as HTML, Markdown/WP-ready, PDF, CSV, or TXT.

---

### Phase 3 — Add Auth + Content Library polish
**Goal:** make it multi-user and safer without breaking core.

1) Auth (FastAPI)
- Email/password signup/login, JWT, password hashing.
- User-scoped data access for drafts, assets, knowledge base.
- Optional: Google login as follow-up if requested.

2) Content Library + governance
- Library filters (type/status/model/date), version history, duplicate, archive.
- Export history + re-download.

3) Hardening + quotas
- Per-user rate limiting, batch concurrency caps, max upload sizes.

4) Phase testing
- testing_agent_v3: multi-user isolation + core flows still pass.

**Phase 3 user stories**
1. As a user, I can sign up/login and only see my own content.
2. As a user, I can manage a library of drafts and newsletters with filters.
3. As a user, I can view export history and re-export quickly.
4. As a user, batch generation remains reliable under my account limits.
5. As a user, my uploads and knowledge sources persist and are reusable.

---

### Phase 4 — Publishing integrations (export-first, then connect live)
**Goal:** enable real publishing workflows while keeping exports stable.

1) WordPress live publish (optional, later)
- Add WP connection settings, app password flow.
- `Publish` action mapping: title/body/featured image/tags/meta.

2) React subdomain publishing (optional)
- Generate static bundle or JSON for a simple renderer app.

3) Final regression testing
- Ensure exports remain identical; publishing is additive.

**Phase 4 user stories**
1. As a user, I can connect WordPress and publish a draft directly.
2. As a user, I can preview exactly what will publish before posting.
3. As a user, I can publish to a React subdomain site via an exportable package.
4. As a user, I can roll back to a previous version if publish formatting is wrong.
5. As a user, I can keep using export-only workflows if I don’t connect integrations.

---

### Phase 5 — Settings / Connections Hub (NEW)
**Goal:** centralize platform info and make integrations manageable per logged-in user.

#### 5.1 Scope and UX
- Accessible to **any logged-in user** (`/settings`).
- Sections:
  1) **Platform / Tech Stack**
     - Frontend: React + Tailwind + shadcn/ui
     - Backend: FastAPI
     - Database: MongoDB
     - LLM: Emergent (OpenAI/Anthropic/Gemini) + Nano Banana image gen
     - Storage + export stack (as currently implemented)
  2) **Connections** (grouped cards with status badges)
     - AI / LLM: Emergent universal key (likely read-only or optional override; see implementation)
     - Stock images: Pexels, Pixabay, Unsplash
     - Publishing: WordPress (site URL, app password, username)
     - Automation/Email (initial placeholders + schema): Zapier, SendGrid, ReachInbox (and extensible registry)

- Each connection card supports:
  - Enable/disable
  - Inputs for parameters (provider-specific)
  - Secret fields with **show/hide** toggle
  - Save → persists in DB → becomes **live** immediately
  - Test connection button (runs backend check)
  - Usage/limits:
    - Live where available (e.g., provider rate-limit headers)
    - Manual fallback fields (plan limits/notes)

#### 5.2 Backend (FastAPI + MongoDB)
**Collections**
- `settings_connections` (new)
  - `id`, `owner`
  - `provider` (e.g., `pexels`, `unsplash`, `pixabay`, `wordpress`, `zapier`, `sendgrid`, `reachinbox`, `emergent`)
  - `enabled` (bool)
  - `config` (dict of params)
  - `secrets` (dict of secret values) — stored server-side; never returned in full
  - `masked` (dict of masked secrets) — returned to UI (e.g., `sk_live_****abcd`)
  - `manual_limits` (dict)
  - `status` (`connected` | `not_configured` | `error`)
  - `last_tested_at`, `last_error`
  - `usage` (dict: live headers/derived values when available)

**New module**
- `/app/backend/connections.py`
  - Connection registry (metadata):
    - provider key, category, label, fields, which are secrets, supports_test, supports_usage
    - env fallback mapping (for migration / compatibility)
  - `platform_info()` function
  - `mask_secret(value)` helper
  - `run_test(provider, config, secrets)` implementation per provider:
    - Stock providers: make a minimal request and capture rate-limit headers when possible
    - WordPress: validate credentials via WP REST
    - SendGrid: validate via API key check
    - Zapier: webhook ping test (user supplies hook URL) or connection placeholder
    - ReachInbox: placeholder until exact API spec provided
  - `extract_usage(provider, response_headers)` where applicable

**Endpoints**
- `GET /api/settings/platform`
  - Returns stack info + current version/build info.
- `GET /api/settings/connections`
  - Returns list of all providers from registry with per-owner stored config, masked secrets, enabled flag, status, last tested, usage.
- `PUT /api/settings/connections/{provider}`
  - Upserts provider config/secrets, stores encrypted/plain server-side (MVP can store plain; later add encryption-at-rest)
  - Auto-runs `test` after save and stores status + usage.
- `POST /api/settings/connections/{provider}/test`
  - Runs test against currently saved config and returns updated status/usage.
- `DELETE /api/settings/connections/{provider}`
  - Disables and clears stored secrets/config for that provider.

**Refactor: make stock provider keys dynamic (DB-first)**
- Update stock search endpoint path to resolve per-user provider keys:
  - Read keys from `settings_connections` if enabled; fallback to env keys for backward compatibility.
- Refactor `/app/backend/stock.py`:
  - Add `search(provider, query, page, per_page, kind, keys: dict | None = None)`
  - `provider_status(keys)` to compute status from provided keys.
  - Keep current env-based methods for compatibility, but prefer injected keys.

#### 5.3 Frontend (React)
- Add new route + nav:
  - `App.js`: route `/settings`
  - `AppShell.js`: add sidebar item “Settings”

**API client** (`/app/frontend/src/lib/api.js`)
- `getPlatformInfo()`
- `getConnections()`
- `saveConnection(provider, payload)`
- `testConnection(provider)`
- `deleteConnection(provider)`

**Settings Page UI** (`/app/frontend/src/pages/Settings.js`)
- Platform card: tech stack list + build metadata.
- Connections:
  - Grouped sections (LLM, Stock, Publishing, Automation/Email)
  - Each provider card:
    - Enabled switch
    - Editable params fields
    - Secret inputs with show/hide
    - Masked display when hidden
    - Save/Test/Disconnect actions
    - Status badge and “Last tested” timestamp
    - Usage/limits panel (live + manual fields)

#### 5.4 Testing
- Backend tests:
  - Save keys → test endpoint returns connected
  - Stock search uses DB-stored keys (no env required)
  - Masking never returns full secret
- Frontend tests:
  - Settings page loads
  - Show/hide secret works
  - Save triggers test + updates status badge
  - Stock integration becomes live after saving keys

---

## 3. Next Actions

### Completed (Confirmed)
1. ~~Run Phase 1 web research for emergentintegrations + Nano Banana patterns.~~ DONE
2. ~~Implement `test_core.py` and iterate until all acceptance checks pass.~~ DONE
3. ~~Implement Phase 2 V1 backend+frontend in one cohesive build.~~ DONE
4. ~~Implement Phase 3 Auth (JWT) + user scoping.~~ DONE
5. ~~Rebrand UI: black primary buttons, remove heart logo, replace brown with `#835ef5` purple accents.~~ DONE
6. ~~Add Topic Selector (type-or-select) and topic steering in generate endpoints.~~ DONE
7. ~~Add stock media search architecture (Pexels/Pixabay/Unsplash) with mocked “needs API key” state.~~ DONE (blocked on keys)
8. ~~Knowledge Base Topics Management (backend + frontend + testing).~~ DONE
   - Backend: `kb_topics` collection, CRUD endpoints, AI derive + describe endpoints, LLM helpers
   - Frontend: `TopicsManager` UI, integrated into Knowledge Base as `Sources | Topics` tabs
   - `TopicSelector`: enriched dropdown with managed topic descriptions
   - Testing: frontend testing agent **100% pass** (`/app/test_reports/iteration_4.json`), zero bugs

### Current Focus (P0)
- **Phase 5: Settings / Connections Hub**
  - Backend: `connections.py` registry + settings endpoints + DB persistence + masking
  - Refactor stock to use DB-first per-user keys
  - Frontend: `/settings` page UI + nav entry + API client
  - Testing: backend + frontend tests

### Blocked / Waiting
- Nothing blocked once Settings is implemented (keys will be entered in-app).

### Operational reminder
- `ENABLE_TEST_BYPASS` is currently `true` in backend `.env`. Keep for testing; must be set to `false` before production.

---

## STATUS LOG
- Phase 1 POC: COMPLETE.
- Phase 2 Backend + Frontend: COMPLETE.
- Phase 3 (Auth + Design Refresh): COMPLETE.
- Phase 3.1 (Rebrand): COMPLETE (black buttons, heart removed, purple accents).
- Phase 4 (New features): PARTIAL
  - Topic Selector + topic steering: COMPLETE
  - Stock media search: COMPLETE but previously BLOCKED (API keys missing) → will be unblocked via Phase 5 Settings
  - Knowledge Base Topics Management: COMPLETE and tested (iteration_4.json)
- Phase 5 (Settings / Connections Hub): NOT STARTED.

---

## 4. Success Criteria
- **POC:** All 3 LLM providers return schema-valid JSON; 5-item batch completes; Nano Banana generates images; scoring + transform return valid JSON.
- **V1:** User can generate/edit/score/transform content, insert media (upload + URL embeds + AI images), use knowledge sources, and export to HTML/MD/WP-ready/CSV/PDF/TXT.
- **Knowledge Base Topics:**
  - Users can CRUD topics with descriptions
  - Users can AI-derive topics (name + description) from **either KB source OR pasted text**
  - Users can toggle per topic between **User-written** and **AI-derived** description, including regenerate
  - TopicSelector shows merged suggestions and surfaces descriptions for managed topics
  - Feature verified by frontend testing agent (100% pass)
- **Settings / Connections Hub (Phase 5):**
  - `/settings` accessible to any logged-in user
  - Tech stack info displayed
  - Connections can be saved in DB (owner-scoped) and become live
  - Secrets are masked by default; show/hide works
  - Test connection works per provider and persists status
  - Usage limits show live data where available, with manual fallback fields
  - Stock search works using DB-stored keys (no env required)
- **Reliability:** Batch generation shows per-item results and handles partial failures with retry.
- **Brand cohesion:** UI stays consistent with current My Date Jar styling rules (black buttons, purple accents).
- **Testing:** Settings page and connection flows pass backend+frontend tests and do not regress existing studios.