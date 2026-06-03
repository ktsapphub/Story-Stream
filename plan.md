# Content Studio — Development Plan

## 1. Objectives
- Prove the **core AI content pipeline** works end-to-end in isolation: multi-provider text gen → batch 5–10 → Nano Banana images → quality scoring → blog→newsletter transform.
- Build a V1 full-stack app (React + FastAPI + MongoDB + shadcn/ui) around the proven core with: editors, media insertion (upload/URL/embed/AI image), knowledge base (URLs + uploads), and exports (HTML/MD/WP-ready/CSV/PDF/TXT).
- Ensure UX + styling feels cohesive with **My Date Jar** (warm, inviting, premium, modern).

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
- Layout + theme aligned to My Date Jar tone (design_agent to finalize palette/typography).
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
1. ~~Run Phase 1 web research for emergentintegrations + Nano Banana patterns.~~ DONE
2. ~~Implement `test_core.py` and iterate until all acceptance checks pass.~~ DONE (7/7 passed)
3. ~~After POC success, implement Phase 2 V1 backend+frontend in one cohesive build.~~ DONE
4. Execute V1 end-to-end tests and fix until stable. (IN PROGRESS)
5. Ask for approval before adding auth (Phase 3).

## STATUS LOG
- Phase 1 POC: COMPLETE (7/7).
- Phase 2 Backend + Frontend: COMPLETE, tested 94%.
- Phase 3 (Auth + Design Refresh): COMPLETE, tested 98.5%.
- Phase 3.1 (Rebrand): buttons black, heart logo removed, all brown replaced with #835ef5 (purple).
- Phase 4 (New features): COMPLETE, tested 98.4% (frontend 100%).
  - Knowledge-base TOPIC SELECTOR (type-or-select) on Blog + Newsletter generators; selected topics steer generation (GET /api/knowledge/topics; topics/focus_topics fields on generate endpoints).
  - Stock media search (Pexels + Pixabay + Unsplash) in the Insert-media dialog AND header picker: GET /api/stock/providers, GET /api/stock/search. Keys read from env (PEXELS_API_KEY/PIXABAY_API_KEY/UNSPLASH_ACCESS_KEY) \u2014 currently EMPTY, so UI shows a 'needs API key' state and search returns 400 until keys are added.
  - Stock picks embed the external provider URL (with attribution); 'From URL' tab also supports Cloudinary image/video links.
  - Hardened LLM JSON parsing with repair + 1 retry to fix intermittent malformed-JSON generations.
- NEXT (optional / on user request): add stock API keys to enable search; live WordPress publishing; Google login. Reminder: set ENABLE_TEST_BYPASS=false before production.

---

## 4. Success Criteria
- **POC:** All 3 LLM providers return schema-valid JSON; 5-item batch completes; Nano Banana generates images; scoring + transform return valid JSON.
- **V1:** User can generate/edit/score/transform content, insert media (upload + URL embeds + AI images), use knowledge sources, and export to HTML/MD/WP-ready/CSV/PDF/TXT.
- **Reliability:** Batch generation shows per-item results and handles partial failures with retry.
- **Brand cohesion:** UI feels consistent with My Date Jar tone and styling.
- **Testing:** Each phase ends with a successful end-to-end run and no core regressions.
