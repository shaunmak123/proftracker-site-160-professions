# Codebase Structure

**Analysis Date:** 2026-08-20

## Directory Layout

```
сайт 160 карт/                          # project root (no package.json, no npm deps)
├── build.js                            # static-site generator: JSON -> site/p/*.html
├── dev-server.js                       # local static file server (port 8081)
├── Открыть сайт (Вариант 2 - Личное дело).bat   # Windows launcher: starts dev-server + opens browser
├── .gitignore                          # excludes Thumbs.db, desktop.ini, Office lock files
├── .git/                               # git repo (local only, no remote configured)
├── .planning/                          # GSD planning artifacts (this document lives here)
│   └── codebase/                       # generated codebase-map docs (ARCHITECTURE.md, STRUCTURE.md, ...)
├── docs/                               # currently empty
├── site/                               # DEPLOYABLE OUTPUT — everything under here is the live site
│   ├── index.html                      # entry/search screen (hand-written)
│   ├── catalog.html                    # industry catalog screen (hand-written)
│   ├── my.html                         # bookmarks/history screen (hand-written)
│   ├── styles.css                      # shared base styles/design tokens
│   ├── app.css                         # hub-page (index/catalog/my) styles
│   ├── page.css                        # profession detail page styles
│   ├── app.js                          # shared client runtime (window.ProfTrekerSite)
│   ├── data/
│   │   └── professions.json            # canonical data: 160 professions + 17 industries
│   ├── p/                              # GENERATED — 160 profession detail pages (build.js output)
│   │   └── <slug>.html                 # one file per profession, e.g. маркшейдер.html
│   └── assets/
│       ├── fonts/                      # EVRAZ brand fonts (.otf)
│       ├── img/
│       │   ├── characters/             # illustration PNGs (mascots)
│       │   ├── photos/                 # per-profession card photos, <slug>.png (160 expected)
│       │   ├── logo-*.svg              # partner/brand logos (ЕВРАЗ, Движение Первых, ПРОФТРЕКЕР)
│       │   └── evraz-caption.svg       # optional brand caption (build.js checks existence)
├── 00_входящие/                        # inbox: newest unsorted incoming files (logos, PDFs)
├── 01_professions/
│   └── images/                         # source profession card images (archived .rar)
├── 02_sources/
│   ├── Профориентационный сайт с профессиями.zip   # original client-delivered package
│   └── extracted/
│       └── design_handoff_professions_catalog/
│           ├── README.md               # design handoff spec (screens, data fields, product rules)
│           ├── data/
│           │   ├── professions.json    # ORIGINAL/reference data export (not read by build.js)
│           │   └── professions.xlsx    # ORIGINAL Excel source data
│           └── design/
│               ├── wireframes.dc.html  # low-fidelity design prototype (reference only)
│               ├── industry-styles.css # wireframe theme (CSS variable contract)
│               └── industry-readme.md
├── 03_brandbook/                       # brand assets for the two partner orgs + own brand
│   ├── Dvizhenie_Pervykh/              # "Движение Первых" grant program brand assets
│   ├── EVRAZ/                          # EVRAZ brand assets, fonts, Figma exports
│   └── ProfTracker/                    # ПРОФТРЕКЕР (project owner) brand assets
├── 04_документы_гранта/                # grant paperwork (PDFs) — not code, reference only
└── 05_презентации/                     # project presentation PDFs — not code, reference only
```

## Directory Purposes

**`site/`:**
- Purpose: The entire deployable static site. Everything a visitor's browser loads lives here.
- Contains: 3 hand-written hub pages, 160 generated profession pages, shared CSS/JS, the canonical data JSON, and all static assets (fonts, logos, photos, illustrations).
- Key files: `site/data/professions.json` (data), `site/app.js` (shared client logic), `site/styles.css` (base design tokens).

**`site/p/`:**
- Purpose: Output directory for `build.js`. Fully regenerated on every build run — do not hand-edit files here.
- Contains: 160 `<slug>.html` files, one per profession.
- Key files: None to edit directly; edit `build.js`'s `renderPage()` template or `site/data/professions.json` instead, then re-run `node build.js`.

**`site/data/`:**
- Purpose: Canonical content source read by both the build script and the browser at runtime.
- Contains: `professions.json` only.
- Key files: `site/data/professions.json` — schema: `{ industries: [{name, slug, count}], professions: [{id, industry, name, short, activity, description, product, equipment, clothing, footwear, salary, education, employers, similar[], image, contentStatus, slug}] }`.

**`site/assets/`:**
- Purpose: All static binary/vector assets referenced by HTML/CSS.
- Contains: `fonts/` (EVRAZ Sans family, .otf), `img/photos/` (per-profession card photos named `<slug>.png`), `img/characters/` (mascot illustrations), root-level brand logo SVGs.
- Key files: `site/assets/img/photos/<slug>.png` — presence checked by `build.js` `hasPhoto()`; missing photos render a placeholder, they do not break the build.

**`00_входящие/` (inbox):**
- Purpose: Landing zone for newly received files (logos, drafts, PDFs) before they're sorted into a numbered folder.
- Contains: Loose SVG/PNG/PDF files, most recently EVRAZ caption artwork.
- Key files: None fixed — check here first for anything not yet moved to `site/assets/` or `03_brandbook/`.

**`01_professions/`:**
- Purpose: Source imagery for the physical profession cards (the paper deck the game is built around).
- Contains: `images/` subfolder with an archive (`.rar`) of card images, likely the origin of `site/assets/img/photos/*.png`.

**`02_sources/`:**
- Purpose: Original client-delivered source package and its extracted contents — the "ground truth" handoff.
- Contains: A zip of the original delivery plus `extracted/design_handoff_professions_catalog/`, which holds the design spec (`README.md`), the original Excel/JSON data export, and a low-fidelity HTML wireframe prototype (`design/wireframes.dc.html`).
- Key files: `02_sources/extracted/design_handoff_professions_catalog/README.md` — authoritative product/screen spec; `.../data/professions.xlsx` — original spreadsheet data (not directly consumed by `build.js`; `site/data/professions.json` is the live copy).

**`03_brandbook/`:**
- Purpose: Brand guideline assets for all three parties represented on the site (ЕВРАЗ partner, Движение Первых grant program, ПРОФТРЕКЕР project owner).
- Contains: Logos (SVG/CDR), brandbook PDFs/zips, EVRAZ fonts (duplicated into `site/assets/fonts/` for actual use), Figma exports.
- Key files: `03_brandbook/design-tokens.md` — design token reference; per-brand subfolders hold logos used in `site/assets/img/`.

**`04_документы_гранта/` and `05_презентации/`:**
- Purpose: Non-technical reference material — grant contracts/regulations and project presentation decks.
- Contains: PDFs only. Not read by any script; relevant for project/business context, not implementation.

**`docs/`:**
- Purpose: Reserved for documentation. Currently empty.

**`.planning/`:**
- Purpose: GSD tooling working directory (planning docs, codebase maps). Not part of the deployed site.

## Key File Locations

**Entry Points:**
- `build.js`: Static-site generator, run manually with `node build.js`.
- `dev-server.js`: Local preview server, run with `node dev-server.js` or the `.bat` launcher.
- `site/index.html`: Browser entry point (QR landing page).

**Configuration:**
- None — no `package.json`, no build config, no environment variables. Constants (port, paths) are hardcoded at the top of `build.js` and `dev-server.js`.

**Core Logic:**
- `build.js`: All page-generation logic (data loading, text parsing/normalization, HTML templating).
- `site/app.js`: All shared client-side logic (search, localStorage, sharing, UI widgets), exposed as `window.ProfTrekerSite`.

**Data:**
- `site/data/professions.json`: Live data consumed by both build and runtime.
- `02_sources/extracted/design_handoff_professions_catalog/data/professions.xlsx`: Original spreadsheet source (edit-of-record for content updates should ultimately flow back into `site/data/professions.json`).

**Testing:**
- None present — no test framework, no test files, no CI configuration anywhere in the repo.

## Naming Conventions

**Files:**
- Generated profession pages: `<slug>.html` where slug is the lowercase Russian profession name with spaces replaced by hyphens (e.g., `администратор-баз-данных.html`, `devops-инженер.html`). Slugs are pre-computed and stored in `professions.json` (`slug` field), not derived at build time.
- Photo assets: `<slug>.png` in `site/assets/img/photos/`, matching the profession's slug exactly (checked by `build.js` `hasPhoto()`).
- CSS files split by scope: `styles.css` (shared/base), `app.css` (hub screens), `page.css` (profession detail screen) — new hub-page styling goes in `app.css`, new detail-page styling goes in `page.css`.

**Directories:**
- Top-level source-material folders use a `NN_purpose` numeric prefix in Russian (`00_входящие`, `01_professions`, `02_sources`, `03_brandbook`, `04_документы_гранта`, `05_презентации`), ordering them by workflow stage (inbox → source data → brand → grant docs → presentations). Follow this convention (next unused prefix) when adding a new top-level reference-material category — do not add loose folders at root.
- `site/` and its subdirectories use conventional English lowercase names (`data`, `p`, `assets`, `img`, `fonts`, `photos`, `characters`) regardless of the Russian-language convention used elsewhere.

## Where to Add New Code

**New profession data (content update):**
- Edit `site/data/professions.json` directly (add/modify a profession object; add its `slug` following the existing lowercase-hyphenated pattern), optionally add a matching photo to `site/assets/img/photos/<slug>.png`, then run `node build.js` to regenerate `site/p/<slug>.html`.
- If updating from the original spreadsheet, cross-reference `02_sources/extracted/design_handoff_professions_catalog/data/professions.xlsx` for field definitions.

**New hub-page feature (search/catalog/my-page):**
- Hub pages are hand-written, not generated — edit `site/index.html`, `site/catalog.html`, or `site/my.html` directly, plus their inline `<script>` blocks.
- Shared behavior (new localStorage feature, new search option) goes in `site/app.js` inside the `ProfTrekerSite` object, then export it via the `global.ProfTrekerSite = {...}` block (`site/app.js:184-199`).

**New profession-detail-page feature:**
- Edit `renderPage()` in `build.js` (the template-literal HTML string, `build.js:210-438`), then re-run `node build.js` to regenerate all 160 pages. Do not hand-edit files under `site/p/`.

**New static asset (logo, font, illustration):**
- Place under `site/assets/img/` or `site/assets/fonts/` following existing subfolder conventions (`characters/` for mascots, `photos/` for profession cards, root `img/` for logos).
- If sourced from a brand partner, also archive the original in the matching `03_brandbook/<Partner>/` folder for provenance.

**Utilities:**
- Shared text-parsing helpers (education code splitting, clothing/PPE classification) live as top-level functions in `build.js` (`build.js:93-208`) — add new parsing helpers there, near the existing ones, following the same regex-heuristic + Russian-comment documentation style.
- Shared client-side helpers live in `site/app.js` as private functions inside the IIFE, exposed selectively via the `ProfTrekerSite` export object.

## Special Directories

**`site/p/`:**
- Purpose: Generated output of `build.js`.
- Generated: Yes — fully rewritten on every `node build.js` run.
- Committed: Not verified from this scan; treat as build output. If committed, regenerate rather than hand-edit.

**`02_sources/extracted/`:**
- Purpose: Unpacked contents of the original client delivery zip, kept for reference.
- Generated: No (manually extracted once from the source zip).
- Committed: Reference material; not consumed by any script.

**`.planning/`:**
- Purpose: GSD workflow artifacts (this codebase map and related planning documents).
- Generated: Yes, by GSD tooling commands.
- Committed: Typically yes, as project planning history.

---

*Structure analysis: 2026-08-20*
