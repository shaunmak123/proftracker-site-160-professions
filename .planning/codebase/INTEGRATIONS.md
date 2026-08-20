# External Integrations

**Analysis Date:** 2026-08-20

## APIs & External Services

**Fonts:**
- Google Fonts CDN — `https://fonts.googleapis.com` / `https://fonts.gstatic.com`
  - Loaded via `<link rel="preconnect">` + stylesheet `<link>` on every page: `site/index.html:8-10`, `site/catalog.html:7-9`, `site/my.html:7-9`, and the same block templated into every generated `site/p/<slug>.html` (see `build.js:223-225`)
  - Families: Montserrat (600, 700), Roboto (400, 700), Roboto Mono (400, 700)
  - No API key, no auth — public font-serving endpoint only

**Social:**
- VKontakte community link — `https://vk.ru/proftreker`
  - Outbound link only (`<a target="_blank">`), no VK API/SDK integration, no VK auth, no widgets
  - Present in the top brand bar on `site/index.html:20`, `site/catalog.html:22`, `site/my.html:22`, and templated into every profession page (`build.js:238`)

**Browser Web APIs (not external services, but worth noting as integration points):**
- `navigator.share` (Web Share API) — used in `site/app.js:101-110` (`share()` function) for the "Поделиться" (Share) button; falls back to `navigator.clipboard.writeText` if unavailable, and to a silent failure if clipboard access also fails.

## Data Storage

**Databases:**
- None. There is no database of any kind (no SQL, no NoSQL, no ORM).

**File Storage:**
- Local filesystem only. All content (`site/data/professions.json`, profession photos in `site/assets/img/photos/*.png`, brand SVG logos in `site/assets/img/`) is committed to the repo and served as static files. No cloud storage (S3, Cloudinary, etc.) is used.

**Caching:**
- None server-side. `dev-server.js:31` explicitly sets `Cache-Control: no-store` on every response to guarantee fresh content during local development. No service worker, no CDN caching config in-repo (would be host-dependent in production, but nothing is configured here).

**Client-side persistence:**
- `localStorage` only, via `site/app.js` — three keys: `proftreker:bookmarks` (array of profession slugs), `proftreker:recent` (LRU list, max 20, most-recently-viewed slugs), `proftreker:mycard` (single slug set once on first visit). No cookies, no IndexedDB, no server-synced state. This is a deliberate product constraint: no accounts, no login, no cross-device sync (see `02_sources/extracted/design_handoff_professions_catalog/README.md:12`, "не требует регистрации").

## Authentication & Identity

**Auth Provider:**
- None. The site has no login, no accounts, no sessions. Per the design handoff doc (`02_sources/extracted/design_handoff_professions_catalog/README.md`), this is an explicit product decision — all personalization (bookmarks, recently-viewed, "my card") lives only in the visiting browser's `localStorage`.

## Monitoring & Observability

**Error Tracking:**
- None. No Sentry, no error-reporting SDK, no analytics beacon of any kind detected in any HTML/JS file.

**Logs:**
- `console.log` only, and only in build/dev tooling, not in the shipped site: `build.js:447` logs the count of generated pages after a build run; `dev-server.js:35-36` logs the local server URL and a stop instruction on startup. No client-side logging or telemetry ships to end users.

## CI/CD & Deployment

**Hosting:**
- Not configured in-repo. No deployment config (no `netlify.toml`, `vercel.json`, GitHub Pages workflow, Dockerfile, or nginx config found). The project is prepared for static hosting (see STACK.md) but the actual hosting target is not yet wired up.

**CI Pipeline:**
- None. No `.github/workflows/`, no other CI config found anywhere in the repo.

## Environment Configuration

**Required env vars:**
- None. No `.env` files, no environment-variable reads in any `.js` file (`build.js`, `dev-server.js`, `site/app.js` all use hardcoded values only, e.g. port `8081` in `dev-server.js:8`).

**Secrets location:**
- Not applicable — there are no secrets, API keys, or credentials anywhere in this codebase. Everything served is public content (profession data, images, brand logos).

## Webhooks & Callbacks

**Incoming:**
- None. There is no server-side application logic to receive webhooks; `dev-server.js` is a pure static file server with no routing beyond path-to-file resolution.

**Outgoing:**
- None. No outbound webhook calls, no third-party API calls from build or runtime code beyond the passive Google Fonts `<link>` tags and the VK outbound hyperlink noted above.

## Notable Absence: Excel Data Pipeline

The canonical data source for professions is `site/data/professions.json` (read directly by both `build.js` and `site/app.js`). A companion `data/professions.xlsx` — described in `02_sources/extracted/design_handoff_professions_catalog/README.md:190` as "та же таблица в виде одного листа на 160 строк, для редактирования заказчиком. JSON пересобирается из неё" (the client-editable master, from which the JSON is "rebuilt") — exists only as a reference copy at `02_sources/extracted/design_handoff_professions_catalog/data/professions.xlsx`. **No script in this repo performs the xlsx→JSON conversion** (no `xlsx`/`exceljs`/`SheetJS` dependency, no conversion script found via repo-wide search). In the current codebase, `site/data/professions.json` is the de facto source of truth and appears to be maintained/edited directly (git history shows commits editing profession records, e.g. `2ab6089 Replace "Диктор телевидения" with "Главный редактор" (id 129)`, `77e859d Substantially expand profession descriptions across all 160 records`). Any future xlsx round-trip tooling would be a new integration, not an existing one.

---

*Integration audit: 2026-08-20*
