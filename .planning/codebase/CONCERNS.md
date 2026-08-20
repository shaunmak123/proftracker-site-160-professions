# Codebase Concerns

**Analysis Date:** 2026-08-20

## Tech Debt

**`build.js` never cleans its output directory before regenerating pages:**
- Issue: `build.js` writes one HTML file per profession (`fs.writeFileSync(path.join(OUT_DIR, `${p.slug}.html`), ...)`) but never deletes files already present in `site/p/` for slugs that no longer exist in `site/data/professions.json`. If a slug is renamed (typo fix, profession removed/merged), the old HTML file is silently orphaned on disk and stays there until someone notices and deletes it by hand.
- Files: `build.js:440-446` (the write loop, no cleanup step)
- Impact: this already happened for real. Git history shows the profession slug was corrected from `автоиспектор` to `автоинспектор` (see `git log -p -- site/data/professions.json`), the stale generated page `site/p/автоиспектор.html` had to be manually removed once in commit `8d09a6e` ("Remove stale generated page for the old (typo) slug"), and at the time of this analysis it is *again* sitting as an uncommitted deletion (`D site/p/автоиспектор.html` in `git status`) — i.e. it silently reappeared after a later full rebuild and had to be cleaned up a second time. The current working tree is clean (verified: every file in `site/p/*.html` maps 1:1 to a slug in `professions.json`, no orphans, no missing pages), but that's because someone manually deleted the stray file again, not because the generator prevents it.
- Fix approach: at the top of the write loop, read the existing contents of `OUT_DIR`, compute the set of expected filenames from `data.professions`, and `fs.unlinkSync` any `*.html` file in `OUT_DIR` that isn't in the expected set (or simply `fs.rmSync(OUT_DIR, { recursive: true, force: true })` before `fs.mkdirSync`).

**No committed script converts the Excel source to `professions.json`:**
- Issue: the design-handoff README (`02_sources/extracted/design_handoff_professions_catalog/README.md:190`) states "`data/professions.xlsx` — та же таблица... JSON пересобирается из неё" (the JSON is rebuilt from the xlsx), implying a conversion pipeline. No such script exists anywhere in the repo (searched for `*.py`, `*convert*`, `*xlsx2json*` — nothing found; `build.js` only reads `professions.json`, it never touches the `.xlsx`).
- Files: `02_sources/extracted/design_handoff_professions_catalog/data/professions.xlsx` (currently shows as modified in `git status`), `site/data/professions.json`
- Impact: there is no reproducible, in-repo way to regenerate `professions.json` from the spreadsheet. Whoever edited the `.xlsx` (it shows as modified) must be hand-editing the 3770-line `professions.json` separately, or using an external/undocumented tool. This makes it easy for the two to drift silently — someone edits the spreadsheet expecting it to "just" propagate, and it doesn't.
- Fix approach: either write and commit a small xlsx→JSON converter (e.g. using a lightweight `xlsx` parser) and document the regeneration step in the project README, or explicitly document that `professions.json` is the single source of truth going forward and the `.xlsx` is legacy/reference-only.

**Two divergent copies of the profession dataset:**
- Issue: `02_sources/extracted/design_handoff_professions_catalog/data/professions.json` (the original design-handoff data) and `site/data/professions.json` (the live site data, 3770 lines) are different files with no documented relationship. `build.js` only ever reads `site/data/professions.json`.
- Files: `02_sources/extracted/design_handoff_professions_catalog/data/professions.json`, `site/data/professions.json`
- Impact: a future editor could mistake the handoff copy for the live source of truth and edit the wrong file, or not realize substantial content work (expanded descriptions, corrected slugs, added photos) happened only in `site/data/professions.json` after the handoff.
- Fix approach: add a short note (README or comment) marking `02_sources/extracted/.../data/professions.json` as historical/reference only, or delete it once it's no longer needed for comparison.

**Text-parsing heuristics in `build.js` are undocumented outside inline comments and untested:**
- Issue: `joinWrappedLines`, `mergeOrphanConnectors`, `splitFootwear`, `splitClothingSiz`, and `eduRows` (`build.js:93-194`) form a hand-tuned parser that reverse-engineers structure (item boundaries, education codes, clothing vs. SIZ classification) out of free-text Excel cells using regexes keyed to specific punctuation/wording patterns observed in the current dataset. The code comments explain *why* each rule exists (real edge cases the author hit), which is good, but there is no automated test locking this behavior in place.
- Files: `build.js:93-194`, keyword lists at `build.js:173-174` (`SIZ_RE`, `NOT_SIZ_RE`)
- Impact: any future edit to a profession's `clothing`/`footwear`/`education` text (e.g. new delimiter style, a clothing item whose name happens to contain a SIZ keyword) can silently mis-split or mis-classify content into the wrong section on the rendered page, with nothing to catch the regression before it ships to all 160 pages.
- Fix approach: add a small fixture-based test file with a handful of known real `clothing`/`footwear`/`education` strings and their expected parsed output, run as part of `node build.js` or a separate `node test.js`.

## Known Bugs

No reproducible bugs found in the current generated output. Verified programmatically against `site/data/professions.json` (160 records) and the generated `site/p/*.html`:
- No duplicate slugs or duplicate profession names.
- No broken `similar` cross-links (every name referenced in a profession's `similar` array exists as a real profession).
- No orphan HTML pages in `site/p/` (every file maps to a current slug) and no missing pages (every slug has a file).
- No orphan photos in `site/assets/img/photos/` and no missing photos (160 slugs, 160 `.png` files, 1:1 match).
- No required text field (`name`, `slug`, `industry`, `salary`, `activity`, `description`, `product`, `equipment`, `clothing`, `footwear`, `education`, `employers`) is empty across all 160 records.

The one real data-integrity incident found (the `автоиспектор`/`автоинспектор` slug typo and its orphaned page) is already resolved on disk as of this analysis — see "Tech Debt" above for the root cause that makes it likely to recur.

## Security Considerations

**Client-side rendering injects profession/industry names via unescaped `innerHTML`:**
- Risk: `site/app.js`, `site/catalog.html`, and `site/my.html` build DOM fragments by string-concatenating `p.name` / `p.industry` / `ind.name` directly into `.innerHTML`, with no HTML-escaping. If `professions.json` ever contains a name/industry value with `<`, `>`, or `&` (e.g. from a future Excel edit, encoding mishap, or copy-paste of formatted text), it will either break the rendered layout or, in the worst case, inject arbitrary markup into the page.
- Files: `site/app.js:129` (search-suggestion rows built inside `initSearch`), `site/catalog.html:74-90` (industry accordion items), `site/my.html:66-79,89-91` (bookmark/recent/"my card" rows)
- Current mitigation: none client-side. Note the contrast with the server-side generator, which *does* escape consistently — `build.js` defines and uses `esc()` (`build.js:26-28`) for every dynamic value written into the static `site/p/*.html` pages. The client-side runtime code (`app.js` and friends) has no equivalent helper.
- Data currently contains no `<`/`>`/`&` characters in any `name`/`industry`/`similar` field (verified programmatically), so there is no active exploit today — this is a latent fragility, not an active vulnerability, since the data source is an internal spreadsheet rather than user input.
- Recommendations: add an `escapeHtml()` helper to `ProfTrekerSite` in `site/app.js` and use it (or switch to `textContent`/`document.createElement` + `.textContent`) everywhere a profession/industry name is interpolated into `innerHTML`.

**`esc()` in `build.js` does not escape single quotes:**
- Risk: `build.js:26-28` escapes `&`, `<`, `>`, `"` but not `'`. Every generated attribute in `build.js`'s templates currently uses double quotes, so this is not exploitable today, but it's a latent gap if a future edit introduces a single-quoted attribute.
- Files: `build.js:26-28`
- Recommendation: add `'` → `&#39;` to the replacement map for defense in depth.

## Performance Bottlenecks

**Profession photos are far larger than their display size, on a site built for mobile/QR-code entry:**
- Problem: all 160 profession photos in `site/assets/img/photos/*.png` total **166MB**, median **1.1MB** per file (range 506KB–1.4MB). They are rendered at `width:100%` inside a container that's `height:180px` on mobile / `height:300px` on desktop (`site/page.css:82-83,90,172`), i.e. downloaded/decoded at a resolution far higher than what's ever displayed.
- Files: `site/assets/img/photos/*.png`, referenced in `build.js:256-260`; sizing rules in `site/page.css:74-90`
- Cause: images appear to be uncompressed/lossless PNG exports of photographic card art, not resized or re-encoded for web delivery. PNG is also the wrong format for photographic content (no lossy compression); JPEG/WebP would be dramatically smaller for the same visual content.
- Impact: the design handoff doc is explicit that this is a mobile-first, QR-code-entry product ("мобильный приоритет (дети заходят с телефона по QR)", `02_sources/extracted/design_handoff_professions_catalog/README.md:30`) — a 1MB+ image download per profession page view over a phone's cellular connection is a real, user-visible cost for the target audience.
- Improvement path: batch re-export/resize the source photos to roughly 2x their max display size (~800px wide is generous for a 300px-tall desktop frame) and re-encode as JPEG or WebP at quality ~75-80. This would very likely cut the photos folder from 166MB to under 15MB with no visible quality loss at display size.

**No explicit `width`/`height` on profession `<img>` tags:**
- Problem: the profession photo `<img>` (`build.js:259`) has no `width`/`height` attributes, only CSS (`width:100%; height:auto`). Combined with `loading="lazy"`, the browser has no reserved aspect ratio until the image begins downloading, which can cause a layout shift on slow connections (exactly the connections this site is likely to see per the mobile/QR use case above).
- Files: `build.js:259`
- Improvement path: add `width`/`height` (or `style="aspect-ratio: ..."`) matching the known photo dimensions once photos are standardized to a fixed size during the re-encode above.

## Fragile Areas

**`localStorage` writes in `site/app.js` are not error-handled:**
- Files: `site/app.js:78` (`writeList`, used by `toggleBookmark` and `pushRecent`), `site/app.js:99` (`setMyCard`)
- Why fragile: the *read* helpers (`readList:75`, `getMyCard:98`) are wrapped in `try/catch` and fail safe, but the corresponding *write* helpers are not. If `localStorage.setItem` throws (private-browsing quota limits, storage disabled by device policy, Safari's occasional flakiness with third-party/embedded contexts), the exception propagates out of a button click handler — bookmarking a profession, recording view history, or setting "my card" would fail silently from the user's perspective (nothing visibly breaks, but the state just never saves) rather than degrading gracefully.
- Safe modification: wrap `writeList` and `setMyCard` bodies in `try/catch`, matching the pattern already used for the read side.
- Test coverage: none (see below) — this class of failure wouldn't be caught by any existing check.

**Keyword-based clothing/SIZ classification is easy to silently break:**
- Files: `build.js:173-174` (`SIZ_RE`, `NOT_SIZ_RE`), used by `splitClothingSiz` (`build.js:176-194`)
- Why fragile: whether a free-text clothing item ends up under "Спецодежда" or "СИЗ" on a profession page depends entirely on whether it matches one of two long hand-tuned Russian keyword regexes, with the `NOT_SIZ_RE` list acting as an override for words that overlap. Adding a new clothing/footwear item to the source data with unexpected wording could land it in the wrong section with no error or warning — it just renders in the wrong place.
- Safe modification: when editing `clothing`/`footwear`/`education` text for any profession, re-run `node build.js` and spot-check that profession's generated page rather than assuming the text change is inert.

## Scaling Limits

**Repository size:**
- Current capacity: total working tree is **~2.1GB**; the `.git` directory alone is **~952MB**. The largest contributors are `01_professions/` (806MB, source card exports), `site/` (175MB, mostly the 166MB `photos/` folder), and `03_brandbook/` (134MB).
- Limit: this repo has no GitHub remote yet (per project memory, that's deferred). GitHub's practical limits are a 100MB hard cap per file and a strong recommendation to keep repos under ~1GB — this repo is already roughly double that, and every future re-commit of an already-large binary asset (photos, brandbook files) grows `.git` further since Git stores a full copy per version of a binary blob.
- Scaling path: before any GitHub push, either (a) move large binary source directories (`01_professions/`, `03_brandbook/`, and the photos once optimized) out of Git version control entirely (external storage / one-time asset drop), or (b) adopt Git LFS for tracked binary assets going forward. This directly relates to the user's own noted concern about a 319MB `.rar` file needing attention before any push.

## Missing Critical Features

None identified — the site's documented feature set (search with fuzzy matching, industry catalog/accordion, bookmarks, view history, "my card") is fully implemented in `site/app.js`, `site/index.html`, `site/catalog.html`, `site/my.html`, and per-profession pages generated by `build.js`. The one deliberately-deferred piece (the EVRAZ brand caption image under the partner logo) is handled with a documented, working placeholder fallback (`build.js:16-20`, `EVRAZ_CAPTION_PATH`/`HAS_EVRAZ_CAPTION`) rather than being a gap — it will pick up automatically once the asset file is dropped in place.

## Test Coverage Gaps

**No automated tests exist anywhere in the repository:**
- What's not tested: everything — there is no test framework, no `*.test.js`/`*.spec.js` files, and no CI configuration (`.github/` or otherwise) in the repo.
- Files: none exist; would apply to `build.js` (447 lines, including the free-text parsing heuristics discussed above) and `site/app.js` (200 lines, including a hand-rolled Levenshtein-distance fuzzy search used for every profession lookup)
- Risk: the entire generator and client-side search/bookmark logic is validated only by manual visual QA across 160 generated pages. Regressions in text parsing, search ranking, or storage handling would only surface from a human noticing a wrong-looking page or a broken button.
- Priority: Medium — the site is static and low-traffic-risk, but given the grant-deliverable deadline (per project memory: 31.08.2026) and the fact the generator already produced one real duplicate-page defect (see Tech Debt), a minimal smoke test would be cheap and valuable: (1) assert `build.js` output file count equals `data.professions.length` with zero orphan files in `site/p/`, and (2) a handful of fixture-based assertions for `splitClothingSiz`/`splitFootwear`/`eduRows` against real profession strings already in `professions.json`.

---

*Concerns audit: 2026-08-20*
