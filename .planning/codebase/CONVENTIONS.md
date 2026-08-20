# Coding Conventions

**Analysis Date:** 2026-08-20

## Codebase Summary

This is a zero-dependency static-site generator. There are exactly three JavaScript files in the whole project:

- `build.js` — Node script that reads `site/data/professions.json` and generates 160 static HTML pages into `site/p/*.html`.
- `dev-server.js` — minimal Node `http` server for local preview (no framework, no live-reload).
- `site/app.js` — client-side runtime logic (search, bookmarks/history, share) loaded via `<script>` tag on generated pages, no build step, no modules/bundler.

No `package.json`, no `node_modules`, no npm scripts. Everything runs with the Node binary directly (`node build.js`, `node dev-server.js`). There is no linter or formatter configuration (`.eslintrc*`, `.prettierrc*`, `.editorconfig` all absent) — conventions below are inferred purely from observed code, not enforced by tooling.

## Naming Patterns

**Files:**
- Root scripts: `build.js`, `dev-server.js` — lowercase, hyphenated, purpose-named.
- Generated HTML output: `site/p/{slug}.html` where `slug` comes from data (Russian, hyphenated, e.g. `site/p/svarshchik.html` — verify actual slugging in `professions.json`, values are ASCII transliterated slugs).
- Stylesheets split by scope: `site/styles.css` (shared/global), `site/page.css` (profession detail page), `site/app.css` (catalog/home/app shell).

**Functions (JS):**
- `camelCase` throughout, verb-first for actions (`renderPage`, `wearItemsHtml`, `splitFootwear`, `toggleBookmark`, `pushRecent`), noun/adjective for predicates (`hasPhoto`, `isBookmarked`).
- Small single-purpose helpers are preferred over large multi-purpose functions — see `build.js` where text-normalization is split into `joinWrappedLines`, `mergeOrphanConnectors`, `splitFootwear`, `splitClothingSiz` rather than one monolithic parser.

**Variables:**
- `camelCase` for locals (`eduList`, `industryUpper`, `debounceTimer`).
- `SCREAMING_SNAKE_CASE` for module-level constants, especially config/paths and regex tables: `ROOT`, `DATA_PATH`, `OUT_DIR`, `PHOTOS_DIR`, `WEAR_ICONS`, `SIZ_RE`, `NOT_SIZ_RE`, `BOOKMARKS_KEY`, `RECENT_KEY`, `MYCARD_KEY`, `RECENT_MAX`, `PORT`, `TYPES`.
- `dataPromise`, cache-like module state in `site/app.js` uses `camelCase` and is scoped inside the IIFE (never global).

**Types:**
- No TypeScript, no JSDoc type annotations, no type checking. Pure vanilla JS. Data shape is implicitly defined by `site/data/professions.json` fields (e.g. `p.slug`, `p.name`, `p.industry`, `p.salary`, `p.education`, `p.clothing`, `p.footwear`, `p.employers`, `p.similar`) and consumed directly without validation.

## Code Style

**Formatting:**
- No Prettier/formatter config present; style is hand-maintained but consistent:
  - 2-space indentation throughout `build.js`, `dev-server.js`, `site/app.js`.
  - Single quotes for strings; template literals (backticks) used for any string requiring interpolation or multi-line HTML.
  - Semicolons used consistently.
  - `'use strict';` as the first statement in every JS file.

**Linting:**
- No ESLint or other linter configured. No CI. Correctness relies on manual review and running `node build.js` locally.

**Module pattern:**
- `build.js` / `dev-server.js`: plain CommonJS top-level script (`require(...)`, no `module.exports` — these are entry-point scripts, not libraries).
- `site/app.js`: browser global exposed via IIFE pattern — `(function (global) { 'use strict'; ... global.ProfTrekerSite = {...}; })(window);`. This avoids polluting `window` with individual functions; all public API is attached to a single `ProfTrekerSite` namespace object (see bottom of `site/app.js:184-199`).
- ES5-leaning syntax in `site/app.js` (uses `var`, `function` expressions, not arrow functions or `let`/`const`) — likely for maximum browser compatibility without a transpiler. `build.js` (Node-only, not shipped to browser) freely uses modern syntax: `const`, arrow functions, template literals, optional chaining is NOT used but `?.`-style guards are done manually (e.g. `p.image || p.name + '.jpg'`).

## Comments

**When to Comment:**
- Comments are written in Russian, matching the domain and audience (Russian-language site, Russian-speaking maintainer).
- Block comments using em-dash framing (`// — ... —`) are used before non-obvious business-logic functions to explain *why*, not just *what* — e.g. `build.js:16-18` explains the EVRAZ caption placeholder rationale, `build.js:88-92` explains why wrapped lines get rejoined, `build.js:142-148` explains the "Где учиться" (where to study) parsing rule. Follow this pattern for new non-obvious data-transform logic: explain the real-world data quirk that necessitates the code, not just restate the code.
- Inline short comments explain regex intent (`build.js:151-152` explaining a negative lookbehind).
- No JSDoc/TSDoc — comments are plain `//` prose above the function they describe.

**Example (from `build.js`):**
```javascript
// — в паре мест исходный текст физически переносится посреди предложения
//   (напр. «...производственных\nзагрязнений и механических\nвоздействий»,
//   это одно предложение, разорванное переносами строк при вводе, а не три
//   разных пункта). Строка, начинающаяся со строчной буквы, почти наверняка
//   продолжение предыдущей — склеиваем её обратно, а не заводим новый пункт —
function joinWrappedLines(lines) { ... }
```

## Error Handling

**Patterns:**
- `build.js` and `dev-server.js` have almost no error handling — they assume `site/data/professions.json` exists and is well-formed, and let exceptions crash the process (acceptable for a local single-operator build tool with no automated pipeline). `dev-server.js` handles only the one expected runtime error: file-not-found on request (`dev-server.js:26-27`, responds 404 with a plain-text Russian message).
- `site/app.js` (client-side, must degrade gracefully in-browser) uses `try/catch` defensively around `localStorage` access and JSON parsing, always with a safe fallback rather than propagating:
```javascript
function readList(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; }
  catch (e) { return []; }
}
```
  Same pattern in `getMyCard()` (`site/app.js:98`) and in `share()` (`site/app.js:101-110`), where `navigator.share`/`navigator.clipboard` failures resolve to a status string (`'cancelled'`, `'failed'`) instead of throwing.
- No centralized error/logging utility exists anywhere in the codebase.

## Logging

**Framework:** None — raw `console.log` only, used sparingly (3 call sites total, both build scripts, printing a completion/status message in Russian). No `console.error`/`console.warn` usage found. No logging in `site/app.js` (client runtime is silent).

## HTML Generation Pattern (build.js-specific)

- Pages are built via large JS template literals returning a full `<!DOCTYPE html>` document string (`build.js:216-437`, function `renderPage`), not any templating engine (no Handlebars/EJS/etc).
- All user/data-sourced text is passed through `esc()` (`build.js:26-28`) before interpolation into HTML to prevent malformed markup from data containing `&`, `<`, `>`, `"`. **Always wrap data-derived text in `esc(...)` when adding new interpolated fields to a page template.**
- Conditional HTML fragments use ternary expressions inline within the template literal rather than pre-building the fragment in a variable, e.g. `hasPhoto(p.slug) ? '<img ...>' : '<div class="ph">...'` (`build.js:258-260`). Follow this style for new conditional sections.
- Small presentational helper functions (`tagList`, `wearItemsHtml`, `similarLinks`) return HTML strings that get spliced into the outer template — keep new repeated-markup helpers in this same shape (pure function: data in, HTML string out).

## Data Transformation Pattern (build.js-specific)

Free-text fields from the source spreadsheet (via `professions.json`) are parsed into structured lists with a consistent pipeline: split on delimiters (newline/comma/semicolon with case-sensitive lookaheads for capital letters) → trim/clean fragments → merge orphaned connector words (e.g. stray "или") → categorize by regex keyword matching (see `SIZ_RE`/`NOT_SIZ_RE` in `build.js:173-174`). When adding new free-text parsing, reuse `joinWrappedLines` and `mergeOrphanConnectors` rather than writing new ad hoc splitting logic.

## Module Design

**Exports:**
- `build.js`/`dev-server.js`: no exports, single-purpose CLI-run scripts.
- `site/app.js`: single object export attached to `window.ProfTrekerSite`, listing every public function explicitly (no wildcard/spread export) — see `site/app.js:184-199`. New client-side utilities should be added as named functions inside the IIFE and explicitly added to this returned object, not attached to `window` directly.

**Barrel Files:** Not applicable — no directory-of-modules structure exists.

---

*Convention analysis: 2026-08-20*
