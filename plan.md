# Content Studio — Development Plan (Updated)

## 1. Objectives
- Maintain a reliable **core AI content pipeline** end-to-end: multi-provider text gen → batch generation → AI images (Nano Banana) → quality scoring → blog→newsletter transform.
- Deliver a cohesive V1+ experience (React + FastAPI + MongoDB + shadcn/ui) with:
  - Studios (Blog + Newsletter), media insertion (upload / AI generate / URL / stock search), exports (CSV/HTML/PDF/TXT/MD), Knowledge Base sources.
- Add a managed **Knowledge Base Topics repository** that supports:
  - CRUD topic management with descriptions
  - AI-assisted topic derivation (bulk) and per-topic description generation
  - Integration into prompt steering via the existing `TopicSelector`
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

## 3. Next Actions

### Completed (Confirmed)
1. ~~Run Phase 1 web research for emergentintegrations + Nano Banana patterns.~~ DONE
2. ~~Implement `test_core.py` and iterate until all acceptance checks pass.~~ DONE
3. ~~Implement Phase 2 V1 backend+frontend in one cohesive build.~~ DONE
4. ~~Implement Phase 3 Auth (JWT) + user scoping.~~ DONE
5. ~~Rebrand UI: black primary buttons, remove heart logo, replace brown with `#835ef5` purple accents.~~ DONE
6. ~~Add Topic Selector (type-or-select) and topic steering in generate endpoints.~~ DONE
7. ~~Add stock media search architecture (Pexels/Pixabay/Unsplash) with mocked “needs API key” state.~~ DONE (blocked on user keys)

### Current Focus (P0) — Knowledge Base Topics UI (Frontend-only)
**Context update:** Backend is already implemented and verified working via curl:
- MongoDB `kb_topics` repository
- Endpoints: `GET/POST /api/topics`, `PUT/DELETE /api/topics/{id}`
- AI helpers: `POST /api/topics/derive` (bulk from source_id or pasted text), `POST /api/topics/{id}/describe` (generate/refresh description)
- LLM functions: `derive_topics`, `describe_topic` implemented in `/app/backend/llm_service.py`
- API client functions already exist in `/app/frontend/src/lib/api.js`

**Remaining work = Frontend only**
1. Build `TopicsManager` component (Knowledge Base → Topics)
   - List topics: `name`, `description`, `source` badge (user vs derived)
   - Add topic flow:
     - Input: `name`
     - Toggle per topic: **User-written** vs **AI-derived** description
     - If AI-derived: allow choosing **Knowledge Base source** OR **pasted text** (both supported)
   - Edit topic flow:
     - Edit name/description
     - Toggle **User-written** vs **AI-derived** per topic
     - “Regenerate description” action (calls `/topics/{id}/describe` with optional source)
   - Delete topic action
   - Bulk derive flow:
     - Dialog: choose source OR paste text; choose `count` (1–15)
     - Calls `/topics/derive` and shows added/skipped results
2. Integrate into `KnowledgeBase.js` via top-level tabs:
   - `Sources | Topics`
3. Enrich `TopicSelector`:
   - Keep merging **managed topics** + existing **source-derived suggestions** (already merged in `/api/knowledge/topics`)
   - Add descriptions to the dropdown UI by loading managed topics list (`GET /api/topics`) and showing description for matching suggestion names
4. Testing
   - Frontend testing agent run:
     - Add/edit/delete topics
     - Derive topics from source and from pasted text
     - Regenerate a topic description
     - Confirm TopicSelector displays descriptions and still allows custom add
   - Backend smoke check as part of UI tests (ensure endpoints are used correctly)

### Blocked / Waiting
- Stock image providers: requires user to supply API keys in `.env` (`PEXELS_API_KEY`, `PIXABAY_API_KEY`, `UNSPLASH_ACCESS_KEY`).

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
  - Stock media search: COMPLETE but BLOCKED (API keys missing)
  - **Knowledge Base Topics Management:**
    - Backend + DB + LLM: COMPLETE and verified via curl
    - Frontend UI: NOT STARTED (this is the current work)

---

## 4. Success Criteria
- **POC:** All 3 LLM providers return schema-valid JSON; 5-item batch completes; Nano Banana generates images; scoring + transform return valid JSON.
- **V1:** User can generate/edit/score/transform content, insert media (upload + URL embeds + AI images), use knowledge sources, and export to HTML/MD/WP-ready/CSV/PDF/TXT.
- **Knowledge Base Topics:**
  - Users can CRUD topics with descriptions
  - Users can AI-derive topics (name + description) from **either KB source OR pasted text**
  - Users can toggle per topic between **User-written** and **AI-derived** description, including regenerate
  - TopicSelector shows merged suggestions and surfaces descriptions for managed topics
- **Reliability:** Batch generation shows per-item results and handles partial failures with retry.
- **Brand cohesion:** UI stays consistent with current My Date Jar styling rules (black primary buttons, purple accents).
- **Testing:** New Topics UI flows pass frontend tests and do not regress blog/newsletter generation flows.
