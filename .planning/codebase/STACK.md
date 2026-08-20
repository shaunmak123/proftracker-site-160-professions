# Technology Stack

**Analysis Date:** 2026-08-20

## Languages

**Primary:**
- JavaScript (CommonJS, Node.js built-ins only) — `build.js` (static-site generator), `dev-server.js` (local preview server)
- JavaScript (ES5/ES6 browser script, no bundler) — `site/app.js` (client-side search, bookmarks, share)
- HTML (hand-authored templates and generated output) — `site/index.html`, `site/catalog.html`, `site/my.html`, generated pages under `site/p/*.html`
- CSS (hand-authored, CSS custom properties for design tokens) — `site/styles.css`, `site/app.css`, `site/page.css`

**Secondary:**
- JSON as the sole data format — `site/data/professions.json` (160 profession records + 17 industries), consumed both at build time (`build.js`) and at runtime by the browser (`site/app.js` via `fetch`)

## Runtime

**Environment:**
- Node.js v24.19.0 (observed via `node -v` in this environment; no `.nvmrc` or engines field pins a version — any reasonably modern Node works since only `fs`, `path`, and `http` built-ins are used)
- Browser runtime for the generated site itself: plain ES5-compatible JavaScript, no transpilation, no polyfills, no module bundler (scripts loaded via plain `<script src="...">` tags)

**Package Manager:**
- None. There is no `package.json`, no `node_modules`, and no lockfile anywhere in the repo. The project is intentionally zero-dependency ("Без npm-зависимостей: только встроенные модули Node" — comment at the top of `build.js`).

## Frameworks

**Core:**
- None. No frontend framework (no React/Vue/Svelte), no backend framework (no Express/Fastify). The site is generated static HTML with vanilla JS for interactivity, and `dev-server.js` is a ~35-line raw `http.createServer` file server.

**Testing:**
- None detected. No test runner, no test files (`*.test.*`/`*.spec.*` not found), no CI config.

**Build/Dev:**
- `build.js` (repo root) — custom static-site generator. Reads `site/data/professions.json`, renders one HTML page per profession into `site/p/<slug>.html` using template literals. Run with `node build.js`.
- `dev-server.js` (repo root) — minimal static file server for local preview, serves the `site/` directory on `http://localhost:8081`, maps a small set of file extensions to MIME types, sets `Cache-Control: no-store`. Run with `node dev-server.js`.
- `Открыть сайт (Вариант 2 - Личное дело).bat` (repo root) — Windows double-click launcher: starts `dev-server.js` minimized, waits 2s, opens `http://localhost:8081/index.html` in the default browser.

## Key Dependencies

**Critical:**
- None (zero third-party npm packages). All logic uses Node built-ins (`fs`, `path`, `http`) and browser built-ins (`fetch`, `localStorage`, `navigator.share`, `navigator.clipboard`).

**Infrastructure:**
- Google Fonts (loaded via `<link>` in every HTML page's `<head>`, not self-hosted): Montserrat (600/700, headings) and Roboto/Roboto Mono (400/700, body/mono) — see `site/index.html:8-10`, `site/catalog.html:7-9`, `site/my.html:7-9`, and the equivalent block in each generated `site/p/<slug>.html`.
- Note: `site/assets/fonts/EvrazSans-*.otf` (Bold/Medium/Regular/Thin) are present on disk but currently unreferenced — no `@font-face` rule in `site/styles.css`, `site/app.css`, or `site/page.css` uses them. The active design tokens (`--font-heading`, `--font-body`, `--font-mono` in `site/styles.css:46-49`) point to the Google Fonts above, not to EvrazSans. Treat the OTF files as brand assets staged for a future re-theme, not as an active dependency.

## Configuration

**Environment:**
- No environment variables, no `.env` files, no secrets of any kind. All configuration is hardcoded (e.g., dev server port `8081` in `dev-server.js:8`).
- No build configuration files (no `tsconfig.json`, no bundler config, no `.eslintrc`/`.prettierrc`) — confirmed absent by directory listing.

**Build:**
- `build.js` is both the "build script" and its own configuration: paths are hardcoded constants at the top of the file (`DATA_PATH`, `OUT_DIR`, `PHOTOS_DIR`, `EVRAZ_CAPTION_PATH`, all under `site/`). There is no separate config file to edit — changing output locations means editing `build.js` directly.
- Output of `node build.js` is committed into the repo under `site/p/*.html` (160 generated files), i.e. the generated output is checked in, not gitignored and not produced by a CI pipeline.

## Platform Requirements

**Development:**
- Windows (primary dev environment, per `.bat` launcher and path conventions), but the Node scripts themselves are cross-platform (no OS-specific APIs beyond `http`/`fs`/`path`).
- Node.js installed locally (any modern LTS; no version pin exists in the repo).
- No install step required (`npm install` is not applicable — there is nothing to install).

**Production:**
- Static hosting only. The entire deliverable is the `site/` directory (`site/*.html`, `site/*.css`, `site/app.js`, `site/data/professions.json`, `site/assets/**`, `site/p/*.html`) — it can be served by any static file host or CDN (e.g., Nginx, GitHub Pages, Netlify) with zero server-side runtime. `dev-server.js` is explicitly a local-preview convenience only, not intended for production deployment.
- No database, no server-side rendering at request time — all 160 profession pages are pre-rendered at build time by `build.js` and shipped as plain HTML files.

---

*Stack analysis: 2026-08-20*
