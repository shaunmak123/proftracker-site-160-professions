# Testing Patterns

**Analysis Date:** 2026-08-20

## No Test Setup Exists

This codebase has **no formal test suite of any kind**. There is:

- No `package.json` (and therefore no `test` script, no test-framework devDependency).
- No `node_modules`.
- No test runner config (`jest.config.*`, `vitest.config.*`, `playwright.config.*`, `.mocharc*`, etc.) anywhere in the repo.
- No files matching `*.test.*`, `*.spec.*`, or a `__tests__`/`test`/`tests` directory.
- No CI configuration (`.github/workflows`, etc.) that would run tests or checks on push.

This is consistent with the project's nature: a small, single-operator static-site generator (`build.js`) that produces 160 profession pages from `site/data/professions.json`, run manually and locally via `node build.js` / `node dev-server.js`. There is no npm ecosystem installed at all — the two Node scripts use only built-in modules (`fs`, `path`, `http`).

## Verification Method (in place of automated tests)

The only verification currently practiced is manual/observational:

- Run `node build.js` and confirm the console output `Собрано страниц профессий: 160` (`build.js:447`) matches the expected profession count in `site/data/professions.json`.
- Run `node dev-server.js` (or double-click `Открыть сайт (Вариант 2 - Личное дело).bat`) and visually inspect generated pages in a browser at `http://localhost:8081/index.html`.
- No assertions, snapshots, or automated diffing of generated HTML output exist.

## Recommendations If Tests Are Introduced

If a future phase adds testing, the natural fit given the zero-dependency philosophy of this codebase would be:

**Unit tests for `build.js` pure functions** — the text-parsing helpers are pure functions with no I/O and are the highest-risk logic in the project (regex-based parsing of free-text spreadsheet data into structured HTML):
- `esc(s)` — HTML-escaping correctness
- `tagList(text, cls)` — delimiter splitting into tag spans
- `eduRows(text)` — specialty-code/name extraction (regex-heavy, `build.js:149-165`)
- `splitClothingSiz(text)` / `splitFootwear(text)` — the SIZ/clothing/footwear categorization regexes (`build.js:173-194`, `128-140`)
- `joinWrappedLines(lines)` / `mergeOrphanConnectors(fragments)` — line-rejoining logic (`build.js:93-126`)

These are prime candidates for table-driven unit tests (input string → expected structured output) since they already encode specific real-world data quirks in comments — each documented quirk is effectively an implicit test case waiting to be written.

**Client-side logic in `site/app.js`** — `normalize`, `levenshtein`, `searchProfessions` are pure and testable without a DOM; `readList`/`writeList`/bookmark functions need a `localStorage` mock (e.g. `jsdom` or a manual stub) if tested.

**Build smoke test** — a minimal integration check that runs `build.js` against a small fixture `professions.json` and asserts the expected number of files/exact filenames are written to a temp output directory would catch regressions in the file-generation loop (`build.js:440-447`) without needing to snapshot full HTML.

Given the no-dependency constraint observed elsewhere in the codebase (see CONVENTIONS.md), if introducing a runner, Node's built-in `node:test` + `node:assert` (available in modern Node without any npm install) would be the most consistent choice with the project's existing zero-dependency approach, rather than pulling in Jest/Vitest.

## Coverage

**Requirements:** None — no coverage tooling present, no target defined.

---

*Testing analysis: 2026-08-20*
