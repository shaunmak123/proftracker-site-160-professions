<!-- refreshed: 2026-08-20 -->
# Architecture

**Analysis Date:** 2026-08-20

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                    BUILD TIME (Node, no deps)                │
│  `build.js` reads `site/data/professions.json` and renders   │
│  one static HTML file per profession into `site/p/`.         │
└──────────────────────────┬────────────────────────────────────┘
                            │ writes 160 files
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     STATIC SITE OUTPUT                       │
│                        `site/`                                │
├──────────────────┬──────────────────┬───────────────────────┤
│  Entry pages      │  Generated pages │   Shared assets       │
│  index.html        │  p/*.html (160)  │   styles.css, app.css,│
│  catalog.html       │  (from build.js) │   page.css, app.js,   │
│  my.html            │                  │   assets/*            │
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │                  │                     │
         ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│           CLIENT RUNTIME (browser, no build step)            │
│  Every page loads `app.js` (`window.ProfTrekerSite`), which  │
│  fetches `data/professions.json` at runtime for search,      │
│  catalog listing, and profession lookups.                    │
└──────────────────┬──────────────────────────────────────────┘
                    │ localStorage
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  Browser localStorage: bookmarks, recent, "my card"          │
│  Keys: `proftreker:bookmarks`, `proftreker:recent`,           │
│  `proftreker:mycard`                                          │
└─────────────────────────────────────────────────────────────┘
```

Serving in development is done by `dev-server.js`, a zero-dependency static file server for the `site/` directory (port 8081). There is no production server component — the whole `site/` tree is deployable as static files to any host/CDN.

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Page generator | Reads `professions.json`, renders per-profession HTML | `build.js` |
| Dev file server | Serves `site/` over HTTP for local preview, no caching | `dev-server.js` |
| Launcher script | Starts dev server + opens browser (Windows) | `Открыть сайт (Вариант 2 - Личное дело).bat` |
| Shared client runtime | Data fetching/caching, search, localStorage, share | `site/app.js` |
| Entry / search screen | QR landing page, name search, random pick | `site/index.html` |
| Industry catalog screen | Accordion list of 17 industries × professions | `site/catalog.html` |
| "My professions" screen | Bookmarks + recently viewed, from localStorage | `site/my.html` |
| Profession detail pages (generated) | One page per profession (160 files) | `site/p/*.html` |
| Base/shared styles | Design tokens, layout primitives, shared components | `site/styles.css` |
| Screen-specific styles | Start/catalog/my-page layout rules | `site/app.css` |
| Profession-page styles | Layout rules specific to generated detail pages | `site/page.css` |
| Canonical data | 160 professions + 17 industries, source of truth for build and runtime | `site/data/professions.json` |
| Static assets | Fonts (EVRAZ), logos, character illustrations, per-profession photos | `site/assets/` |

## Pattern Overview

**Overall:** Static-site generation (SSG) via a hand-rolled Node script, paired with a thin client-side "single shared data file + vanilla JS" runtime. No frameworks, no bundler, no npm dependencies (`package.json` does not exist).

**Key Characteristics:**
- Two-phase system: (1) build-time HTML generation for the 160 profession detail pages only; (2) the three hub pages (`index.html`, `catalog.html`, `my.html`) are hand-written static HTML that hydrate themselves client-side by fetching the same JSON.
- Single canonical data source (`site/data/professions.json`) is read both by `build.js` (Node, at build time) and by `app.js` (browser `fetch`, at runtime) — the same file serves two different consumers.
- No client-side router, no virtual DOM, no state management library. All interactivity is imperative DOM manipulation scoped inside IIFEs per page.
- Personalization (bookmarks, recently viewed, "my card") is entirely client-side via `localStorage`; there is no backend, no accounts, no server-side persistence anywhere in the system.
- Templating is done via native JS template literals in `build.js` (`renderPage(p)` returns a full HTML document string) — no templating engine.

## Layers

**Build layer:**
- Purpose: Transform structured JSON data into static, self-contained HTML documents.
- Location: `build.js`
- Contains: Data loading, text-normalization/parsing helpers (education codes, clothing/SIZ/footwear splitting), HTML template rendering, file writing.
- Depends on: `site/data/professions.json`, presence of photo files in `site/assets/img/photos/`.
- Used by: Run manually via `node build.js`; output consumed by the client runtime and dev server.

**Client runtime layer:**
- Purpose: Provide shared behavior (search, bookmarks/history, sharing, UI widgets) across all pages without a build step.
- Location: `site/app.js`, inlined `<script>` blocks in each HTML page.
- Contains: `window.ProfTrekerSite` namespace — data fetch/cache, Levenshtein-based fuzzy search, localStorage read/write helpers, `initSearch`/`initIndustryAccordion` UI wiring.
- Depends on: `site/data/professions.json` (fetched at runtime), browser `localStorage`, `navigator.share`/`navigator.clipboard`.
- Used by: `index.html`, `catalog.html`, `my.html`, and every generated `p/*.html` page.

**Presentation layer:**
- Purpose: Visual structure and styling, shared across static and generated pages.
- Location: `site/styles.css` (base/shared), `site/app.css` (hub-page screens), `site/page.css` (profession detail pages).
- Contains: CSS custom properties (design tokens), layout rules, component classes (`.btn`, `.tag`, `.sec`, `.wear-row`, etc.).
- Depends on: Google Fonts (Montserrat/Roboto/Roboto Mono, loaded via `<link>`), EVRAZ brand fonts in `site/assets/fonts/`.
- Used by: All HTML pages via `<link rel="stylesheet">`.

**Dev-serving layer:**
- Purpose: Local preview without any external tooling.
- Location: `dev-server.js`
- Contains: Minimal `http.createServer` file server with a MIME-type lookup table, no-cache headers.
- Depends on: Node built-ins only (`http`, `fs`, `path`).
- Used by: Developer via `node dev-server.js`, or the `.bat` launcher on Windows.

**Source-material layer (not shipped):**
- Purpose: Raw inputs and reference material that inform (but are not directly consumed by) the build.
- Location: `00_входящие/`, `01_professions/`, `02_sources/`, `03_brandbook/`, `04_документы_гранта/`, `05_презентации/`
- Contains: Design handoff docs/wireframes, brand assets, grant paperwork, profession card images/archives.
- Depends on: Nothing (static reference files: PDFs, zips, images, brandbook exports).
- Used by: Human maintainers when updating `site/data/professions.json` or `site/assets/`; not read by any script at build or runtime.

## Data Flow

### Build-time page generation

1. `build.js` loads `site/data/professions.json` into memory and indexes professions by `slug` (`build.js:22-24`).
2. For each profession, per-field text-normalization helpers run: `eduRows()` splits "Где учиться" text into rows by FGOS code (`build.js:149-165`), `splitClothingSiz()`/`splitFootwear()` split raw clothing/PPE text into itemized lists and classify clothing vs. protective equipment by regex (`build.js:167-194`, `128-140`).
3. `renderPage(p)` (`build.js:210-438`) builds a full HTML document as a template literal, embedding escaped profession fields, computed lists, and a per-page inline `<script>` that wires up bookmark/share buttons via `window.ProfTrekerSite`.
4. Each rendered page is written to `site/p/<slug>.html` (`build.js:440-447`). Existing files are overwritten on every run; the script is idempotent and safe to re-run after data changes.
5. Photo presence is checked per-slug against `site/assets/img/photos/<slug>.png` (`hasPhoto()`, `build.js:12-14`); if missing, a placeholder block is rendered instead — no build failure occurs for missing photos.

### Runtime page load (any page)

1. Browser loads static HTML (either hand-written hub page or a generated `p/*.html`).
2. Page's inline `<script>` sets `window.SITE_ROOT` (relative path prefix) then loads `app.js`.
3. `app.js` exposes `window.ProfTrekerSite`; on first call to `loadData()`, it `fetch()`es `data/professions.json` and memoizes the promise (`site/app.js:12-18`) — this happens once per page load, not once globally (no cross-page cache; every navigation re-fetches).
4. Page-specific inline script calls into `ProfTrekerSite` (e.g., `initSearch`, `readBookmarks`, `toggleBookmark`) to populate the DOM and wire interactions.

### Search flow

1. User types in a search `<input>`; `initSearch()` (`site/app.js:114-172`) debounces input by 150ms.
2. `searchProfessions(query, professions, limit)` (`site/app.js:47-72`) scores matches: exact-prefix substring match scores best, substring-anywhere next, then Levenshtein distance (≤2) against the first N characters of each word in the profession name, for typo tolerance.
3. Matching results render as a suggestion list; selection (click/Enter/arrow keys) navigates to `p/<slug>.html`.

**State Management:**
- No in-memory app state beyond each page's own closures (IIFE scope). Persistent state (bookmarks, recently-viewed slugs, "my card" slug) lives exclusively in `localStorage` under fixed keys and is read/written through helper functions in `app.js` (`readBookmarks`, `toggleBookmark`, `readRecent`, `pushRecent`, `getMyCard`, `setMyCard`).

## Key Abstractions

**`ProfTrekerSite` namespace (`window.ProfTrekerSite`):**
- Purpose: Single global object exposing all shared client behavior so every static/generated page can use it without imports or a bundler.
- Examples: `site/app.js:184-199` (export list), consumed in `site/index.html:79-97`, `site/catalog.html:61-96`, `site/my.html:82-105`, and the inline script at the bottom of every generated `site/p/*.html`.
- Pattern: IIFE module pattern attaching a single object to `window`; no ES modules.

**Profession record (`professions.json` `professions[]` entries):**
- Purpose: Canonical unit of content — one object per profession, shared schema consumed identically by build and runtime.
- Fields: `id`, `industry`, `name`, `short`, `activity`, `description`, `product`, `equipment`, `clothing`, `footwear`, `salary`, `education`, `employers`, `similar[]`, `image`, `contentStatus`, `slug`.
- Examples: `site/data/professions.json`.
- Pattern: Flat, mostly free-text Russian strings; multi-value fields (equipment, employers) are semicolon/comma/newline-delimited strings parsed by regex-based splitters in `build.js`, not structured arrays (except `similar`, which is a JSON array of profession names resolved to slugs via name-lookup, `similarLinks()` in `build.js:200-208`).

**Industry record (`professions.json` `industries[]` entries):**
- Purpose: Groups professions for the catalog accordion view; `count` is a denormalized total, recomputed live client-side from `professions[]` on the catalog page rather than trusted from the JSON (`site/catalog.html:63-70`).

**Text-splitting parsers (`build.js`):**
- Purpose: Normalize inconsistent free-text spreadsheet input (wrapped lines, mixed delimiters, orphan connectors like "или") into clean itemized lists for display.
- Examples: `joinWrappedLines()`, `mergeOrphanConnectors()`, `splitFootwear()`, `splitClothingSiz()`, `eduRows()` (`build.js:93-208`).
- Pattern: Regex-driven heuristics tuned to the specific quirks of the source Excel export; heavily commented in Russian explaining each edge case.

## Entry Points

**`build.js`:**
- Location: repo root
- Triggers: Manual run via `node build.js`; must be re-run after any edit to `site/data/professions.json` or after adding/removing photos in `site/assets/img/photos/`.
- Responsibilities: Regenerate all 160 files in `site/p/`.

**`dev-server.js`:**
- Location: repo root
- Triggers: Manual run via `node dev-server.js`, or via the `.bat` launcher.
- Responsibilities: Serve `site/` on `http://localhost:8081` with no-cache headers for live iteration; 404s on missing files.

**`site/index.html` (browser entry point):**
- Location: `site/index.html`
- Triggers: Loaded directly (e.g., via QR code) or navigated to from other pages.
- Responsibilities: Search-by-name landing screen; entry into `catalog.html` or a random profession page.

## Architectural Constraints

- **Threading:** Single-threaded throughout — `build.js` and `dev-server.js` are synchronous/simple-async Node scripts; the browser runtime has no workers.
- **Global state:** `window.ProfTrekerSite` (`site/app.js`) is a module-level singleton attached to `window`; `window.SITE_ROOT` is set per-page as a global before `app.js` loads to make relative data-fetch paths work identically from `site/` root and `site/p/` subdirectory.
- **No build tool for hub pages:** `index.html`, `catalog.html`, `my.html` are hand-maintained static HTML, not generated by `build.js` — only the 160 profession detail pages under `site/p/` are generated. Editing search/catalog/my-page markup means editing those files directly.
- **Data/build coupling:** `build.js` reads `site/data/professions.json` directly; there is no script in this repo that regenerates that JSON from the source Excel file (`02_sources/extracted/design_handoff_professions_catalog/data/professions.xlsx`). The JSON is the de facto source of truth for the live site; the `.xlsx` is reference/original material only.
- **No package manifest:** No `package.json`/lockfile exists — the project intentionally has zero npm dependencies (per header comment in `build.js`). Any future dependency addition changes this constraint.

## Anti-Patterns

### Inline `<script>` blocks duplicated per page

**What happens:** Each generated profession page (`build.js:401-433`) and each hub page (`index.html`, `catalog.html`, `my.html`) embeds its own bootstrapping `<script>` inline rather than sharing a single page-specific JS file.
**Why it's wrong:** Logic changes to bookmark/share wiring must be made inside the `build.js` template literal (affecting all 160 generated pages) and separately, identically, in each hand-written hub page — drift between them is easy to introduce.
**Do this instead:** When modifying shared per-page bootstrap behavior, update `build.js`'s `renderPage()` template AND cross-check the equivalent inline scripts in `index.html`/`catalog.html`/`my.html` for the same pattern.

### Regex-based free-text parsing as the data model

**What happens:** Structured concepts (clothing vs. PPE, footwear items, education rows) are derived at render time from loosely-formatted free-text spreadsheet strings via regex heuristics (`build.js:128-208`).
**Why it's wrong:** Any new profession entered with slightly different punctuation/wording in `professions.json` can silently misclassify (e.g., an item lands in "clothing" instead of "SIZ") with no validation step.
**Do this instead:** When adding/editing profession data, follow the exact punctuation conventions already used in existing entries (comma/semicolon-separated, newline-separated lists, capitalized item starts) so the existing regexes classify correctly; when adding new keyword variants, update `SIZ_RE`/`NOT_SIZ_RE` in `build.js:173-174`.

## Error Handling

**Strategy:** Minimal/defensive, not exception-driven. Errors mostly degrade to placeholders rather than throwing.

**Patterns:**
- `build.js` has no try/catch — a malformed `professions.json` or missing file will crash the build with a raw Node stack trace (fail-fast, acceptable for a manually-run local build script).
- `dev-server.js` catches file-read errors and returns a `404` with a plain-text Russian message (`dev-server.js:26-27`) instead of crashing the server.
- `site/app.js` localStorage helpers wrap `JSON.parse`/`localStorage` calls in try/catch and fall back to `[]`/`null` (`site/app.js:74-77, 98`), tolerating private-browsing/storage-disabled environments.
- Missing photo/caption assets are handled via `fs.existsSync` checks at build time with inline placeholder markup, never a build failure (`build.js:12-20, 256-260, 281-285`).

## Cross-Cutting Concerns

**Logging:** `console.log` only — `build.js` prints a page count on completion (`build.js:447`); `dev-server.js` prints the listen URL on startup (`dev-server.js:35-36`). No structured logging, no log levels.
**Validation:** No schema validation for `professions.json` anywhere in the pipeline; correctness depends on the source spreadsheet/JSON being well-formed and consistent with the regex-based parsers in `build.js`.
**Authentication:** None — the entire product is unauthenticated, static content with browser-local personalization only.
**Internationalization:** None — content, markup, and comments are Russian-only (`lang="ru"` hardcoded in every page); no i18n layer.

---

*Architecture analysis: 2026-08-20*
